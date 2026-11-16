import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { aiAnalyses, aiUsageRecords, exerciseAttempts } from "../src/db/schema";
import { resetConfigForTests } from "../src/config";
import { registerUser, SAMPLE_TEXT, setupDatabase, teardown, type TestContext } from "./helpers";

process.env.AI_PROVIDER = "gemini";
delete process.env.GEMINI_API_KEY;
process.env.EMAIL_PROVIDER = "test";
process.env.REQUIRE_EMAIL_VERIFICATION = "false";

let context: TestContext;

beforeAll(async () => {
  resetConfigForTests();
  context = await setupDatabase();
});

afterAll(async () => {
  await teardown(context);
  process.env.AI_PROVIDER = "mock";
  resetConfigForTests();
});

describe("échec du fournisseur IA", () => {
  it("ne débite aucun crédit et ne laisse pas d'analyse partielle", async () => {
    const author = await registerUser(context.db);
    const story = await author.caller.stories.create({
      title: "Panne du coach",
      visibility: "private",
    });
    const chapter = await author.caller.stories.createChapter({
      storyId: story.id,
      title: "Texte intact",
      content: SAMPLE_TEXT,
    });

    await expect(
      author.caller.ai.analyzeChapter({
        storyId: story.id,
        chapterId: chapter.id,
        skill: "tension",
        scope: "chapter",
      }),
    ).rejects.toBeTruthy();

    const usage = await context.db
      .select()
      .from(aiUsageRecords)
      .where(eq(aiUsageRecords.userId, author.userId));
    const analyses = await context.db
      .select()
      .from(aiAnalyses)
      .where(eq(aiAnalyses.userId, author.userId));
    expect(usage).toHaveLength(0);
    expect(analyses).toHaveLength(0);
  });

  it("ne débite aucun crédit quand la correction d'exercice échoue", async () => {
    const author = await registerUser(context.db);
    await expect(
      author.caller.learning.reviewExercise({
        exerciseId: "personnages-choix-couteux",
        content: SAMPLE_TEXT,
      }),
    ).rejects.toBeTruthy();

    const usage = await context.db
      .select()
      .from(aiUsageRecords)
      .where(eq(aiUsageRecords.userId, author.userId));
    const attempts = await context.db
      .select()
      .from(exerciseAttempts)
      .where(eq(exerciseAttempts.userId, author.userId));
    expect(usage).toHaveLength(0);
    expect(attempts).toHaveLength(0);
  });
});
