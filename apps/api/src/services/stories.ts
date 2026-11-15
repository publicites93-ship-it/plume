import { createHash } from "node:crypto";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  max,
  or,
  sql,
} from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { Database } from "../db/client";
import type { CreateStoryInput, UpdateStoryInput } from "@plume/shared";
import { countWords, excerpt, stripMarkdown } from "@plume/shared";
import {
  bookmarks,
  chapters,
  chapterVersions,
  profiles,
  publications,
  readingLists,
  readingListItems,
  readingProgress,
  stories,
  follows,
  storyFollows,
  users,
} from "../db/schema";
import { assertCanCreateChapter, assertCanCreateStory } from "./plans";

export function contentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export async function requireOwnedStory(db: Database, storyId: string, userId: string) {
  const [story] = await db
    .select()
    .from(stories)
    .where(and(eq(stories.id, storyId), eq(stories.authorId, userId), isNull(stories.deletedAt)))
    .limit(1);
  if (!story) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Histoire introuvable." });
  }
  return story;
}

export async function requireReadableStory(db: Database, storyId: string, userId?: string) {
  const [row] = await db
    .select({ story: stories, authorName: profiles.pseudonym })
    .from(stories)
    .innerJoin(profiles, eq(profiles.userId, stories.authorId))
    .where(and(eq(stories.id, storyId), isNull(stories.deletedAt)))
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Histoire introuvable." });
  }
  if (row.story.visibility === "private" && row.story.authorId !== userId) {
    // Ne jamais révéler l'existence d'un brouillon privé.
    throw new TRPCError({ code: "NOT_FOUND", message: "Histoire introuvable." });
  }
  return row;
}

export async function createStory(db: Database, userId: string, input: CreateStoryInput) {
  await assertCanCreateStory(db, userId);
  const [story] = await db
    .insert(stories)
    .values({
      authorId: userId,
      title: input.title,
      subtitle: input.subtitle ?? null,
      synopsis: input.synopsis ?? null,
      genre: input.genre ?? null,
      secondaryGenres: input.secondaryGenres ?? [],
      keywords: input.keywords ?? [],
      language: input.language,
      audience: input.audience,
      contentWarnings: input.contentWarnings ?? [],
      status: input.status,
      visibility: input.visibility,
      publishedAt: input.visibility === "public" ? new Date() : null,
    })
    .returning();
  if (!story) throw new Error("Création de l'histoire impossible.");
  return story;
}

export async function updateStory(db: Database, userId: string, input: UpdateStoryInput) {
  const existing = await requireOwnedStory(db, input.id, userId);
  const { id, ...fields } = input;
  const values: Record<string, unknown> = { updatedAt: new Date(), version: sql`${stories.version} + 1` };
  const allowed = [
    "title",
    "subtitle",
    "synopsis",
    "genre",
    "secondaryGenres",
    "keywords",
    "language",
    "audience",
    "contentWarnings",
    "status",
    "visibility",
  ] as const;
  for (const key of allowed) {
    if (fields[key] !== undefined) values[key] = fields[key];
  }
  if (fields.visibility === "public" && !existing.publishedAt) values.publishedAt = new Date();
  const [updated] = await db.update(stories).set(values).where(eq(stories.id, id)).returning();
  if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Histoire introuvable." });
  return updated;
}

export async function listMyStories(db: Database, userId: string) {
  const rows = await db
    .select({
      story: stories,
      chapterCount: count(chapters.id),
      wordCount: sql<number>`coalesce(sum(${chapters.wordCount}), 0)`,
      publishedCount: sql<number>`coalesce(sum(case when ${chapters.status} = 'published' then 1 else 0 end), 0)`,
    })
    .from(stories)
    .leftJoin(chapters, and(eq(chapters.storyId, stories.id), isNull(chapters.deletedAt)))
    .where(and(eq(stories.authorId, userId), isNull(stories.deletedAt)))
    .groupBy(stories.id)
    .orderBy(desc(stories.updatedAt));
  return rows.map((row) => ({
    ...row.story,
    chapterCount: Number(row.chapterCount),
    wordCount: Number(row.wordCount),
    publishedCount: Number(row.publishedCount),
  }));
}

