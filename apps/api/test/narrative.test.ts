import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerUser, setPlan, setupDatabase, teardown, type TestContext, type TestUser } from "./helpers";

let context: TestContext;
let author: TestUser;
let storyId: string;

beforeAll(async () => {
  context = await setupDatabase();
  author = await registerUser(context.db, { pseudonym: "Archiviste" });
  await setPlan(context.db, author.userId, "premium");
  const story = await author.caller.stories.create({
    title: "Bestiaire",
    genre: "Fantasy",
    visibility: "private",
  });
  storyId = story.id;
});
afterAll(async () => {
  await teardown(context);
});

describe("bibliothèque narrative", () => {
  it("crée et met à jour une fiche personnage complète", async () => {
    const character = (await author.caller.narrative.createCharacter({
      storyId,
      name: "Séverin d'Aubrac",
      role: "Antagoniste",
      summary: "Horloger du beffroi, amoureux d'une morte.",
      motivation: "Arrêter le temps pour retrouver Hélène.",
      fear: "Oublier son visage.",
      secret: "Il a signé le pacte à la place d'Alma.",
      arc: "Passer de la possession à l'acceptation.",
      customFields: [{ label: "Objet fétiche", value: "Une clef fendue" }],
    }))!;
    expect(character.name).toBe("Séverin d'Aubrac");
    const updated = await author.caller.narrative.updateCharacter({
      id: character.id,
      storyId,
      fear: "Être oublié à son tour.",
    });
    expect(updated?.fear).toBe("Être oublié à son tour.");

    const bible = await author.caller.narrative.list({ storyId });
    expect(bible.characters.some((c) => c.id === character.id)).toBe(true);
    await author.caller.narrative.deleteCharacter({ id: character.id, storyId });
    const after = await author.caller.narrative.list({ storyId });
    expect(after.characters.some((c) => c.id === character.id)).toBe(false);
  });

  it("gère lieux, intrigues, chronologie et idées", async () => {
    const location = (await author.caller.narrative.createLocation({
      storyId,
      name: "Le beffroi",
      description: "Cent quatre-vingt-sept marches, une horloge qui respire.",
      atmosphere: "Froid, cireux, habité.",
    }))!;
    expect(location.name).toBe("Le beffroi");

    const plot = (await author.caller.narrative.createPlot({
      storyId,
      name: "La dette des minutes",
      description: "Chaque souvenir cédé raccourcit une vie.",
      stakes: "Alma doit choisir ce qu'elle accepte d'oublier.",
      status: "active",
    }))!;
    expect(plot.status).toBe("active");

    const event = (await author.caller.narrative.createEvent({
      storyId,
      title: "Le pacte d'Hélène",
      fictionalDate: "Il y a deux ans",
      narrativeOrder: 1,
      consequences: "Alma hérite de la dette sans le savoir.",
    }))!;
    expect(event.narrativeOrder).toBe(1);

    const idea = (await author.caller.narrative.createIdea({
      storyId,
      content: "Le carnet écrit les scènes avant qu'elles aient lieu.",
      kind: "revelation",
    }))!;
    expect(idea.kind).toBe("revelation");

    const plan = await author.caller.narrative.savePlan({
      storyId,
      title: "Plan en trois actes",
      structure: [{ act: 1, goal: "Installer la dette" }],
    });
    expect(plan?.title).toBe("Plan en trois actes");

    const bible = await author.caller.narrative.list({ storyId });
    expect(bible.locations.length).toBe(1);
    expect(bible.plots.length).toBe(1);
    expect(bible.events.length).toBe(1);
    expect(bible.ideas.length).toBe(1);
    expect(bible.plan?.title).toBe("Plan en trois actes");

    const updatedIdea = await author.caller.narrative.updateIdea({
      id: idea.id,
      storyId,
      content: "Le carnet se souvient des scènes que personne n'a encore vécues.",
      kind: "scene",
    });
    expect(updatedIdea?.kind).toBe("scene");
    expect(updatedIdea?.content).toContain("personne n'a encore vécues");

    await author.caller.narrative.deletePlot({ id: plot.id, storyId });
    const afterDelete = await author.caller.narrative.list({ storyId });
    expect(afterDelete.plots.length).toBe(0);
  });

  it("isole la bible narrative par compte", async () => {
    const intruder = await registerUser(context.db);
    await expect(
      intruder.caller.narrative.list({ storyId }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      intruder.caller.narrative.createCharacter({ storyId, name: "Intrus" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("refuse de modifier une fiche appartenant à une autre histoire", async () => {
    const other = await author.caller.stories.create({
      title: "Autre histoire",
      visibility: "private",
    });
    const character = (await author.caller.narrative.createCharacter({
      storyId: other.id,
      name: "Personnage déplacé",
    }))!;
    await expect(
      author.caller.narrative.updateCharacter({
        id: character.id,
        storyId,
        name: "Tentative",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
