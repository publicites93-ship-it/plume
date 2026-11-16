import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { citationExists } from "@plume/shared";
import { aiUsageRecords } from "../src/db/schema";
import { resetConfigForTests } from "../src/config";
import { resetAIProviderForTests } from "../src/services/ai/index";
import {
  registerUser,
  SAMPLE_TEXT,
  setPlan,
  setupDatabase,
  teardown,
  type TestContext,
} from "./helpers";

process.env.AI_PROVIDER = "anthropic";
process.env.CLAUDE_API_KEY = "cle-de-test";
delete process.env.ANTHROPIC_API_KEY;
process.env.EMAIL_PROVIDER = "test";
process.env.REQUIRE_EMAIL_VERIFICATION = "false";

let context: TestContext;
const realQuote = "Elle retint son souffle.";
const fakeQuote = "Le dragon cracha une flamme bleue sur la ville endormie.";

function analysisJson() {
  const finding = (quote: string | null, kind: "strength" | "improvement" | "question") => ({
    kind,
    title: "Constat de tension",
    observation: "La scène retient l'information pour créer l'attente.",
    quote,
    explanation: "Le retard de l'information maintient le lecteur dans l'incertitude.",
    impact: null,
    priority: "medium",
    confidence: 0.7,
    recommendation: "Observez où l'information est donnée.",
    exercise: null,
  });
  return {
    summary: "Le chapitre installe une tension par la rétention d'information.",
    score: 70,
    confidence: 0.6,
    findings: [finding(realQuote, "strength"), finding(fakeQuote, "improvement"), finding(null, "question")],
  };
}

beforeAll(async () => {
  resetConfigForTests();
  resetAIProviderForTests();
  context = await setupDatabase();
});

afterAll(async () => {
  vi.unstubAllGlobals();
  await teardown(context);
  process.env.AI_PROVIDER = "mock";
  delete process.env.CLAUDE_API_KEY;
  resetConfigForTests();
  resetAIProviderForTests();
});

async function storyWithChapter() {
  const author = await registerUser(context.db);
  const story = await author.caller.stories.create({ title: "Claude", visibility: "private" });
  const chapter = await author.caller.stories.createChapter({
    storyId: story.id,
    title: "La porte",
    content: SAMPLE_TEXT,
  });
  return { author, story, chapter };
}

describe("fournisseur Claude", () => {
  it("analyse avec CLAUDE_API_KEY, écarte la citation inventée et débite les crédits", async () => {
    expect(SAMPLE_TEXT).toContain(realQuote);
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "```json\n" + JSON.stringify(analysisJson()) + "\n```" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 1200, output_tokens: 400 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { author, story, chapter } = await storyWithChapter();
    const me = await author.caller.auth.me();
    expect(me.coach).toEqual({ provider: "anthropic", isSimulation: false, available: true });

    const result = await author.caller.ai.analyzeChapter({
      storyId: story.id,
      chapterId: chapter.id,
      skill: "tension",
      scope: "chapter",
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("cle-de-test");
    // Compte Gratuit : modèle économique.
    expect(JSON.parse(String(init.body)).model).toBe("claude-haiku-5-5");

    const quotes = result.findings.map((f) => f.quote).filter((q): q is string => Boolean(q));
    expect(quotes).toContain(realQuote);
    expect(quotes).not.toContain(fakeQuote);
    for (const quote of quotes) expect(citationExists(quote, SAMPLE_TEXT)).toBe(true);

    const usage = await context.db
      .select()
      .from(aiUsageRecords)
      .where(eq(aiUsageRecords.userId, author.userId));
    expect(usage).toHaveLength(1);
    expect(usage[0]?.provider).toBe("anthropic");
    expect(usage[0]?.model).toBe("claude-haiku-5-5");
    expect(usage[0]?.estimatedCostMicros).toBe(1200 * 0.1 + 400 * 0.5);

    // Formule payante : modèle complet.
    await setPlan(context.db, author.userId, "plus");
    await author.caller.ai.analyzeChapter({
      storyId: story.id,
      chapterId: chapter.id,
      skill: "dialogues",
      scope: "chapter",
    });
    const [, secondInit] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(JSON.parse(String(secondInit.body)).model).toBe("claude-sonnet-5-5");
  });

  it("ne débite rien quand Claude refuse la requête", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: { type: "authentication_error", message: "invalid x-api-key" } }), {
          status: 401,
        }),
      ),
    );
    const { author, story, chapter } = await storyWithChapter();
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
    expect(usage).toHaveLength(0);
  });
});