export async function getStoryDashboard(db: Database, storyId: string, userId: string) {
  const story = await requireOwnedStory(db, storyId, userId);
  const chapterRows = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.storyId, storyId), isNull(chapters.deletedAt)))
    .orderBy(asc(chapters.orderIndex), asc(chapters.createdAt));
  const [followers] = await db
    .select({ total: count() })
    .from(storyFollows)
    .where(eq(storyFollows.storyId, storyId));
  const [readers] = await db
    .select({ total: count() })
    .from(readingProgress)
    .where(eq(readingProgress.storyId, storyId));
  return {
    story,
    chapters: chapterRows,
    stats: {
      chapterCount: chapterRows.length,
      publishedCount: chapterRows.filter((c) => c.status === "published").length,
      wordCount: chapterRows.reduce((total, c) => total + c.wordCount, 0),
      followers: Number(followers?.total ?? 0),
      readers: Number(readers?.total ?? 0),
    },
  };
}

export async function createChapter(
  db: Database,
  userId: string,
  input: { storyId: string; title: string; content: string },
) {
  await requireOwnedStory(db, input.storyId, userId);
  await assertCanCreateChapter(db, userId);
  return db.transaction(async (tx) => {
    const [orderRow] = await tx
      .select({ value: max(chapters.orderIndex) })
      .from(chapters)
      .where(and(eq(chapters.storyId, input.storyId), isNull(chapters.deletedAt)));
    const orderIndex = (orderRow?.value ?? 0) + 1;
    const wordCount = countWords(input.content);
    const [chapter] = await tx
      .insert(chapters)
      .values({
        storyId: input.storyId,
        title: input.title,
        content: input.content,
        wordCount,
        orderIndex,
        version: 1,
        lastSnapshotAt: new Date(),
      })
      .returning();
    if (!chapter) throw new Error("Création du chapitre impossible.");
    await tx.insert(chapterVersions).values({
      chapterId: chapter.id,
      storyId: input.storyId,
      versionNumber: 1,
      title: chapter.title,
      content: chapter.content,
      wordCount,
      contentHash: contentHash(chapter.content),
      reason: "manual",
      createdBy: userId,
    });
    await tx.update(stories).set({ updatedAt: new Date() }).where(eq(stories.id, input.storyId));
    return chapter;
  });
}

export interface SaveChapterResult {
  chapter: typeof chapters.$inferSelect;
  snapshotCreated: boolean;
  idempotent: boolean;
}

