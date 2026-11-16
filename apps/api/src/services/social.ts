import { and, count, countDistinct, desc, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  MAX_REACTIONS_PER_READER,
  STORY_REACTION_IDS,
  type StoryReactionKind,
} from "@plume/shared";
import type { Database } from "../db/client";
import {
  chapterLikes,
  chapters,
  comments,
  profiles,
  readingProgress,
  stories,
  storyFollows,
  storyReactions,
} from "../db/schema";
import { requireReadableStory } from "./stories";

/**
 * Un chapitre n'est lisible (et donc commentable / « aimable ») que s'il est
 * publié dans une histoire non privée, ou si le lecteur en est l'auteur.
 * Toute autre situation renvoie NOT_FOUND pour ne rien révéler.
 */
async function requireReadableChapter(db: Database, chapterId: string, userId?: string) {
  const [row] = await db
    .select({ chapter: chapters, story: stories })
    .from(chapters)
    .innerJoin(stories, eq(stories.id, chapters.storyId))
    .where(and(eq(chapters.id, chapterId), isNull(chapters.deletedAt), isNull(stories.deletedAt)))
    .limit(1);
  const isOwner = Boolean(row && userId && row.story.authorId === userId);
  if (
    !row ||
    (!isOwner && (row.chapter.status !== "published" || row.story.visibility === "private"))
  ) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Chapitre introuvable." });
  }
  return { ...row, isOwner };
}

/** Compteurs publics d'une histoire : lecteurs (œil), J'aime (cœur), favoris (étoile). */
export async function storyStats(db: Database, storyId: string, userId?: string) {
  await requireReadableStory(db, storyId, userId);
  const [[readers], [likes], [favorites], [commentTotal], reactionRows] = await Promise.all([
    db
      .select({ total: countDistinct(readingProgress.userId) })
      .from(readingProgress)
      .where(eq(readingProgress.storyId, storyId)),
    db.select({ total: count() }).from(chapterLikes).where(eq(chapterLikes.storyId, storyId)),
    db.select({ total: count() }).from(storyFollows).where(eq(storyFollows.storyId, storyId)),
    db
      .select({ total: count() })
      .from(comments)
      .where(
        and(eq(comments.storyId, storyId), isNull(comments.deletedAt), isNull(comments.hiddenAt)),
      ),
    db
      .select({ kind: storyReactions.kind, total: count() })
      .from(storyReactions)
      .where(eq(storyReactions.storyId, storyId))
      .groupBy(storyReactions.kind),
  ]);
  const reactions = Object.fromEntries(STORY_REACTION_IDS.map((id) => [id, 0])) as Record<
    StoryReactionKind,
    number
  >;
  for (const row of reactionRows) {
    if ((STORY_REACTION_IDS as readonly string[]).includes(row.kind)) {
      reactions[row.kind as StoryReactionKind] = Number(row.total);
    }
  }
  let mine: StoryReactionKind[] = [];
  let favorite = false;
  if (userId) {
    const [own, follow] = await Promise.all([
      db
        .select({ kind: storyReactions.kind })
        .from(storyReactions)
        .where(and(eq(storyReactions.storyId, storyId), eq(storyReactions.userId, userId))),
      db
        .select({ storyId: storyFollows.storyId })
        .from(storyFollows)
        .where(and(eq(storyFollows.storyId, storyId), eq(storyFollows.userId, userId)))
        .limit(1),
    ]);
    mine = own.map((r) => r.kind as StoryReactionKind);
    favorite = follow.length > 0;
  }
  return {
    readers: Number(readers?.total ?? 0),
    likes: Number(likes?.total ?? 0),
    favorites: Number(favorites?.total ?? 0),
    comments: Number(commentTotal?.total ?? 0),
    reactions,
    mine,
    favorite,
  };
}

