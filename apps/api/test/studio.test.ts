import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp, type BuiltApp } from "../src/app";
import { registerUser, setPlan, setupDatabase, teardown, type TestContext, type TestUser } from "./helpers";

let context: TestContext;
let built: BuiltApp;
let author: TestUser;

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(300, 9)]);

beforeAll(async () => {
  context = await setupDatabase();
  built = await buildApp({ db: context.db, logger: false });
  await built.app.ready();
  author = await registerUser(context.db, { pseudonym: "Autrice Studio" });
  await setPlan(context.db, author.userId, "premium");
});

afterAll(async () => {
  await built.app.close();
  await teardown(context);
});

async function newStory(user: TestUser, title = "Le Studio") {
  return user.caller.stories.create({ title, visibility: "private" });
}

describe("Studio d'écriture — fondations", () => {
  it("enregistre une fiche complète et laisse vide ce qui n'est pas renseigné", async () => {
    const story = await newStory(author);
    const alma = await author.caller.narrative.createCharacter({
      storyId: story.id,
      name: "Alma",
      role: "Protagoniste",
      aliases: ["la petite", "Mademoiselle Vey"],
      sheet: { nickname: "Mimi", age: "17", hair: "  ", wounds: "La mort de sa mère" },
    });
    expect(alma!.sheet).toEqual({ nickname: "Mimi", age: "17", wounds: "La mort de sa mère" });
    expect(alma!.aliases).toEqual(["la petite", "Mademoiselle Vey"]);

    const updated = await author.caller.narrative.updateCharacter({
      id: alma!.id,
      storyId: story.id,
      sheet: { nickname: "Mimi", likes: "La pluie" },
    });
    expect(updated!.sheet).toEqual({ nickname: "Mimi", likes: "La pluie" });
    expect(updated!.role).toBe("Protagoniste");

    await expect(
      author.caller.narrative.createCharacter({ storyId: story.id, name: "X", sheet: { inconnu: "x" } }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const place = await author.caller.narrative.createLocation({
      storyId: story.id,
      name: "La bibliothèque",
      sheet: { type: "Pièce", sensations: "Odeur de cire" },
    });
    expect(place!.sheet).toEqual({ type: "Pièce", sensations: "Odeur de cire" });

    const plot = await author.caller.narrative.createPlot({ storyId: story.id, name: "Le retour", kind: "main" });
    expect(plot!.kind).toBe("main");
    const event = await author.caller.narrative.createEvent({ storyId: story.id, title: "La voix", certainty: "hypothesis" });
    expect(event!.certainty).toBe("hypothesis");
  });

  it("gère les relations entre personnages d'une même histoire", async () => {
    const story = await newStory(author, "Relations");
    const a = await author.caller.narrative.createCharacter({ storyId: story.id, name: "Alma" });
    const b = await author.caller.narrative.createCharacter({ storyId: story.id, name: "Sa mère" });
    const relation = await author.caller.narrative.createRelation({
      storyId: story.id,
      fromCharacterId: a!.id,
      toCharacterId: b!.id,
      kind: "family",
      description: "Fille et mère",
    });
    expect(relation).toMatchObject({ kind: "family", origin: "author" });

    await expect(
      author.caller.narrative.createRelation({ storyId: story.id, fromCharacterId: a!.id, toCharacterId: a!.id, kind: "friend" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      author.caller.narrative.createRelation({ storyId: story.id, fromCharacterId: a!.id, toCharacterId: b!.id, kind: "family" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    // Un personnage d'une autre histoire ne peut pas être relié.
    const other = await newStory(author, "Autre");
    const stranger = await author.caller.narrative.createCharacter({ storyId: other.id, name: "Étranger" });
    await expect(
      author.caller.narrative.createRelation({ storyId: story.id, fromCharacterId: a!.id, toCharacterId: stranger!.id, kind: "enemy" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const list = await author.caller.narrative.list({ storyId: story.id });
    expect(list.relations).toHaveLength(1);

    // Supprimer un personnage supprime ses relations.
    await author.caller.narrative.deleteCharacter({ id: b!.id, storyId: story.id });
    expect((await author.caller.narrative.list({ storyId: story.id })).relations).toHaveLength(0);
  });

  it("garde les images privées, même quand l'histoire est publiée", async () => {
    const story = await newStory(author, "Portraits");
    const alma = await author.caller.narrative.createCharacter({ storyId: story.id, name: "Alma" });
    const media = await author.caller.narrative.addMedia({
      storyId: story.id,
      entityType: "character",
      entityId: alma!.id,
      imageBase64: JPEG.toString("base64"),
    });
    await author.caller.stories.update({ id: story.id, visibility: "public" });

    const owner = await built.app.inject({
      method: "GET",
      url: `/studio-media/${media.id}`,
      headers: { authorization: `Bearer ${author.accessToken}` },
    });
    expect(owner.statusCode).toBe(200);
    expect(owner.headers["content-type"]).toBe("image/jpeg");

    const reader = await registerUser(context.db);
    const other = await built.app.inject({
      method: "GET",
      url: `/studio-media/${media.id}`,
      headers: { authorization: `Bearer ${reader.accessToken}` },
    });
    expect(other.statusCode).toBe(404);
    expect((await built.app.inject({ method: "GET", url: `/studio-media/${media.id}` })).statusCode).toBe(404);

    for (let i = 0; i < 2; i++) {
      await author.caller.narrative.addMedia({ storyId: story.id, entityType: "character", entityId: alma!.id, imageBase64: JPEG.toString("base64") });
    }
    await expect(
      author.caller.narrative.addMedia({ storyId: story.id, entityType: "character", entityId: alma!.id, imageBase64: JPEG.toString("base64") }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    await author.caller.narrative.deleteCharacter({ id: alma!.id, storyId: story.id });
    expect((await author.caller.narrative.list({ storyId: story.id })).media).toHaveLength(0);
  });

  it("réserve le Studio aux profils qui écrivent et isole les comptes", async () => {
    const reader = await registerUser(context.db);
    const story = await newStory(reader, "Brouillon de lecteur");
    await reader.caller.auth.setGoal({ goal: "read" });
    await expect(reader.caller.narrative.list({ storyId: story.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await reader.caller.auth.setGoal({ goal: "both" });
    await expect(reader.caller.narrative.list({ storyId: story.id })).resolves.toBeTruthy();

    // Un autre auteur ne voit pas ce studio.
    await expect(author.caller.narrative.list({ storyId: story.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