export async function saveChapter(
  db: Database,
  userId: string,
  input: {
    chapterId: string;
    content: string;
    baseVersion: number;
    clientMutationId: string;
    localUpdatedAt: string;
    title?: string;
    reason: "autosave" | "manual";
    forceSnapshot: boolean;
  },
): Promise<SaveChapterResult> {
  const [row] = await db
    .select({ chapter: chapters, story: stories })
    .from(chapters)
    .innerJoin(stories, eq(stories.id, chapters.storyId))
    .where(and(eq(chapters.id, input.chapterId), isNull(chapters.deletedAt)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Chapitre introuvable." });
  if (row.story.authorId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Chapitre introuvable." });
  }
  if (row.chapter.lastMutationId === input.clientMutationId) {
    return { chapter: row.chapter, snapshotCreated: false, idempotent: true };
  }
  if (row.chapter.version !== input.baseVersion) {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "Une version plus récente de ce chapitre existe sur le serveur. Choisissez la version à conserver.",
      cause: {
        details: {
          code: "CHAPTER_CONFLICT",
          currentVersion: row.chapter.version,
          content: row.chapter.content,
          title: row.chapter.title,
          wordCount: row.chapter.wordCount,
          updatedAt: row.chapter.updatedAt.toISOString(),
          baseVersion: input.baseVersion,
        },
      },
    });
  }

  const newVersion = row.chapter.version + 1;
  const wordCount = countWords(input.content);
  const title = input.title ?? row.chapter.title;
  const now = new Date();
  const lastSnapshot = row.chapter.lastSnapshotAt?.getTime() ?? 0;
  const snapshotCreated =
    input.forceSnapshot ||
    !row.chapter.lastSnapshotAt ||
    now.getTime() - lastSnapshot > 45_000;

  const [updated] = await db
    .update(chapters)
    .set({
      content: input.content,
      title,
      wordCount,
      version: newVersion,
      lastMutationId: input.clientMutationId,
      lastSnapshotAt: snapshotCreated ? now : row.chapter.lastSnapshotAt,
      updatedAt: now,
    })
    .where(and(eq(chapters.id, input.chapterId), eq(chapters.version, input.baseVersion)))
    .returning();

  if (!updated) {
    // Une écriture concurrente a gagné entre la lecture et l'écriture.
    const [current] = await db.select().from(chapters).where(eq(chapters.id, input.chapterId));
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "Une version plus récente de ce chapitre existe sur le serveur. Choisissez la version à conserver.",
      cause: {
        details: {
          code: "CHAPTER_CONFLICT",
          currentVersion: current?.version ?? 0,
          content: current?.content ?? "",
          title: current?.title ?? "",
          wordCount: current?.wordCount ?? 0,
          updatedAt: (current?.updatedAt ?? now).toISOString(),
          baseVersion: input.baseVersion,
        },
      },
    });
  }

  if (snapshotCreated) {
    await db
      .insert(chapterVersions)
      .values({
        chapterId: input.chapterId,
        storyId: row.story.id,
        versionNumber: newVersion,
        title,
        content: input.content,
        wordCount,
        contentHash: contentHash(input.content),
        reason: input.reason,
        createdBy: userId,
      })
      .onConflictDoNothing();
  }
  await db.update(stories).set({ updatedAt: now }).where(eq(stories.id, row.story.id));
  return { chapter: updated, snapshotCreated, idempotent: false };
}

export async function listChapterVersions(db: Database, chapterId: string, userId: string) {
  const [row] = await db
    .select({ storyId: chapters.storyId, authorId: stories.authorId })
    .from(chapters)
    .innerJoin(stories, eq(stories.id, chapters.storyId))
    .where(eq(chapters.id, chapterId))
    .limit(1);
  if (!row || row.authorId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Chapitre introuvable." });
  }
  const versions = await db
    .select({
      id: chapterVersions.id,
      versionNumber: chapterVersions.versionNumber,
      title: chapterVersions.title,
      wordCount: chapterVersions.wordCount,
      reason: chapterVersions.reason,
      createdAt: chapterVersions.createdAt,
    })
    .from(chapterVersions)
    .where(eq(chapterVersions.chapterId, chapterId))
    .orderBy(desc(chapterVersions.versionNumber))
    .limit(60);
  return versions;
}

export async function getChapterVersion(db: Database, versionId: string, userId: string) {
  const [row] = await db
    .select({ version: chapterVersions, authorId: stories.authorId })
    .from(chapterVersions)
    .innerJoin(stories, eq(stories.id, chapterVersions.storyId))
    .where(eq(chapterVersions.id, versionId))
    .limit(1);
  if (!row || row.authorId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Version introuvable." });
  }
  return row.version;
}

export async function restoreChapterVersion(
  db: Database,
  userId: string,
  versionId: string,
): Promise<typeof chapters.$inferSelect> {
  const version = await getChapterVersion(db, versionId, userId);
  const [chapter] = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.id, version.chapterId), isNull(chapters.deletedAt)))
    .limit(1);
  if (!chapter) throw new TRPCError({ code: "NOT_FOUND", message: "Chapitre introuvable." });
  const newVersion = chapter.version + 1;
  const now = new Date();
  const [updated] = await db
    .update(chapters)
    .set({
      content: version.content,
      title: version.title,
      wordCount: version.wordCount,
      version: newVersion,
      lastSnapshotAt: now,
      updatedAt: now,
    })
    .where(eq(chapters.id, chapter.id))
    .returning();
  if (!updated) throw new Error("Restauration impossible.");
  await db.insert(chapterVersions).values({
    chapterId: chapter.id,
    storyId: chapter.storyId,
    versionNumber: newVersion,
    title: version.title,
    content: version.content,
    wordCount: version.wordCount,
    contentHash: contentHash(version.content),
    reason: "restore",
    createdBy: userId,
  });
  return updated;
}

