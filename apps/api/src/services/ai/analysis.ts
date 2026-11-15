import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  SKILLS,
  citationExists,
  countWords,
  levelForScore,
  type SkillId,
} from "@plume/shared";
import type { Database } from "../../db/client";
import {
  aiAnalyses,
  analysisFindings,
  chapters,
  chapterVersions,
  coachingMessages,
  coachingSessions,
  skillAssessments,
  stories,
} from "../../db/schema";
import { requireOwnedStory } from "../stories";
import { assertAiQuota, recordAiUsage } from "../plans";
import { getAIProvider } from "./index";
import { contentHash } from "../stories";

export async function analyzeChapter(
  db: Database,
  userId: string,
  input: {
    storyId: string;
    chapterId?: string;
    skill: SkillId;
    scope: "chapter" | "selection";
    selection?: string;
  },
) {
  if (!input.chapterId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Choisissez un chapitre à analyser.",
    });
  }
  const [row] = await db
    .select({ story: stories, chapter: chapters })
    .from(chapters)
    .innerJoin(stories, eq(stories.id, chapters.storyId))
    .where(
      and(
        eq(chapters.id, input.chapterId),
        eq(stories.id, input.storyId),
        isNull(chapters.deletedAt),
      ),
    )
    .limit(1);
  if (!row || row.story.authorId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Chapitre introuvable." });
  }
  const manuscript =
    input.scope === "selection" ? (input.selection ?? "").trim() : row.chapter.content;
  if (input.scope === "selection" && !row.chapter.content.includes(manuscript)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "L'extrait sélectionné ne correspond pas au chapitre enregistré.",
    });
  }
  if (countWords(manuscript) < 30) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Le passage est trop court pour une analyse utile (30 mots minimum).",
    });
  }

  const [existingVersion] = await db
    .select()
    .from(chapterVersions)
    .where(
      and(
        eq(chapterVersions.chapterId, row.chapter.id),
        eq(chapterVersions.versionNumber, row.chapter.version),
      ),
    )
    .limit(1);
  let versionId = existingVersion?.id;
  if (!versionId) {
    const [created] = await db
      .insert(chapterVersions)
      .values({
        chapterId: row.chapter.id,
        storyId: row.story.id,
        versionNumber: row.chapter.version,
        title: row.chapter.title,
        content: row.chapter.content,
        wordCount: row.chapter.wordCount,
        contentHash: contentHash(row.chapter.content),
        reason: "ai_snapshot",
        createdBy: userId,
      })
      .returning();
    versionId = created?.id;
  }

  await assertAiQuota(db, userId, "chapter_diagnostic");
  const provider = getAIProvider();
  const [analysis] = await db
    .insert(aiAnalyses)
    .values({
      userId,
      storyId: row.story.id,
      chapterId: row.chapter.id,
      chapterVersionId: versionId ?? null,
      skill: input.skill,
      scope: input.scope,
      status: "running",
      provider: provider.name,
      model: provider.model,
    })
    .returning();
  if (!analysis) throw new Error("Création de l'analyse impossible.");

  try {
    const draft = await provider.analyzeChapter({
      skill: input.skill,
      manuscript,
      chapterTitle: row.chapter.title,
      storyTitle: row.story.title,
      scope: input.scope,
    });

    // Anti-hallucination : une citation non présente dans le manuscrit est retirée.
    const findings = draft.findings.map((finding) => {
      const quote =
        finding.quote && citationExists(finding.quote, row.chapter.content)
          ? finding.quote
          : null;
      return { ...finding, quote };
    });
    const verifiedCount = findings.filter((f) => f.quote).length;
    const confidence = draft.isSimulation
      ? Math.min(draft.confidence, 0.4)
      : Math.max(0.1, Math.min(0.95, draft.confidence));

    await db.insert(analysisFindings).values(
      findings.map((finding, index) => ({
        analysisId: analysis.id,
        kind: finding.kind,
        title: finding.title,
        observation: finding.observation,
        quote: finding.quote,
        explanation: finding.explanation,
        impact: finding.impact,
        priority: finding.priority,
        confidence: finding.confidence,
        recommendation: finding.recommendation,
        exercise: finding.exercise,
        orderIndex: index,
      })),
    );

    await db
      .update(aiAnalyses)
      .set({
        status: "completed",
        summary: draft.summary,
        score: Math.round(draft.score),
        confidence,
        inputTokens: draft.inputTokens,
        outputTokens: draft.outputTokens,
        completedAt: new Date(),
      })
      .where(eq(aiAnalyses.id, analysis.id));

    await db.insert(skillAssessments).values({
      userId,
      storyId: row.story.id,
      analysisId: analysis.id,
      skill: input.skill,
      score: Math.round(draft.score),
      confidence,
      methodVersion: "plume-rubric-v1",
    });

    await recordAiUsage(db, {
      userId,
      storyId: row.story.id,
      analysisId: analysis.id,
      taskKind: "chapter_diagnostic",
      provider: draft.provider,
      model: draft.model,
      inputTokens: draft.inputTokens,
      outputTokens: draft.outputTokens,
    });

    if (verifiedCount === 0 && !draft.isSimulation) {
      await db
        .update(aiAnalyses)
        .set({
          error:
            "Aucune citation vérifiée : le diagnostic est conservé mais ne doit pas être présenté comme fiable.",
        })
        .where(eq(aiAnalyses.id, analysis.id));
    }

    return getAnalysis(db, analysis.id, userId);
  } catch (error) {
    await db
      .update(aiAnalyses)
      .set({
        status: "failed",
        error: "L'analyse n'a pas pu aboutir. Aucun texte n'a été modifié.",
        completedAt: new Date(),
      })
      .where(eq(aiAnalyses.id, analysis.id));
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Le coach n'a pas pu terminer l'analyse. Votre manuscrit est intact ; vous pouvez réessayer.",
    });
  }
}

