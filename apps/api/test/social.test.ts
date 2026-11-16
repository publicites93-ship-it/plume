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
  author = await registerUser(context.db, { pseudonym: "Autrice Sociale" });
  await setPlan(context.db, author.userId, "premium");
});
afterAll(async () => {
  await teardown(context);
});

async function publishedChapter(title: string) {
  const story = await author.caller.stories.create({
    title,
    synopsis: "Histoire de test pour les réactions.",
    genre: "Fantastique",
    status: "ongoing",
    visibility: "private",
  });
  await author.caller.stories.update({ id: story.id, visibility: "public" });
  const chapter = await author.caller.stories.createChapter({
    storyId: story.id,
    title: "Chapitre partagé",
    content: SAMPLE_TEXT,
  });
  await author.caller.stories.publishChapter({ chapterId: chapter.id });
  return { story, chapter };
}

describe("réactions, J'aime, favoris et commentaires", () => {
  it("partage les compteurs entre lecteurs", async () => {
    const { story, chapter } = await publishedChapter("Compteurs partagés");
    const alice = await registerUser(context.db);
    const bruno = await registerUser(context.db);

    await alice.caller.reading.toggleReaction({ storyId: story.id, kind: "frisson" });
    await alice.caller.reading.toggleReaction({ storyId: story.id, kind: "love" });
    const afterBruno = await bruno.caller.reading.toggleReaction({
      storyId: story.id,
      kind: "frisson",
    });
    expect(afterBruno.reactions.frisson).toBe(2);
    expect(afterBruno.reactions.love).toBe(1);
    expect(afterBruno.mine).toEqual(["frisson"]);

    // Un second appui retire la réaction.
    const removed = await alice.caller.reading.toggleReaction({
      storyId: story.id,
      kind: "frisson",
    });
    expect(removed.reactions.frisson).toBe(1);

    await alice.caller.reading.toggleChapterLike({ chapterId: chapter.id });
    const liked = await bruno.caller.reading.toggleChapterLike({ chapterId: chapter.id });
    expect(liked).toEqual({ likes: 2, liked: true });

    await alice.caller.reading.toggleFollow({ storyId: story.id });
    await bruno.caller.reading.saveProgress({
      storyId: story.id,
      chapterId: chapter.id,
      progress: 0.4,
    });

    const stats = await publicCaller(context.db).reading.stats({ storyId: story.id });
    expect(stats.likes).toBe(2);
    expect(stats.favorites).toBe(1);
    expect(stats.readers).toBe(1);
    expect(stats.mine).toEqual([]);
  });

  it("publie, liste et modère les commentaires", async () => {
    const { chapter } = await publishedChapter("Commentaires");
    const reader = await registerUser(context.db, { pseudonym: "Lectrice Attentive" });
    const intruder = await registerUser(context.db);
    const { id } = await reader.caller.reading.addComment({
      chapterId: chapter.id,
      body: "La porte qui s'ouvre m'a glacée.",
    });
    const list = await intruder.caller.reading.comments({ chapterId: chapter.id });
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ authorName: "Lectrice Attentive", isMine: false, canDelete: false });

    await expect(intruder.caller.reading.deleteComment({ commentId: id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    // L'autrice modère ses chapitres.
    await author.caller.reading.deleteComment({ commentId: id });
    const after = await reader.caller.reading.comments({ chapterId: chapter.id });
    expect(after).toHaveLength(0);
  });

  it("n'expose ni réactions ni commentaires d'une histoire privée", async () => {
    const story = await author.caller.stories.create({
      title: "Secrète",
      synopsis: "Privée.",
      genre: "Fantastique",
      status: "draft",
      visibility: "private",
    });
    const chapter = await author.caller.stories.createChapter({
      storyId: story.id,
      title: "Brouillon",
      content: SAMPLE_TEXT,
    });
    const stranger = await registerUser(context.db);
    await expect(
      stranger.caller.reading.toggleReaction({ storyId: story.id, kind: "tension" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      stranger.caller.reading.addComment({ chapterId: chapter.id, body: "Bonjour" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      stranger.caller.reading.toggleChapterLike({ chapterId: chapter.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