export async function publishChapter(db: Database, userId: string, chapterId: string) {
  const [row] = await db
    .select({ chapter: chapters, story: stories })
    .from(chapters)
    .innerJoin(stories, eq(stories.id, chapters.storyId))
    .where(and(eq(chapters.id, chapterId), isNull(chapters.deletedAt)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Chapitre introuvable." });
  if (row.story.authorId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Chapitre introuvable." });
  }
  if (row.story.visibility === "private") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Cette histoire est privée. Passez sa visibilité en publique ou non répertoriée avant de publier un chapitre.",
    });
  }
  if (row.chapter.wordCount === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Impossible de publier un chapitre vide.",
    });
  }

  return db.transaction(async (tx) => {
    const newVersion = row.chapter.version + 1;
    const now = new Date();
    const [version] = await tx
      .insert(chapterVersions)
      .values({
        chapterId: chapterId,
        storyId: row.story.id,
        versionNumber: newVersion,
        title: row.chapter.title,
        content: row.chapter.content,
        wordCount: row.chapter.wordCount,
        contentHash: contentHash(row.chapter.content),
        reason: "publish",
        createdBy: userId,
      })
      .returning();
    const [updated] = await tx
      .update(chapters)
      .set({
        status: "published",
        publishedAt: now,
        version: newVersion,
        lastSnapshotAt: now,
        updatedAt: now,
      })
      .where(eq(chapters.id, chapterId))
      .returning();
    await tx.insert(publications).values({
      storyId: row.story.id,
      chapterId,
      versionId: version?.id ?? null,
      publishedAt: now,
    });
    await tx
      .update(stories)
      .set({
        publishedAt: row.story.publishedAt ?? now,
        status: row.story.status === "draft" ? "ongoing" : row.story.status,
        updatedAt: now,
      })
      .where(eq(stories.id, row.story.id));
    return updated;
  });
}

export async function unpublishChapter(db: Database, userId: string, chapterId: string) {
  const [row] = await db
    .select({ chapter: chapters, story: stories })
    .from(chapters)
    .innerJoin(stories, eq(stories.id, chapters.storyId))
    .where(and(eq(chapters.id, chapterId), isNull(chapters.deletedAt)))
    .limit(1);
  if (!row || row.story.authorId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Chapitre introuvable." });
  }
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(chapters)
      .set({ status: "draft", publishedAt: null, updatedAt: new Date() })
      .where(eq(chapters.id, chapterId))
      .returning();
    await tx
      .update(publications)
      .set({ unpublishedAt: new Date() })
      .where(and(eq(publications.chapterId, chapterId), isNull(publications.unpublishedAt)));
    const [remaining] = await tx
      .select({ total: count() })
      .from(chapters)
      .where(
        and(
          eq(chapters.storyId, row.story.id),
          eq(chapters.status, "published"),
          isNull(chapters.deletedAt),
        ),
      );
    if (Number(remaining?.total ?? 0) === 0) {
      await tx.update(stories).set({ publishedAt: null }).where(eq(stories.id, row.story.id));
    }
    return updated;
  });
}