export async function getAnalysis(db: Database, analysisId: string, userId: string) {
  const [analysis] = await db
    .select({
      analysis: aiAnalyses,
      storyTitle: stories.title,
      chapterTitle: chapters.title,
    })
    .from(aiAnalyses)
    .innerJoin(stories, eq(stories.id, aiAnalyses.storyId))
    .leftJoin(chapters, eq(chapters.id, aiAnalyses.chapterId))
    .where(and(eq(aiAnalyses.id, analysisId), eq(aiAnalyses.userId, userId)))
    .limit(1);
  if (!analysis) throw new TRPCError({ code: "NOT_FOUND", message: "Analyse introuvable." });
  const findings = await db
    .select()
    .from(analysisFindings)
    .where(eq(analysisFindings.analysisId, analysisId))
    .orderBy(asc(analysisFindings.orderIndex));
  return { ...analysis.analysis, storyTitle: analysis.storyTitle, chapterTitle: analysis.chapterTitle, findings };
}

export async function listAnalyses(
  db: Database,
  userId: string,
  input: { storyId?: string; limit: number },
) {
  const conditions = [eq(aiAnalyses.userId, userId)];
  if (input.storyId) conditions.push(eq(aiAnalyses.storyId, input.storyId));
  const rows = await db
    .select({
      analysis: aiAnalyses,
      storyTitle: stories.title,
      chapterTitle: chapters.title,
    })
    .from(aiAnalyses)
    .innerJoin(stories, eq(stories.id, aiAnalyses.storyId))
    .leftJoin(chapters, eq(chapters.id, aiAnalyses.chapterId))
    .where(and(...conditions))
    .orderBy(desc(aiAnalyses.createdAt))
    .limit(input.limit);
  return rows.map((row) => ({
    ...row.analysis,
    storyTitle: row.storyTitle,
    chapterTitle: row.chapterTitle,
  }));
}

export async function progressDashboard(db: Database, userId: string) {
  const assessments = await db
    .select()
    .from(skillAssessments)
    .where(eq(skillAssessments.userId, userId))
    .orderBy(desc(skillAssessments.createdAt))
    .limit(120);
  const analyses = await db
    .select({
      id: aiAnalyses.id,
      skill: aiAnalyses.skill,
      score: aiAnalyses.score,
      status: aiAnalyses.status,
      createdAt: aiAnalyses.createdAt,
      storyTitle: stories.title,
    })
    .from(aiAnalyses)
    .innerJoin(stories, eq(stories.id, aiAnalyses.storyId))
    .where(eq(aiAnalyses.userId, userId))
    .orderBy(desc(aiAnalyses.createdAt))
    .limit(20);

  return {
    skills: SKILLS.map((skill) => {
      const forSkill = assessments.filter((a) => a.skill === skill.id);
      const latest = forSkill[0];
      const previous = forSkill[1];
      return {
        ...skill,
        score: latest?.score ?? null,
        previousScore: previous?.score ?? null,
        level: latest ? levelForScore(latest.score) : null,
        confidence: latest?.confidence ?? null,
        assessmentCount: forSkill.length,
        lastAssessedAt: latest?.createdAt.toISOString() ?? null,
      };
    }),
    recentAnalyses: analyses,
    totalAssessments: assessments.length,
    methodVersion: "plume-rubric-v1",
  };
}

export async function startCoachingSession(db: Database, userId: string, storyId: string) {
  const story = await requireOwnedStory(db, storyId, userId);
  const [session] = await db
    .insert(coachingSessions)
    .values({ userId, storyId, title: `Conversation — ${story.title}` })
    .returning();
  return session;
}

export async function listCoachingSessions(db: Database, userId: string, storyId: string) {
  await requireOwnedStory(db, storyId, userId);
  return db
    .select()
    .from(coachingSessions)
    .where(and(eq(coachingSessions.userId, userId), eq(coachingSessions.storyId, storyId)))
    .orderBy(desc(coachingSessions.updatedAt));
}