export async function toggleStoryReaction(
  db: Database,
  userId: string,
  storyId: string,
  kind: StoryReactionKind,
) {
  await requireReadableStory(db, storyId, userId);
  const removed = await db
    .delete(storyReactions)
    .where(
      and(
        eq(storyReactions.storyId, storyId),
        eq(storyReactions.userId, userId),
        eq(storyReactions.kind, kind),
      ),
    )
    .returning({ id: storyReactions.id });
  if (removed.length === 0) {
    const [own] = await db
      .select({ total: count() })
      .from(storyReactions)
      .where(and(eq(storyReactions.storyId, storyId), eq(storyReactions.userId, userId)));
    if (Number(own?.total ?? 0) >= MAX_REACTIONS_PER_READER) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Vous avez déjà posé ${MAX_REACTIONS_PER_READER} réactions sur cette histoire. Retirez-en une pour en ajouter une autre.`,
      });
    }
    await db.insert(storyReactions).values({ storyId, userId, kind }).onConflictDoNothing();
  }
  return storyStats(db, storyId, userId);
}

export async function chapterSocial(db: Database, chapterId: string, userId?: string) {
  await requireReadableChapter(db, chapterId, userId);
  const [[likes], liked] = await Promise.all([
    db.select({ total: count() }).from(chapterLikes).where(eq(chapterLikes.chapterId, chapterId)),
    userId
      ? db
          .select({ chapterId: chapterLikes.chapterId })
          .from(chapterLikes)
          .where(and(eq(chapterLikes.chapterId, chapterId), eq(chapterLikes.userId, userId)))
          .limit(1)
      : Promise.resolve([]),
  ]);
  return { likes: Number(likes?.total ?? 0), liked: liked.length > 0 };
}

export async function toggleChapterLike(db: Database, userId: string, chapterId: string) {
  const { chapter } = await requireReadableChapter(db, chapterId, userId);
  const removed = await db
    .delete(chapterLikes)
    .where(and(eq(chapterLikes.chapterId, chapterId), eq(chapterLikes.userId, userId)))
    .returning({ chapterId: chapterLikes.chapterId });
  if (removed.length === 0) {
    await db
      .insert(chapterLikes)
      .values({ chapterId, storyId: chapter.storyId, userId })
      .onConflictDoNothing();
  }
  return chapterSocial(db, chapterId, userId);
}

export async function listChapterComments(db: Database, chapterId: string, userId?: string) {
  const { story } = await requireReadableChapter(db, chapterId, userId);
  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      userId: comments.userId,
      authorName: profiles.pseudonym,
    })
    .from(comments)
    .innerJoin(profiles, eq(profiles.userId, comments.userId))
    .where(
      and(eq(comments.chapterId, chapterId), isNull(comments.deletedAt), isNull(comments.hiddenAt)),
    )
    .orderBy(desc(comments.createdAt))
    .limit(100);
  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.createdAt,
    authorName: row.authorName,
    isMine: row.userId === userId,
    // L'auteur de l'histoire peut modérer les commentaires de ses chapitres.
    canDelete: row.userId === userId || story.authorId === userId,
  }));
}

export async function addChapterComment(
  db: Database,
  userId: string,
  input: { chapterId: string; body: string },
) {
  const { chapter } = await requireReadableChapter(db, input.chapterId, userId);
  const [row] = await db
    .insert(comments)
    .values({ storyId: chapter.storyId, chapterId: chapter.id, userId, body: input.body })
    .returning({ id: comments.id });
  return { id: row!.id };
}

export async function deleteComment(db: Database, userId: string, commentId: string) {
  const [row] = await db
    .select({ comment: comments, storyAuthorId: stories.authorId })
    .from(comments)
    .innerJoin(stories, eq(stories.id, comments.storyId))
    .where(and(eq(comments.id, commentId), isNull(comments.deletedAt)))
    .limit(1);
  if (!row || (row.comment.userId !== userId && row.storyAuthorId !== userId)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Commentaire introuvable." });
  }
  await db.update(comments).set({ deletedAt: new Date() }).where(eq(comments.id, commentId));
  return { ok: true };
}