export async function setChapterArchived(
  db: Database,
  userId: string,
  chapterId: string,
  archived: boolean,
) {
  const [row] = await db
    .select({ chapter: chapters, story: stories })
    .from(chapters)
    .innerJoin(stories, eq(stories.id, chapters.storyId))
    .where(and(eq(chapters.id, chapterId), isNull(chapters.deletedAt)))
    .limit(1);
  if (!row || row.story.authorId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Chapitre introuvable." });
  }
  if (archived && row.chapter.status === "published") {
    await unpublishChapter(db, userId, chapterId);
  }
  const [updated] = await db
    .update(chapters)
    .set({
      status: archived ? "archived" : "draft",
      archivedAt: archived ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(chapters.id, chapterId))
    .returning();
  return updated;
}

export async function softDeleteChapter(db: Database, userId: string, chapterId: string) {
  const [row] = await db
    .select({ chapter: chapters, story: stories })
    .from(chapters)
    .innerJoin(stories, eq(stories.id, chapters.storyId))
    .where(and(eq(chapters.id, chapterId), isNull(chapters.deletedAt)))
    .limit(1);
  if (!row || row.story.authorId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Chapitre introuvable." });
  }
  if (row.chapter.status === "published") {
    await unpublishChapter(db, userId, chapterId);
  }
  const [updated] = await db
    .update(chapters)
    .set({ deletedAt: new Date(), status: "draft", updatedAt: new Date() })
    .where(eq(chapters.id, chapterId))
    .returning();
  return updated;
}

export async function restoreChapter(db: Database, userId: string, chapterId: string) {
  const [row] = await db
    .select({ chapter: chapters, story: stories })
    .from(chapters)
    .innerJoin(stories, eq(stories.id, chapters.storyId))
    .where(eq(chapters.id, chapterId))
    .limit(1);
  if (!row || row.story.authorId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Chapitre introuvable." });
  }
  const [updated] = await db
    .update(chapters)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(chapters.id, chapterId))
    .returning();
  return updated;
}

export async function duplicateChapter(db: Database, userId: string, chapterId: string) {
  const [row] = await db
    .select({ chapter: chapters, story: stories })
    .from(chapters)
    .innerJoin(stories, eq(stories.id, chapters.storyId))
    .where(and(eq(chapters.id, chapterId), isNull(chapters.deletedAt)))
    .limit(1);
  if (!row || row.story.authorId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Chapitre introuvable." });
  }
  await assertCanCreateChapter(db, userId);
  return db.transaction(async (tx) => {
    const [orderRow] = await tx
      .select({ value: max(chapters.orderIndex) })
      .from(chapters)
      .where(and(eq(chapters.storyId, row.story.id), isNull(chapters.deletedAt)));
    const [copy] = await tx
      .insert(chapters)
      .values({
        storyId: row.story.id,
        title: `${row.chapter.title} — copie`,
        content: row.chapter.content,
        wordCount: row.chapter.wordCount,
        orderIndex: (orderRow?.value ?? 0) + 1,
        version: 1,
        lastSnapshotAt: new Date(),
      })
      .returning();
    if (!copy) throw new Error("Duplication impossible.");
    await tx.insert(chapterVersions).values({
      chapterId: copy.id,
      storyId: row.story.id,
      versionNumber: 1,
      title: copy.title,
      content: copy.content,
      wordCount: copy.wordCount,
      contentHash: contentHash(copy.content),
      reason: "manual",
      createdBy: userId,
    });
    return copy;
  });
}

export async function reorderChapters(
  db: Database,
  userId: string,
  storyId: string,
  chapterIds: string[],
) {
  await requireOwnedStory(db, storyId, userId);
  const rows = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(and(eq(chapters.storyId, storyId), isNull(chapters.deletedAt)));
  const existing = new Set(rows.map((r) => r.id));
  if (chapterIds.length !== existing.size || chapterIds.some((id) => !existing.has(id))) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "La liste des chapitres ne correspond pas à l'histoire.",
    });
  }
  await db.transaction(async (tx) => {
    for (let index = 0; index < chapterIds.length; index++) {
      await tx
        .update(chapters)
        .set({ orderIndex: index + 1, updatedAt: new Date() })
        .where(eq(chapters.id, chapterIds[index]!));
    }
  });
  return { ok: true };
}

export async function exportManuscript(
  db: Database,
  userId: string,
  storyId: string,
  format: "md" | "txt",
) {
  const story = await requireOwnedStory(db, storyId, userId);
  const chapterRows = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.storyId, storyId), isNull(chapters.deletedAt)))
    .orderBy(asc(chapters.orderIndex));
  const safeTitle = story.title.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "manuscrit";
  if (format === "txt") {
    const body = chapterRows
      .map(
        (chapter) =>
          `${chapter.title.toUpperCase()}\n\n${stripMarkdown(chapter.content)}\n`,
      )
      .join("\n\n");
    return {
      filename: `${safeTitle}.txt`,
      mimeType: "text/plain",
      content: `${story.title}\n${story.subtitle ? `${story.subtitle}\n` : ""}\n${
        story.synopsis ? `${stripMarkdown(story.synopsis)}\n\n` : ""
      }${body}`,
    };
  }
  const body = chapterRows
    .map((chapter) => `## ${chapter.title}\n\n${chapter.content}\n`)
    .join("\n\n");
  return {
    filename: `${safeTitle}.md`,
    mimeType: "text/markdown",
    content: `# ${story.title}\n\n${story.subtitle ? `*${story.subtitle}*\n\n` : ""}${
      story.synopsis ? `${story.synopsis}\n\n` : ""
    }${body}`,
  };
}

