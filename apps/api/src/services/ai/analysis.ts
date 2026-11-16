import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  SKILLS,
  WORKSHOPS,
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
  exerciseAttempts,
  skillAssessments,
  stories,
} from "../../db/schema";
import { requireOwnedStory } from "../stories";
import { assertAiQuota, recordAiUsage } from "../plans";
import { getAIProvider } from "./index";
import { ProviderUnavailableError } from "./provider";
import { contentHash } from "../stories";

/**
 * Journalise la cause d'un échec du coach sans contenu sensible : pour les
 * erreurs de base, seul le code SQL est gardé (la requête peut contenir le manuscrit).
 */
function logAiFailure(action: string, error: unknown): void {
  if (error instanceof ProviderUnavailableError) {
    console.error(`[plume] ${action} : ${error.message}`);
    return;
  }
  const name = error instanceof Error ? error.name : typeof error;
  const code = (error as { cause?: { code?: string }; code?: string })?.cause?.code ??
    (error as { code?: string })?.code;
  console.error(`[plume] ${action} : ${name}${code ? ` (${code})` : ""}`);
}

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
    logAiFailure("analyse de chapitre", error);
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

/**
 * Analyse globale : une seule action, un seul décompte de crédits, sept
 * lectures persistées. Les appels au fournisseur ont lieu avant toute
 * écriture : un échec ne laisse ni analyse partielle ni crédit débité.
 */
export async function analyzeStory(
  db: Database,
  userId: string,
  input: { storyId: string; chapterId: string },
) {
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
  if (countWords(row.chapter.content) < 30) {
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

  await assertAiQuota(db, userId, "multi_chapter_analysis");
  const provider = getAIProvider();
  let draft;
  try {
    draft = await provider.analyzeStory({
      storyTitle: row.story.title,
      chapterTitle: row.chapter.title,
      manuscript: row.chapter.content,
    });
  } catch (error) {
    logAiFailure("analyse globale", error);
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Le coach n'a pas pu terminer l'analyse globale. Aucun crédit n'a été débité ; vous pouvez réessayer.",
    });
  }

  const expected = new Set(SKILLS.map((skill) => skill.id));
  const seen = new Set<SkillId>();
  for (const analysis of draft.analyses) {
    if (!expected.has(analysis.skill) || seen.has(analysis.skill)) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Le coach n'a pas pu produire les sept lectures attendues. Aucun crédit n'a été débité.",
      });
    }
    seen.add(analysis.skill);
  }
  if (seen.size !== SKILLS.length) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Le coach n'a pas pu produire les sept lectures attendues. Aucun crédit n'a été débité.",
    });
  }

  const results = await db.transaction(async (tx) => {
    const created: Array<{ id: string; skill: SkillId; score: number; summary: string }> = [];
    for (const item of draft.analyses) {
      const findings = verifyFindings(item.findings, row.chapter.content);
      const confidence = draft.isSimulation
        ? Math.min(item.confidence, 0.4)
        : Math.max(0.1, Math.min(0.95, item.confidence));
      const [analysis] = await tx
        .insert(aiAnalyses)
        .values({
          userId,
          storyId: row.story.id,
          chapterId: row.chapter.id,
          chapterVersionId: versionId ?? null,
          skill: item.skill,
          scope: "chapter",
          status: "completed",
          provider: draft.provider,
          model: draft.model,
          summary: item.summary,
          score: Math.round(item.score),
          confidence,
          inputTokens: Math.round(draft.inputTokens / SKILLS.length),
          outputTokens: Math.round(draft.outputTokens / SKILLS.length),
          completedAt: new Date(),
        })
        .returning();
      if (!analysis) throw new Error("Création de l'analyse globale impossible.");
      await tx.insert(analysisFindings).values(
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
      await tx.insert(skillAssessments).values({
        userId,
        storyId: row.story.id,
        analysisId: analysis.id,
        skill: item.skill,
        score: Math.round(item.score),
        confidence,
        methodVersion: "plume-rubric-v1",
      });
      created.push({
        id: analysis.id,
        skill: item.skill,
        score: analysis.score ?? Math.round(item.score),
        summary: item.summary,
      });
    }
    return created;
  });

  await recordAiUsage(db, {
    userId,
    storyId: row.story.id,
    taskKind: "multi_chapter_analysis",
    provider: draft.provider,
    model: draft.model,
    inputTokens: draft.inputTokens,
    outputTokens: draft.outputTokens,
  });

  return {
    chapterId: row.chapter.id,
    chapterTitle: row.chapter.title,
    isSimulation: draft.isSimulation,
    analyses: results,
  };
}

