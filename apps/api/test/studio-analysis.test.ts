import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetConfigForTests } from "../src/config";
import { resetAIProviderForTests } from "../src/services/ai/index";
import { nameInText, waitForStudioAnalyses } from "../src/services/studioAnalysis";
import { SAMPLE_TEXT, registerUser, setPlan, setupDatabase, teardown, type TestContext } from "./helpers";

process.env.AI_PROVIDER = "anthropic";
process.env.CLAUDE_API_KEY = "cle-de-test";
process.env.EMAIL_PROVIDER = "test";
process.env.REQUIRE_EMAIL_VERIFICATION = "false";

let context: TestContext;
const bodies: Array<Record<string, unknown>> = [];

/** Réponse simulée de Claude, avec des pièges : invention, fausse citation, contradiction. */
const EXTRACTION = {
  characters: [
    {
      name: "Alma",
      aliases: [],
      facts: [
        { field: "fear", value: "Les pas derrière la porte", quote: "Elle retint son souffle." },
        { field: "hair", value: "Rousse", quote: "Alma avait des cheveux roux." },
        { field: "age", value: "Inconnu" , quote: "Ce texte n'existe pas." },
        { field: "habits", value: "Pose la lampe sur la table", quote: "Alma posa la lampe sur la table" },
      ],
    },
    { name: "Sa mère", aliases: [], facts: [{ field: "summary", value: "Morte depuis onze ans", quote: "morte depuis onze ans" }] },
    { name: "Le Dragon", aliases: [], facts: [] },
  ],
  locations: [
    { name: "La bibliothèque", facts: [{ field: "sensations", value: "Odeur de cire et de vieux papier", quote: "La bibliothèque sentait la cire et le vieux papier." }] },
  ],
  relations: [{ from: "Alma", to: "Sa mère", kind: "family", description: "Fille et mère", quote: "C'était la voix de sa mère" }],
  events: [{ title: "La porte s'ouvre", description: null, quote: "Le battant s'ouvrit sur une obscurité plus froide que la pièce" }],
};

beforeAll(async () => {
  resetConfigForTests();
  resetAIProviderForTests();
  context = await setupDatabase();
});

beforeEach(() => {
  bodies.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify({
          content: [{ type: "text", text: JSON.stringify(EXTRACTION) }],
          usage: { input_tokens: 3000, output_tokens: 600 },
        }),
        { status: 200 },
      );
    }),
  );
});

afterAll(async () => {
  vi.unstubAllGlobals();
  await teardown(context);
  process.env.AI_PROVIDER = "mock";
  delete process.env.CLAUDE_API_KEY;
  resetConfigForTests();
  resetAIProviderForTests();
});

async function setup(plan: "free" | "premium" = "premium") {
  const author = await registerUser(context.db);
  await setPlan(context.db, author.userId, plan);
  const story = await author.caller.stories.create({ title: "Analyse", visibility: "private" });
  const chapter = await author.caller.stories.createChapter({ storyId: story.id, title: "La porte", content: SAMPLE_TEXT });
  return { author, story, chapter };
}