export async function listCatalog(
  db: Database,
  input: { query?: string; genre?: string; status?: string; limit: number; cursor?: number },
) {
  const conditions = [
    eq(stories.visibility, "public"),
    isNull(stories.deletedAt),
    isNotNull(stories.publishedAt),
  ];
  if (input.genre) conditions.push(eq(stories.genre, input.genre));
  if (input.status === "completed") conditions.push(eq(stories.status, "completed"));
  if (input.status === "ongoing") conditions.push(eq(stories.status, "ongoing"));
  if (input.query) {
    const pattern = `%${input.query}%`;
    const search = or(
      ilike(stories.title, pattern),
      ilike(stories.synopsis, pattern),
      ilike(profiles.pseudonym, pattern),
      ilike(stories.genre, pattern),
    );
    if (search) conditions.push(search);
  }
  const offset = input.cursor ?? 0;
  const rows = await db
    .select({
      story: stories,
      authorName: profiles.pseudonym,
      chapterCount: count(chapters.id),
      wordCount: sql<number>`coalesce(sum(${chapters.wordCount}), 0)`,
    })
    .from(stories)
    .innerJoin(profiles, eq(profiles.userId, stories.authorId))
    .leftJoin(
      chapters,
      and(
        eq(chapters.storyId, stories.id),
        eq(chapters.status, "published"),
        isNull(chapters.deletedAt),
      ),
    )
    .where(and(...conditions))
    .groupBy(stories.id, profiles.pseudonym)
    .orderBy(desc(stories.publishedAt), desc(stories.updatedAt))
    .limit(input.limit + 1)
    .offset(offset);
  const hasMore = rows.length > input.limit;
  const items = rows.slice(0, input.limit).map((row) => ({
    ...row.story,
    authorName: row.authorName,
    chapterCount: Number(row.chapterCount),
    wordCount: Number(row.wordCount),
    excerpt: excerpt(row.story.synopsis ?? "", 150),
  }));
  return { items, nextCursor: hasMore ? offset + input.limit : null };
}

export async function getPublicStory(db: Database, storyId: string, userId?: string) {
  const { story, authorName } = await requireReadableStory(db, storyId, userId);
  const chapterRows = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      wordCount: chapters.wordCount,
      orderIndex: chapters.orderIndex,
      publishedAt: chapters.publishedAt,
    })
    .from(chapters)
    .where(
      and(
        eq(chapters.storyId, storyId),
        eq(chapters.status, "published"),
        isNull(chapters.deletedAt),
      ),
    )
    .orderBy(asc(chapters.orderIndex));
  let following = false;
  let progress = null;
  if (userId) {
    const [follow] = await db
      .select()
      .from(storyFollows)
      .where(and(eq(storyFollows.userId, userId), eq(storyFollows.storyId, storyId)))
      .limit(1);
    following = Boolean(follow);
    const [p] = await db
      .select()
      .from(readingProgress)
      .where(and(eq(readingProgress.userId, userId), eq(readingProgress.storyId, storyId)))
      .limit(1);
    progress = p ?? null;
  }
  return { story, authorName, chapters: chapterRows, following, progress };
}

