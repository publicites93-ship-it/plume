import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TRPCError } from "@trpc/server";
import { SAMPLE_TEXT, registerUser, setPlan, setupDatabase, teardown, type TestContext, type TestUser } from "./helpers";

let context: TestContext;
let author: TestUser;

beforeAll(async () => {
  context = await setupDatabase();
  author = await registerUser(context.db, { pseudonym: "Autrice Histoires" });
  await setPlan(context.db, author.userId, "premium");
});
afterAll(async () => {
  await teardown(context);
});

async function createStory(user: TestUser, title = "Les Heures Creuses") {
  return user.caller.stories.create({
    title,
    synopsis: "Un roman de démonstration pour les tests.",
    genre: "Fantastique",
    status: "draft",
    visibility: "private",
  });
}

async function createChapter(user: TestUser, storyId: string, title = "Chapitre premier") {
  return user.caller.stories.createChapter({
    storyId,
    title,
    content: SAMPLE_TEXT,
  });
}

describe("gestion des histoires", () => {
  it("crée une histoire et la retrouve dans la liste", async () => {
    const story = await createStory(author, "Le Manuscrit de Verre");
    expect(story.authorId).toBe(author.userId);
    const list = await author.caller.stories.list();
    expect(list.some((s) => s.id === story.id)).toBe(true);
    expect(list[0]?.wordCount).toBe(0);
  });

  it("met à jour les métadonnées sans casser l'identité", async () => {
    const story = await createStory(author, "Brouillon");
    const updated = await author.caller.stories.update({
      id: story.id,
      title: "Titre définitif",
      visibility: "unlisted",
      status: "ongoing",
    });
    expect(updated.title).toBe("Titre définitif");
    expect(updated.visibility).toBe("unlisted");
    expect(updated.version).toBeGreaterThan(story.version);
  });

  it("applique la limite d'histoires actives du plan gratuit", async () => {
    const freeUser = await registerUser(context.db);
    await createStory(freeUser, "Première histoire");
    await expect(createStory(freeUser, "Deuxième histoire")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("interdit l'accès au tableau de bord d'un autre auteur", async () => {
    const story = await createStory(author, "Privé absolu");
    const intruder = await registerUser(context.db);
    await expect(
      intruder.caller.stories.dashboard({ storyId: story.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("supprime logiquement une histoire", async () => {
    const story = await createStory(author, "À supprimer");
    await author.caller.stories.delete({ id: story.id });
    const list = await author.caller.stories.list();
    expect(list.some((s) => s.id === story.id)).toBe(false);
  });
});

describe("chapitres, versions et conflits", () => {
  it("crée un chapitre, sauvegarde et crée un snapshot manuel", async () => {
    const story = await createStory(author, "Structure");
    const chapter = await createChapter(author, story.id);
    expect(chapter.version).toBe(1);

    const saved = await author.caller.stories.saveChapter({
      chapterId: chapter.id,
      content: `${SAMPLE_TEXT}\n\nUn paragraphe ajouté.`,
      baseVersion: 1,
      clientMutationId: crypto.randomUUID(),
      localUpdatedAt: new Date().toISOString(),
      reason: "manual",
      forceSnapshot: true,
    });
    expect(saved.chapter.version).toBe(2);
    expect(saved.snapshotCreated).toBe(true);
    expect(saved.chapter.wordCount).toBeGreaterThan(0);

    const versions = await author.caller.stories.versions({ chapterId: chapter.id });
    expect(versions.length).toBeGreaterThanOrEqual(2);
  });

  it("est idempotent sur le même clientMutationId", async () => {
    const story = await createStory(author, "Idempotence");
    const chapter = await createChapter(author, story.id);
    const mutationId = crypto.randomUUID();
    const input = {
      chapterId: chapter.id,
      content: `${SAMPLE_TEXT} Version idempotente.`,
      baseVersion: 1,
      clientMutationId: mutationId,
      localUpdatedAt: new Date().toISOString(),
      forceSnapshot: true,
    } as const;
    const first = await author.caller.stories.saveChapter(input);
    const second = await author.caller.stories.saveChapter(input);
    expect(second.idempotent).toBe(true);
    expect(second.chapter.version).toBe(first.chapter.version);
  });

  it("signale un conflit de version avec l'état serveur", async () => {
    const story = await createStory(author, "Conflit");
    const chapter = await createChapter(author, story.id);
    await author.caller.stories.saveChapter({
      chapterId: chapter.id,
      content: `${SAMPLE_TEXT} Version serveur.`,
      baseVersion: 1,
      clientMutationId: crypto.randomUUID(),
      localUpdatedAt: new Date().toISOString(),
    });
    try {
      await author.caller.stories.saveChapter({
        chapterId: chapter.id,
        content: `${SAMPLE_TEXT} Version locale.`,
        baseVersion: 1,
        clientMutationId: crypto.randomUUID(),
        localUpdatedAt: new Date().toISOString(),
      });
      throw new Error("Le conflit aurait dû être signalé.");
    } catch (error) {
      const trpcError = error as TRPCError;
      expect(trpcError.code).toBe("CONFLICT");
      expect(trpcError.cause).toBeDefined();
    }
  });

  it("restaure une version antérieure sans perdre l'historique", async () => {
    const story = await createStory(author, "Restauration");
    const chapter = await createChapter(author, story.id);
    await author.caller.stories.saveChapter({
      chapterId: chapter.id,
      content: `${SAMPLE_TEXT} Deuxième version.`,
      baseVersion: 1,
      clientMutationId: crypto.randomUUID(),
      localUpdatedAt: new Date().toISOString(),
      forceSnapshot: true,
    });
    const versions = await author.caller.stories.versions({ chapterId: chapter.id });
    const original = versions.find((v) => v.versionNumber === 1);
    expect(original).toBeDefined();
    const restored = await author.caller.stories.restoreVersion({ versionId: original!.id });
    expect(restored.content).toBe(SAMPLE_TEXT);
    expect(restored.version).toBeGreaterThan(2);
    const after = await author.caller.stories.versions({ chapterId: chapter.id });
    expect(after.length).toBeGreaterThan(versions.length);
  });

  it("réordonne et duplique les chapitres", async () => {
    const story = await createStory(author, "Ordre");
    const a = await createChapter(author, story.id, "A");
    const b = await createChapter(author, story.id, "B");
    await author.caller.stories.reorderChapters({
      storyId: story.id,
      chapterIds: [b.id, a.id],
    });
    const dashboard = await author.caller.stories.dashboard({ storyId: story.id });
    expect(dashboard.chapters.map((c) => c.title)).toEqual(["B", "A"]);
    const copy = await author.caller.stories.duplicateChapter({ chapterId: a.id });
    expect(copy.title).toContain("copie");
  });

  it("applique la limite hebdomadaire de chapitres du plan gratuit", async () => {
    const freeUser = await registerUser(context.db);
    const story = await createStory(freeUser, "Limite chapitres");
    await createChapter(freeUser, story.id, "1");
    await createChapter(freeUser, story.id, "2");
    await createChapter(freeUser, story.id, "3");
    await expect(createChapter(freeUser, story.id, "4")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("publication et lecture", () => {
  it("refuse de publier une histoire privée", async () => {
    const story = await createStory(author, "Encore privée");
    const chapter = await createChapter(author, story.id);
    await expect(
      author.caller.stories.publishChapter({ chapterId: chapter.id }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("publie un chapitre, le rend lisible et le masque après dépublication", async () => {
    const story = await createStory(author, "Lisible");
    await author.caller.stories.update({ id: story.id, visibility: "public" });
    const chapter = await createChapter(author, story.id, "Chapitre public");
    const published = await author.caller.stories.publishChapter({ chapterId: chapter.id });
    expect(published?.status).toBe("published");

    const reader = await registerUser(context.db);
    const publicStory = await reader.caller.reading.story({ storyId: story.id });
    expect(publicStory.chapters.length).toBe(1);
    const readChapter = await reader.caller.reading.chapter({ chapterId: chapter.id });
    expect(readChapter.chapter.content).toBe(SAMPLE_TEXT);

    const catalog = await reader.caller.reading.catalog({ limit: 50 });
    expect(catalog.items.some((s) => s.id === story.id)).toBe(true);

    await author.caller.stories.unpublishChapter({ chapterId: chapter.id });
    await expect(
      reader.caller.reading.chapter({ chapterId: chapter.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("ne révèle jamais un brouillon privé à un autre compte", async () => {
    const story = await createStory(author, "Brouillon secret");
    const intruder = await registerUser(context.db);
    await expect(
      intruder.caller.reading.story({ storyId: story.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("enregistre la progression, suit l'histoire et alimente la bibliothèque", async () => {
    const story = await createStory(author, "Suivi");
    await author.caller.stories.update({ id: story.id, visibility: "public" });
    const chapter = await createChapter(author, story.id);
    await author.caller.stories.publishChapter({ chapterId: chapter.id });

    const reader = await registerUser(context.db);
    await reader.caller.reading.toggleFollow({ storyId: story.id });
    await reader.caller.reading.saveProgress({
      storyId: story.id,
      chapterId: chapter.id,
      progress: 0.42,
    });
    const library = await reader.caller.reading.library();
    expect(library.some((s) => s.id === story.id && s.progress === 0.42)).toBe(true);

    await reader.caller.reading.toggleFollow({ storyId: story.id });
    const after = await reader.caller.reading.library();
    expect(after.some((s) => s.id === story.id)).toBe(false);
  });

  it("exporte le manuscrit en Markdown et en texte", async () => {
    const story = await createStory(author, "Export");
    await createChapter(author, story.id, "Chapitre exporté");
    const md = await author.caller.stories.export({ storyId: story.id, format: "md" });
    expect(md.filename.endsWith(".md")).toBe(true);
    expect(md.content).toContain("# Export");
    expect(md.content).toContain("## Chapitre exporté");
    const txt = await author.caller.stories.export({ storyId: story.id, format: "txt" });
    expect(txt.content).toContain("CHAPITRE EXPORTÉ");
  });
});
