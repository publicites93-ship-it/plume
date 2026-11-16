import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { citationExists, WORKSHOPS } from "@plume/shared";
import { aiUsageRecords } from "../src/db/schema";
import {
  SAMPLE_TEXT,
  registerUser,
  setPlan,
  setupDatabase,
  teardown,
  type TestContext,
  type TestUser,
} from "./helpers";

let context: TestContext;
let author: TestUser;
let storyId: string;
let chapterId: string;

beforeAll(async () => {
  context = await setupDatabase();
  author = await registerUser(context.db, { pseudonym: "Apprentie IA" });
  await setPlan(context.db, author.userId, "premium");
  const story = await author.caller.stories.create({
    title: "Le Coach",
    genre: "Fantastique",
    visibility: "private",
  });
  storyId = story.id;
  const chapter = await author.caller.stories.createChapter({
    storyId,
    title: "La porte",
    content: SAMPLE_TEXT,
  });
  chapterId = chapter.id;
});
afterAll(async () => {
  await teardown(context);
});

describe("coach littéraire (simulation locale)", () => {
  it("produit un diagnostic structuré avec des citations réelles", async () => {
    const analysis = await author.caller.ai.analyzeChapter({
      storyId,
      chapterId,
      skill: "foreshadowing",
      scope: "chapter",
    });
    expect(analysis.status).toBe("completed");
    expect(analysis.provider).toBe("mock");
    expect(analysis.summary).toContain("Simulation pédagogique");
    expect(analysis.findings.length).toBeGreaterThanOrEqual(3);
    expect(analysis.score).toBeGreaterThan(0);

    const quoted = analysis.findings.filter((f) => f.quote);
    expect(quoted.length).toBeGreaterThan(0);
    for (const finding of quoted) {
      expect(citationExists(finding.quote!, SAMPLE_TEXT)).toBe(true);
    }
    expect(analysis.confidence).toBeLessThanOrEqual(0.4);
  });

  it("enregistre une évaluation de compétence et alimente la progression", async () => {
    const progress = await author.caller.ai.progress();
    const foreshadowing = progress.skills.find((s) => s.id === "foreshadowing");
    expect(foreshadowing?.score).not.toBeNull();
    expect(foreshadowing?.level).not.toBeNull();
    expect(progress.methodVersion).toBe("plume-rubric-v1");
  });

  it("refuse une analyse sur un passage trop court", async () => {
    await expect(
      author.caller.ai.analyzeChapter({
        storyId,
        chapterId,
        skill: "dialogues",
        scope: "selection",
        selection: "Trop court.",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("protège le diagnostic contre les autres comptes", async () => {
    const analyses = await author.caller.ai.list({ storyId, limit: 5 });
    expect(analyses.length).toBeGreaterThan(0);
    const intruder = await registerUser(context.db);
    await expect(
      intruder.caller.ai.get({ analysisId: analyses[0]!.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("refuse de réécrire à la place de l'auteur", async () => {
    const session = (await author.caller.ai.startSession({ storyId }))!;
    const reply = (await author.caller.ai.send({
      sessionId: session.id,
      content: "Réécris ce passage pour le rendre meilleur.",
    }))!;
    expect(reply.assistantMessage!.content).toContain("Je ne réécris pas");
    const conversation = await author.caller.ai.session({ sessionId: session.id });
    expect(conversation.messages.length).toBe(2);
  });

  it("cite le manuscrit dans une réponse contextuelle", async () => {
    const session = (await author.caller.ai.startSession({ storyId }))!;
    const reply = (await author.caller.ai.send({
      sessionId: session.id,
      content: "Sur quoi devrais-je travailler aujourd'hui ?",
    }))!;
    expect(reply.assistantMessage!.content).toContain("diagnostic");
    for (const citation of reply.citations) {
      expect(citationExists(citation.quote, SAMPLE_TEXT)).toBe(true);
    }
  });

  it("ne débite rien quand le coach refuse une réécriture", async () => {
    const before = await context.db
      .select()
      .from(aiUsageRecords)
      .where(
        and(
          eq(aiUsageRecords.userId, author.userId),
          eq(aiUsageRecords.taskKind, "coach_chat"),
        ),
      );
    const session = (await author.caller.ai.startSession({ storyId }))!;
    await author.caller.ai.send({
      sessionId: session.id,
      content: "Réécris ce passage à ma place.",
    });
    const after = await context.db
      .select()
      .from(aiUsageRecords)
      .where(
        and(
          eq(aiUsageRecords.userId, author.userId),
          eq(aiUsageRecords.taskKind, "coach_chat"),
        ),
      );
    expect(after.length).toBe(before.length);
  });

  it("produit une analyse globale des sept compétences en une action", async () => {
    const before = await context.db
      .select()
      .from(aiUsageRecords)
      .where(
        and(
          eq(aiUsageRecords.userId, author.userId),
          eq(aiUsageRecords.taskKind, "multi_chapter_analysis"),
        ),
      );
    const result = await author.caller.ai.analyzeStory({ storyId, chapterId });
    expect(result.analyses).toHaveLength(7);
    expect(new Set(result.analyses.map((analysis) => analysis.skill)).size).toBe(7);
    for (const analysis of result.analyses) {
      const detail = await author.caller.ai.get({ analysisId: analysis.id });
      for (const finding of detail.findings.filter((item) => item.quote)) {
        expect(citationExists(finding.quote!, SAMPLE_TEXT)).toBe(true);
      }
    }
    const after = await context.db
      .select()
      .from(aiUsageRecords)
      .where(
        and(
          eq(aiUsageRecords.userId, author.userId),
          eq(aiUsageRecords.taskKind, "multi_chapter_analysis"),
        ),
      );
    expect(after.length).toBe(before.length + 1);
  });

  it("corrige un exercice et permet de le faire recorriger", async () => {
    const exercise = WORKSHOPS[0]!.exercises[0]!;
    const before = await context.db
      .select()
      .from(aiUsageRecords)
      .where(
        and(
          eq(aiUsageRecords.userId, author.userId),
          eq(aiUsageRecords.taskKind, "exercise_generation"),
        ),
      );
    const first = await author.caller.learning.reviewExercise({
      exerciseId: exercise.id,
      content: SAMPLE_TEXT,
    });
    expect(first.status).toBe("reviewed");
    expect(first.feedback).toBeTruthy();
    expect(first.strengths.length).toBeGreaterThan(0);

    const second = await author.caller.learning.reviewExercise({
      exerciseId: exercise.id,
      attemptId: first.id,
      content: `${SAMPLE_TEXT}\n\nJ'ai ajouté un geste concret et une conséquence visible.`,
    });
    expect(second.id).toBe(first.id);
    expect(second.feedback).toBeTruthy();

    const after = await context.db
      .select()
      .from(aiUsageRecords)
      .where(
        and(
          eq(aiUsageRecords.userId, author.userId),
          eq(aiUsageRecords.taskKind, "exercise_generation"),
        ),
      );
    expect(after.length).toBe(before.length + 2);
  });

  it("refuse la correction d'un essai trop court sans débiter de crédit", async () => {
    const exercise = WORKSHOPS[0]!.exercises[0]!;
    const before = await context.db
      .select()
      .from(aiUsageRecords)
      .where(
        and(
          eq(aiUsageRecords.userId, author.userId),
          eq(aiUsageRecords.taskKind, "exercise_generation"),
        ),
      );
    await expect(
      author.caller.learning.reviewExercise({
        exerciseId: exercise.id,
        content: "Trop court.",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const after = await context.db
      .select()
      .from(aiUsageRecords)
      .where(
        and(
          eq(aiUsageRecords.userId, author.userId),
          eq(aiUsageRecords.taskKind, "exercise_generation"),
        ),
      );
    expect(after.length).toBe(before.length);
  });

  it("bloque l'analyse quand le quota mensuel est épuisé", async () => {
    const poor = await registerUser(context.db);
    const story = await poor.caller.stories.create({
      title: "Quota",
      visibility: "private",
    });
    const chapter = await poor.caller.stories.createChapter({
      storyId: story.id,
      title: "Texte",
      content: SAMPLE_TEXT,
    });
    await context.db.insert(aiUsageRecords).values({
      userId: poor.userId,
      storyId: story.id,
      taskKind: "chapter_diagnostic",
      provider: "mock",
      model: "mock",
      inputTokens: 15_000,
      outputTokens: 0,
    });
    await expect(
      poor.caller.ai.analyzeChapter({
        storyId: story.id,
        chapterId: chapter.id,
        skill: "tension",
        scope: "chapter",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