export async function getPublishedChapter(
  db: Database,
  chapterId: string,
  userId?: string,
) {
  const [row] = await db
    .select({ chapter: chapters, story: stories, authorName: profiles.pseudonym })
    .from(chapters)
    .innerJoin(stories, eq(stories.id, chapters.storyId))
    .innerJoin(profiles, eq(profiles.userId, stories.authorId))
    .where(and(eq(chapters.id, chapterId), isNull(chapters.deletedAt)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Chapitre introuvable." });
  const isOwner = row.story.authorId === userId;
  if (!isOwner && (row.chapter.status !== "published" || row.story.visibility === "private")) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Chapitre introuvable." });
  }
  const siblings = await db
    .select({ id: chapters.id, title: chapters.title, orderIndex: chapters.orderIndex })
    .from(chapters)
    .where(
      and(
        eq(chapters.storyId, row.story.id),
        isNull(chapters.deletedAt),
        isOwner ? sql`true` : eq(chapters.status, "published"),
      ),
    )
    .orderBy(asc(chapters.orderIndex));
  return { ...row, siblings, isOwner };
}

export async function toggleStoryFollow(db: Database, userId: string, storyId: string) {
  await requireReadableStory(db, storyId, userId);
  const [existing] = await db
    .select()
    .from(storyFollows)
    .where(and(eq(storyFollows.userId, userId), eq(storyFollows.storyId, storyId)))
    .limit(1);
  if (existing) {
    await db
      .delete(storyFollows)
      .where(and(eq(storyFollows.userId, userId), eq(storyFollows.storyId, storyId)));
    return { following: false };
  }
  await db.insert(storyFollows).values({ userId, storyId });
  return { following: true };
}

export async function saveReadingProgress(
  db: Database,
  userId: string,
  input: { storyId: string; chapterId: string; progress: number },
) {
  await requireReadableStory(db, input.storyId, userId);
  await db
    .insert(readingProgress)
    .values({
      userId,
      storyId: input.storyId,
      chapterId: input.chapterId,
      progress: input.progress,
      completedAt: input.progress >= 0.98 ? new Date() : null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [readingProgress.userId, readingProgress.storyId],
      set: {
        chapterId: input.chapterId,
        progress: input.progress,
        completedAt: input.progress >= 0.98 ? new Date() : null,
        updatedAt: new Date(),
      },
    });
  return { ok: true };
}

export async function listLibrary(db: Database, userId: string) {
  const rows = await db
    .select({
      story: stories,
      authorName: profiles.pseudonym,
      progress: readingProgress.progress,
      chapterId: readingProgress.chapterId,
      updatedAt: readingProgress.updatedAt,
    })
    .from(storyFollows)
    .innerJoin(stories, eq(stories.id, storyFollows.storyId))
    .innerJoin(profiles, eq(profiles.userId, stories.authorId))
    .leftJoin(
      readingProgress,
      and(eq(readingProgress.storyId, stories.id), eq(readingProgress.userId, userId)),
    )
    .where(and(eq(storyFollows.userId, userId), isNull(stories.deletedAt)))
    .orderBy(desc(storyFollows.createdAt));
  return rows.map((row) => ({
    ...row.story,
    authorName: row.authorName,
    progress: row.progress,
    currentChapterId: row.chapterId,
    lastReadAt: row.updatedAt,
  }));
}

export async function listBookmarks(db: Database, userId: string) {
  return db
    .select({ bookmark: bookmarks, storyTitle: stories.title, chapterTitle: chapters.title })
    .from(bookmarks)
    .innerJoin(stories, eq(stories.id, bookmarks.storyId))
    .innerJoin(chapters, eq(chapters.id, bookmarks.chapterId))
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt));
}

export async function addBookmark(
  db: Database,
  userId: string,
  input: { storyId: string; chapterId: string; position: number; note?: string | null },
) {
  await requireReadableStory(db, input.storyId, userId);
  const [row] = await db
    .insert(bookmarks)
    .values({
      userId,
      storyId: input.storyId,
      chapterId: input.chapterId,
      position: input.position,
      note: input.note ?? null,
    })
    .returning();
  return row;
}

export async function removeBookmark(db: Database, userId: string, bookmarkId: string) {
  await db.delete(bookmarks).where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)));
  return { ok: true };
}