export async function getCoachingSession(db: Database, sessionId: string, userId: string) {
  const [session] = await db
    .select()
    .from(coachingSessions)
    .where(and(eq(coachingSessions.id, sessionId), eq(coachingSessions.userId, userId)))
    .limit(1);
  if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation introuvable." });
  const messages = await db
    .select()
    .from(coachingMessages)
    .where(eq(coachingMessages.sessionId, sessionId))
    .orderBy(asc(coachingMessages.createdAt));
  return { session, messages };
}

const REWRITE_REQUEST = /(ré[ée]cris|ré[ée]crire|génère|invente|écris (moi|le|la|un|une)|remplace)/i;

export async function sendCoachingMessage(
  db: Database,
  userId: string,
  input: { sessionId: string; content: string },
) {
  const { session } = await getCoachingSession(db, input.sessionId, userId);
  await assertAiQuota(db, userId, "coach_chat");
  const [userMessage] = await db
    .insert(coachingMessages)
    .values({ sessionId: session.id, role: "user", content: input.content })
    .returning();

  const [latest] = await db
    .select()
    .from(aiAnalyses)
    .where(
      and(
        eq(aiAnalyses.userId, userId),
        eq(aiAnalyses.storyId, session.storyId),
        eq(aiAnalyses.status, "completed"),
      ),
    )
    .orderBy(desc(aiAnalyses.createdAt))
    .limit(1);

  let reply: string;
  const citations: Array<{ chapterId: string; quote: string }> = [];
  if (REWRITE_REQUEST.test(input.content)) {
    reply =
      "Je ne réécris pas vos passages : ce serait vous priver du travail qui fait progresser. En revanche, je peux vous aider à voir ce qui produit l'effet recherché, puis vous proposer une contrainte d'écriture pour le retravailler vous-même. Quel effet voulez-vous que le lecteur ressente à cet endroit ?";
  } else if (!latest) {
    reply =
      "Je n'ai pas encore de diagnostic sur cette histoire. Lancez d'abord une analyse de chapitre depuis l'onglet Coach : nous aurons alors des constats précis et des citations réelles à examiner ensemble. En attendant, dites-moi ce qui vous bloque le plus dans la scène en cours.";
  } else {
    const findings = await db
      .select()
      .from(analysisFindings)
      .where(eq(analysisFindings.analysisId, latest.id))
      .orderBy(asc(analysisFindings.orderIndex))
      .limit(4);
    const quoted = findings.find((f) => f.quote);
    if (quoted?.quote && latest.chapterId) {
      citations.push({ chapterId: latest.chapterId, quote: quoted.quote });
    }
    const improvement = findings.find((f) => f.kind === "improvement");
    reply = [
      `D'après votre dernier diagnostic (compétence « ${latest.skill} », confiance ${
        latest.confidence ? Math.round(latest.confidence * 100) : 35
      } %), le point le plus utile à travailler me semble être : ${
        improvement?.observation ?? "la mise en relation entre l'information et la décision du personnage."
      }`,
      quoted?.quote
        ? `Le passage qui appuie cette observation est : « ${quoted.quote} ».`
        : "Je ne retrouve pas de citation vérifiable dans ce diagnostic : je préfère ne pas en inventer.",
      improvement?.recommendation
        ? `Méthode proposée : ${improvement.recommendation}`
        : "Méthode proposée : relisez la scène en notant, pour chaque paragraphe, ce qui change pour le personnage. Si rien ne change, demandez-vous quelle décision pourrait rendre le paragraphe nécessaire.",
      "Je ne toucherai pas à votre texte. Essayez une modification, puis demandez une comparaison : nous regarderons ensemble ce que votre choix produit sur le lecteur.",
    ].join("\n\n");
  }

  const [assistantMessage] = await db
    .insert(coachingMessages)
    .values({ sessionId: session.id, role: "assistant", content: reply, citations })
    .returning();
  await db
    .update(coachingSessions)
    .set({ updatedAt: new Date() })
    .where(eq(coachingSessions.id, session.id));
  await recordAiUsage(db, {
    userId,
    storyId: session.storyId,
    taskKind: "coach_chat",
    provider: "mock",
    model: "plume-coach-chat-v1",
    inputTokens: Math.ceil(input.content.length / 4) + 400,
    outputTokens: Math.ceil(reply.length / 4),
  });
  return { userMessage, assistantMessage, citations };
}

export async function analysesForChapter(
  db: Database,
  userId: string,
  chapterId: string,
) {
  return db
    .select()
    .from(aiAnalyses)
    .where(and(eq(aiAnalyses.userId, userId), eq(aiAnalyses.chapterId, chapterId)))
    .orderBy(desc(aiAnalyses.createdAt));
}

export async function findAnalysesByIds(db: Database, userId: string, ids: string[]) {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(aiAnalyses)
    .where(and(eq(aiAnalyses.userId, userId), inArray(aiAnalyses.id, ids)));
}