function verifyFindings(
  findings: Array<{
    quote: string | null;
    kind: string;
    title: string;
    observation: string;
    explanation: string;
    impact: string | null;
    priority: string;
    confidence: number;
    recommendation: string | null;
    exercise: string | null;
  }>,
  manuscript: string,
) {
  return findings.map((finding) => ({
    ...finding,
    quote:
      finding.quote && citationExists(finding.quote, manuscript) ? finding.quote : null,
  }));
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
  const { session, messages } = await getCoachingSession(db, input.sessionId, userId);
  const content = input.content.trim();

  // Une demande de réécriture est refusée sans appeler le fournisseur et sans
  // consommer de crédit : aucune analyse n'a été produite.
  if (REWRITE_REQUEST.test(content)) {
    const [userMessage] = await db
      .insert(coachingMessages)
      .values({ sessionId: session.id, role: "user", content })
      .returning();
    const [assistantMessage] = await db
      .insert(coachingMessages)
      .values({
        sessionId: session.id,
        role: "assistant",
        content:
          "Je ne réécris pas vos passages : ce serait vous priver du travail qui fait progresser. En revanche, je peux vous aider à voir ce qui produit l'effet recherché, puis vous proposer une contrainte d'écriture pour le retravailler vous-même. Quel effet voulez-vous que le lecteur ressente à cet endroit ?",
        citations: [],
      })
      .returning();
    await db
      .update(coachingSessions)
      .set({ updatedAt: new Date() })
      .where(eq(coachingSessions.id, session.id));
    return { userMessage, assistantMessage, citations: [] };
  }

  await assertAiQuota(db, userId, "coach_chat");

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

  const chapterRow = latest?.chapterId
    ? (
        await db
          .select({ id: chapters.id, title: chapters.title, content: chapters.content })
          .from(chapters)
          .where(and(eq(chapters.id, latest.chapterId), eq(chapters.storyId, session.storyId)))
          .limit(1)
      )[0]
    : undefined;

  const findings = latest
    ? await db
        .select()
        .from(analysisFindings)
        .where(eq(analysisFindings.analysisId, latest.id))
        .orderBy(asc(analysisFindings.orderIndex))
        .limit(6)
    : [];
  const evidence = findings
    .filter((finding) => finding.quote)
    .map((finding) => ({
      quote: finding.quote!,
      observation: finding.observation,
      recommendation: finding.recommendation,
      skill: latest?.skill ?? "global",
    }));

  const storyRow = (
    await db
      .select({ title: stories.title })
      .from(stories)
      .where(eq(stories.id, session.storyId))
      .limit(1)
  )[0];

  const provider = getAIProvider();
  let draft;
  try {
    draft = await provider.coachReply({
      storyTitle: storyRow?.title ?? "Votre histoire",
      chapterTitle: chapterRow?.title ?? null,
      chapterExcerpt: chapterRow?.content.slice(0, 12_000) ?? null,
      evidence,
      history: messages.slice(-8).map((message) => ({
        role: message.role === "user" ? "user" : "assistant",
        content: message.content,
      })),
      message: content,
    });
  } catch (error) {
    logAiFailure("réponse du coach", error);
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Le coach n'a pas pu répondre. Aucun crédit n'a été débité ; vous pouvez réessayer.",
    });
  }

  const manuscript = chapterRow?.content ?? "";
  const verifiedCitations = draft.citations
    .filter((quote) => manuscript.length > 0 && citationExists(quote, manuscript))
    .slice(0, 3)
    .map((quote) => ({ chapterId: chapterRow!.id, quote }));
  const reply = sanitizeQuotedClaims(draft.reply, manuscript);
  if (countWords(reply) < 5) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "La réponse du coach n'a pas pu être vérifiée. Aucun crédit n'a été débité ; vous pouvez réessayer.",
    });
  }

  const [userMessage] = await db
    .insert(coachingMessages)
    .values({ sessionId: session.id, role: "user", content })
    .returning();
  const [assistantMessage] = await db
    .insert(coachingMessages)
    .values({ sessionId: session.id, role: "assistant", content: reply, citations: verifiedCitations })
    .returning();
  await db
    .update(coachingSessions)
    .set({ updatedAt: new Date() })
    .where(eq(coachingSessions.id, session.id));
  await recordAiUsage(db, {
    userId,
    storyId: session.storyId,
    taskKind: "coach_chat",
    provider: draft.provider,
    model: draft.model,
    inputTokens: draft.inputTokens,
    outputTokens: draft.outputTokens,
  });
  return { userMessage, assistantMessage, citations: verifiedCitations };
}