export async function listReadingLists(db: Database, userId: string) {
  const lists = await db
    .select()
    .from(readingLists)
    .where(eq(readingLists.userId, userId))
    .orderBy(desc(readingLists.createdAt));
  const items = await db
    .select({ listId: readingListItems.listId, storyId: readingListItems.storyId })
    .from(readingListItems)
    .innerJoin(readingLists, eq(readingLists.id, readingListItems.listId))
    .where(eq(readingLists.userId, userId));
  return lists.map((list) => ({
    ...list,
    storyIds: items.filter((i) => i.listId === list.id).map((i) => i.storyId),
  }));
}

export async function createReadingList(db: Database, userId: string, name: string) {
  const [row] = await db.insert(readingLists).values({ userId, name }).returning();
  return row;
}

export async function addStoryToList(
  db: Database,
  userId: string,
  listId: string,
  storyId: string,
) {
  const [list] = await db
    .select()
    .from(readingLists)
    .where(and(eq(readingLists.id, listId), eq(readingLists.userId, userId)))
    .limit(1);
  if (!list) throw new TRPCError({ code: "NOT_FOUND", message: "Liste introuvable." });
  await requireReadableStory(db, storyId, userId);
  await db
    .insert(readingListItems)
    .values({ listId, storyId })
    .onConflictDoNothing();
  return { ok: true };
}

export async function authorProfile(db: Database, authorId: string, viewerId?: string) {
  const [row] = await db
    .select({ user: users, profile: profiles })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(users.id, authorId), isNull(users.deletedAt)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Auteur introuvable." });
  const published = await db
    .select({
      id: stories.id,
      title: stories.title,
      synopsis: stories.synopsis,
      genre: stories.genre,
      coverMotif: stories.coverMotif,
      updatedAt: stories.updatedAt,
      status: stories.status,
    })
    .from(stories)
    .where(
      and(
        eq(stories.authorId, authorId),
        eq(stories.visibility, "public"),
        isNotNull(stories.publishedAt),
        isNull(stories.deletedAt),
      ),
    )
    .orderBy(desc(stories.updatedAt))
    .limit(30);
  const [followers] = await db
    .select({ total: count() })
    .from(follows)
    .where(eq(follows.authorId, authorId));
  let isFollowing = false;
  if (viewerId && viewerId !== authorId) {
    const [follow] = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, viewerId), eq(follows.authorId, authorId)))
      .limit(1);
    isFollowing = Boolean(follow);
  }
  return {
    author: {
      id: row.user.id,
      pseudonym: row.profile.pseudonym,
      bio: row.profile.bio,
      avatarMotif: row.profile.avatarMotif,
    },
    stories: published,
    stats: { followers: Number(followers?.total ?? 0) },
    isFollowing,
  };
}

export async function toggleAuthorFollow(
  db: Database,
  userId: string,
  authorId: string,
) {
  if (userId === authorId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Vous ne pouvez pas vous suivre vous-même.",
    });
  }
  const [author] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.userId, authorId))
    .limit(1);
  if (!author) throw new TRPCError({ code: "NOT_FOUND", message: "Auteur introuvable." });
  const [existing] = await db
    .select()
    .from(follows)
    .where(and(eq(follows.followerId, userId), eq(follows.authorId, authorId)))
    .limit(1);
  if (existing) {
    await db
      .delete(follows)
      .where(and(eq(follows.followerId, userId), eq(follows.authorId, authorId)));
    return { following: false };
  }
  await db.insert(follows).values({ followerId: userId, authorId });
  return { following: true };
}

export async function getChapterForOwner(db: Database, chapterId: string, userId: string) {
  const [row] = await db
    .select({ chapter: chapters, story: stories })
    .from(chapters)
    .innerJoin(stories, eq(stories.id, chapters.storyId))
    .where(and(eq(chapters.id, chapterId), isNull(chapters.deletedAt)))
    .limit(1);
  if (!row || row.story.authorId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Chapitre introuvable." });
  }
  return row;
}

export async function softDeleteStory(db: Database, storyId: string, userId: string) {
  const story = await requireOwnedStory(db, storyId, userId);
  const [updated] = await db
    .update(stories)
    .set({ deletedAt: new Date(), visibility: "private", updatedAt: new Date() })
    .where(eq(stories.id, story.id))
    .returning();
  return updated;
}