describe("Studio — analyse automatique des chapitres", () => {
  it("crée les fiches à partir de citations vérifiées, sans rien inventer ni écraser l'auteur", async () => {
    const { author, story, chapter } = await setup("premium");
    // L'autrice avait déjà décrit la peur d'Alma : elle ne doit pas être écrasée.
    const alma = await author.caller.narrative.createCharacter({ storyId: story.id, name: "Alma", fear: "Perdre sa mère une seconde fois" });

    expect(await author.caller.studio.requestAnalysis({ chapterId: chapter.id, manual: true })).toEqual({ status: "queued" });
    await waitForStudioAnalyses();

    // Extraction toujours confiée au modèle économique, même en Plume++.
    expect(bodies[0]?.model).toBe("claude-haiku-5-5");

    const list = await author.caller.narrative.list({ storyId: story.id });
    const names = list.characters.map((c) => c.name).sort();
    expect(names).toEqual(["Alma", "Sa mère"]); // « Le Dragon » n'est pas dans le texte.

    const almaAfter = list.characters.find((c) => c.id === alma!.id)!;
    expect(almaAfter.fear).toBe("Perdre sa mère une seconde fois");
    expect(almaAfter.sheet.hair).toBeUndefined(); // fausse citation écartée
    expect(almaAfter.sheet.age).toBeUndefined();
    expect(almaAfter.sheet.habits).toBe("Pose la lampe sur la table");
    expect(almaAfter.sources.habits).toMatchObject({ origin: "ai", chapterId: chapter.id, quote: "Alma posa la lampe sur la table" });

    const mother = list.characters.find((c) => c.name === "Sa mère")!;
    expect(mother.origin).toBe("ai");
    expect(list.locations.map((l) => l.name)).toEqual(["La bibliothèque"]);
    expect(list.relations).toHaveLength(1);
    expect(list.relations[0]).toMatchObject({ kind: "family", origin: "extracted" });
    expect(list.events.map((e) => e.title)).toEqual(["La porte s'ouvre"]);

    // La contradiction devient une proposition.
    const proposals = await author.caller.studio.proposals({ storyId: story.id });
    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({ field: "fear", currentValue: "Perdre sa mère une seconde fois", proposedValue: "Les pas derrière la porte" });

    // Chapitre inchangé : pas de nouvel appel.
    expect(await author.caller.studio.requestAnalysis({ chapterId: chapter.id, manual: true })).toEqual({ status: "up_to_date" });
    expect(bodies).toHaveLength(1);

    const overview = await author.caller.studio.overview({ storyId: story.id });
    expect(overview.chapters[0]).toMatchObject({ status: "done", upToDate: true });
    expect(overview.pendingProposals).toBe(1);
    expect(overview.quota.chapterAnalyses).toMatchObject({ used: 1, limit: 100 });

    // Les crédits du coach ne sont pas touchés.
    expect((await author.caller.auth.me()).plan.creditsUsed).toBe(0);

    // Accepter la proposition en fait une information de l'auteur.
    await author.caller.studio.decide({ id: proposals[0]!.id, storyId: story.id, decision: "accept" });
    const accepted = (await author.caller.narrative.list({ storyId: story.id })).characters.find((c) => c.id === alma!.id)!;
    expect(accepted.fear).toBe("Les pas derrière la porte");
    expect(accepted.sources.fear?.origin).toBe("author");
    expect(await author.caller.studio.proposals({ storyId: story.id })).toHaveLength(0);
  });

  it("marque comme venant de l'auteur un champ rempli par l'IA puis modifié", async () => {
    const { author, story, chapter } = await setup("premium");
    await author.caller.studio.requestAnalysis({ chapterId: chapter.id, manual: true });
    await waitForStudioAnalyses();
    const alma = (await author.caller.narrative.list({ storyId: story.id })).characters.find((c) => c.name === "Alma")!;
    expect(alma.sources.habits?.origin).toBe("ai");
    const edited = await author.caller.narrative.updateCharacter({
      id: alma.id,
      storyId: story.id,
      sheet: { ...alma.sheet, habits: "Range tout, toujours" },
    });
    expect(edited!.sources.habits?.origin).toBe("author");
  });

  it("applique le quota mensuel et ne décompte rien en cas d'échec", async () => {
    const { author, story, chapter: first } = await setup("free");
    // Forfait Gratuit : 3 nouveaux chapitres par semaine au total.
    const chapters = [first];
    for (let i = 0; i < 2; i++) {
      chapters.push(
        await author.caller.stories.createChapter({ storyId: story.id, title: `C${i}`, content: `${SAMPLE_TEXT} Variante ${i}.` }),
      );
    }
    // Un échec du fournisseur ne consomme pas de quota.
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 529 })));
    await author.caller.studio.requestAnalysis({ chapterId: chapters[0]!.id, manual: true });
    await waitForStudioAnalyses();
    let overview = await author.caller.studio.overview({ storyId: story.id });
    expect(overview.quota.chapterAnalyses.used).toBe(0);
    expect(overview.chapters.find((c) => c.id === chapters[0]!.id)?.status).toBe("failed");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(EXTRACTION) }], usage: {} }), { status: 200 }),
      ),
    );
    for (const chapter of chapters.slice(0, 2)) {
      await author.caller.studio.requestAnalysis({ chapterId: chapter.id, manual: true });
      await waitForStudioAnalyses();
    }
    expect(await author.caller.studio.requestAnalysis({ chapterId: chapters[2]!.id, manual: true })).toMatchObject({
      status: "quota",
      limit: 2,
      used: 2,
    });
    overview = await author.caller.studio.overview({ storyId: story.id });
    expect(overview.quota.chapterAnalyses).toMatchObject({ used: 2, remaining: 0 });
  });

  it("reconnaît un nom écrit avec un article ou une précision, et refuse un nom absent", () => {
    const text = "Alice vit passer un lapin blanc aux yeux roses. Le Chapelier riait.";
    expect(nameInText("Alice", text)).toBe("Alice");
    expect(nameInText("Alice (l'héroïne)", text)).toBe("Alice");
    expect(nameInText("Le Lapin Blanc", text)).toBe("Lapin Blanc");
    expect(nameInText("le Chapelier", text)).toBe("Le Chapelier");
    expect(nameInText("La Reine de Cœur", text)).toBeNull();
    expect(nameInText("Ali", text)).toBeNull();
  });

  it("refuse l'analyse du chapitre d'un autre compte", async () => {
    const { chapter } = await setup("premium");
    const intruder = await registerUser(context.db);
    await expect(intruder.caller.studio.requestAnalysis({ chapterId: chapter.id, manual: true })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
