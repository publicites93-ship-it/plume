import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  SAMPLE_TEXT,
  publicCaller,
  registerUser,
  setPlan,
  setupDatabase,
  teardown,
  type TestContext,
  type TestUser,
} from "./helpers";

let context: TestContext;
let author: TestUser;

beforeAll(async () => {
  context = await setupDatabase();
  author = await registerUser(context.db, { pseudonym: "Autrice Découverte" });
  await setPlan(context.db, author.userId, "premium");
});
afterAll(async () => {
  await teardown(context);
});

async function story(title: string, genre: string, publish = true) {
  const created = await author.caller.stories.create({ title, genre, visibility: "private" });
  const chapter = await author.caller.stories.createChapter({
    storyId: created.id,
    title: "Un",
    content: SAMPLE_TEXT,
  });
  if (publish) {
    await author.caller.stories.update({ id: created.id, visibility: "public" });
    await author.caller.stories.publishChapter({ chapterId: chapter.id });
  }
  return { id: created.id, chapterId: chapter.id };
}

describe("écran Découvrir", () => {
  it("classe les rangées et n'expose jamais une histoire privée", async () => {
    const fantasy = await story("Brumes", "Fantastique");
    const romance = await story("Lettres", "Romance");
    const fantasy2 = await story("Clochers", "Fantastique");
    const hidden = await story("Brouillon secret", "Fantastique", false);

    const reader = await registerUser(context.db);
    // Activité : Romance aimée et ajoutée en favori, Brumes seulement lue.
    await reader.caller.reading.toggleChapterLike({ chapterId: romance.chapterId });
    await reader.caller.reading.toggleFollow({ storyId: romance.id });
    await reader.caller.reading.saveProgress({ storyId: fantasy.id, chapterId: fantasy.chapterId, progress: 0.5 });

    const anonymous = await publicCaller(context.db).reading.discover();
    const all = [...anonymous.trending, ...anonymous.mostLoved, ...anonymous.bestSellers, ...anonymous.latest];
    expect(all.some((item) => item.id === hidden.id)).toBe(false);
    expect(anonymous.forYou).toEqual([]);
    expect(anonymous.trending[0]?.id).toBe(romance.id);
    expect(anonymous.mostLoved.map((item) => item.id)).toEqual([romance.id]);
    expect(anonymous.mostLoved[0]).toMatchObject({ likes: 1, favorites: 1, readers: 0 });
    // Best-sellers : d'abord les lecteurs (Brumes), puis J'aime et favoris (Lettres).
    expect(anonymous.bestSellers.map((item) => item.id)).toEqual([fantasy.id, romance.id, fantasy2.id]);
    const brumes = anonymous.latest.find((item) => item.id === fantasy.id);
    expect(brumes).toMatchObject({ likes: 0, favorites: 0, readers: 1 });
    expect(anonymous.latest).toHaveLength(3);
    // Une rangée par catégorie : Fantastique (2 histoires publiques) avant Romance.
    expect(anonymous.byGenre.map((row) => row.genre)).toEqual(["Fantastique", "Romance"]);
    expect(anonymous.byGenre[0]!.items.map((item) => item.id)).toEqual([fantasy.id, fantasy2.id]);
    expect(anonymous.byGenre.flatMap((row) => row.items).some((item) => item.id === hidden.id)).toBe(false);

    // Selon mes goûts : le lecteur a lu du Fantastique ; on lui propose l'autre
    // histoire fantastique, pas celles qu'il connaît déjà.
    const mine = await reader.caller.reading.discover();
    expect(mine.forYou.map((item) => item.id)).toEqual([fantasy2.id]);
  });
});