/**
 * Retire toute citation qui ne se trouve pas mot pour mot dans le manuscrit.
 * Le coach peut commenter, mais jamais fabriquer une preuve.
 */
export function sanitizeQuotedClaims(reply: string, manuscript: string): string {
  return reply.replace(/«\s*([^»]{8,600})\s*»/g, (match, quote: string) => {
    if (manuscript && citationExists(quote, manuscript)) return match;
    return "(citation retirée : non vérifiée dans le manuscrit)";
  });
}

export async function reviewExerciseAttempt(
  db: Database,
  userId: string,
  input: {
    exerciseId: string;
    content: string;
    storyId?: string;
    attemptId?: string;
  },
) {
  const exercise = WORKSHOPS.flatMap((workshop) =>
    workshop.exercises.map((item) => ({ workshop, exercise: item })),
  ).find((item) => item.exercise.id === input.exerciseId);
  if (!exercise) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Exercice introuvable." });
  }
  if (countWords(input.content) < 30) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Votre essai est trop court pour une correction utile (30 mots minimum). Aucun crédit n'a été débité.",
    });
  }

  await assertAiQuota(db, userId, "exercise_generation");
  const provider = getAIProvider();
  let draft;
  try {
    draft = await provider.reviewExercise({
      exerciseTitle: exercise.exercise.title,
      instructions: exercise.exercise.instructions,
      criteria: exercise.exercise.criteria,
      skillName: exercise.workshop.title,
      content: input.content,
    });
  } catch (error) {
    logAiFailure("correction d'exercice", error);
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Le coach n'a pas pu corriger cet exercice. Aucun crédit n'a été débité ; vous pouvez réessayer.",
    });
  }

  let row;
  if (input.attemptId) {
    [row] = await db
      .update(exerciseAttempts)
      .set({
        content: input.content,
        status: "reviewed",
        feedback: draft.feedback,
        strengths: draft.strengths,
        improvements: draft.improvements,
        nextStep: draft.nextStep,
        score: draft.score === null ? null : Math.round(draft.score),
        confidence: draft.confidence,
        feedbackProvider: draft.provider,
        feedbackModel: draft.model,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(exerciseAttempts.id, input.attemptId), eq(exerciseAttempts.userId, userId)),
      )
      .returning();
  } else {
    [row] = await db
      .insert(exerciseAttempts)
      .values({
        userId,
        exerciseId: input.exerciseId,
        storyId: input.storyId ?? null,
        content: input.content,
        status: "reviewed",
        feedback: draft.feedback,
        strengths: draft.strengths,
        improvements: draft.improvements,
        nextStep: draft.nextStep,
        score: draft.score === null ? null : Math.round(draft.score),
        confidence: draft.confidence,
        feedbackProvider: draft.provider,
        feedbackModel: draft.model,
        reviewedAt: new Date(),
      })
      .returning();
  }
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Essai introuvable." });

  await recordAiUsage(db, {
    userId,
    storyId: input.storyId,
    taskKind: "exercise_generation",
    provider: draft.provider,
    model: draft.model,
    inputTokens: draft.inputTokens,
    outputTokens: draft.outputTokens,
  });
  return row;
}

export async function listExerciseAttempts(
  db: Database,
  userId: string,
  input: { exerciseId?: string; limit: number },
) {
  const conditions = [eq(exerciseAttempts.userId, userId)];
  if (input.exerciseId) conditions.push(eq(exerciseAttempts.exerciseId, input.exerciseId));
  return db
    .select()
    .from(exerciseAttempts)
    .where(and(...conditions))
    .orderBy(desc(exerciseAttempts.createdAt))
    .limit(input.limit);
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
