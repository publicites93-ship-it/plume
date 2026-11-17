import { and, count, countDistinct, desc, eq, gte, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { excerpt } from "@plume/shared";
import type { Database } from "../db/client";
import {
  chapterLikes,
  chapters,
  profiles,
  readingProgress,
  stories,
  storyFollows,
  storyReactions,
} from "../db/schema";

const ROW_SIZE = 12;
const WEEK_MS = 7 * 86_400_000;

/**
 * Rangées de l'écran Découvrir. Seules les histoires publiques ayant au moins
 * un chapitre publié sont proposées : un manuscrit privé n'y figure jamais.
 */
export async function discoverRows(db: Database, userId?: string) {
  // Candidats : histoires publiques avec des chapitres publiés.
  const candidates = await db
    .select({
      story: stories,
      authorName: profiles.pseudonym,
      chapterCount: count(chapters.id),
      wordCount: sql<number>`coalesce(sum(${chapters.wordCount}), 0)`,
      lastChapterAt: sql<Date | null>`max(${chapters.publishedAt})`,
    })
    .from(stories)
    .innerJoin(profiles, eq(profiles.userId, stories.authorId))
    .innerJoin(
      chapters,
      and(eq(chapters.storyId, stories.id), eq(chapters.status, "published"), isNull(chapters.deletedAt)),
    )
    .where(and(eq(stories.visibility, "public"), isNull(stories.deletedAt), isNotNull(stories.publishedAt)))
    .groupBy(stories.id, profiles.pseudonym)
    .orderBy(desc(stories.updatedAt))
    .limit(300);

  if (candidates.length === 0) {
    return { trending: [], mostLoved: [], latest: [], forYou: [] };
  }
  const ids = candidates.map((row) => row.story.id);
  const since = new Date(Date.now() - WEEK_MS);

  const [likesAll, favoritesAll, likesWeek, favoritesWeek, readersWeek, reactionsWeek] = await Promise.all([
    db.select({ id: chapterLikes.storyId, n: count() }).from(chapterLikes).where(inArray(chapterLikes.storyId, ids)).groupBy(chapterLikes.storyId),
    db.select({ id: storyFollows.storyId, n: count() }).from(storyFollows).where(inArray(storyFollows.storyId, ids)).groupBy(storyFollows.storyId),
    db
      .select({ id: chapterLikes.storyId, n: count() })
      .from(chapterLikes)
      .where(and(inArray(chapterLikes.storyId, ids), gte(chapterLikes.createdAt, since)))
      .groupBy(chapterLikes.storyId),
    db
      .select({ id: storyFollows.storyId, n: count() })
      .from(storyFollows)
      .where(and(inArray(storyFollows.storyId, ids), gte(storyFollows.createdAt, since)))
      .groupBy(storyFollows.storyId),
    db
      .select({ id: readingProgress.storyId, n: countDistinct(readingProgress.userId) })
      .from(readingProgress)
      .where(and(inArray(readingProgress.storyId, ids), gte(readingProgress.updatedAt, since)))
      .groupBy(readingProgress.storyId),
    db
      .select({ id: storyReactions.storyId, n: count() })
      .from(storyReactions)
      .where(and(inArray(storyReactions.storyId, ids), gte(storyReactions.createdAt, since)))
      .groupBy(storyReactions.storyId),
  ]);
  const toMap = (rows: Array<{ id: string; n: number }>) => new Map(rows.map((row) => [row.id, Number(row.n)]));
  const [lAll, fAll, lWeek, fWeek, rWeek, xWeek] = [likesAll, favoritesAll, likesWeek, favoritesWeek, readersWeek, reactionsWeek].map(toMap);

  const cards = candidates.map((row) => ({
    ...row.story,
    authorName: row.authorName,
    chapterCount: Number(row.chapterCount),
    wordCount: Number(row.wordCount),
    excerpt: excerpt(row.story.synopsis ?? "", 150),
    likes: lAll!.get(row.story.id) ?? 0,
    favorites: fAll!.get(row.story.id) ?? 0,
    lastChapterAt: row.lastChapterAt ? new Date(row.lastChapterAt) : null,
    // Activité de la semaine : un lecteur pèse 1, un J'aime 2, un favori 3, une réaction 1.
    weekScore:
      (rWeek!.get(row.story.id) ?? 0) +
      2 * (lWeek!.get(row.story.id) ?? 0) +
      3 * (fWeek!.get(row.story.id) ?? 0) +
      (xWeek!.get(row.story.id) ?? 0),
  }));

  const trending = cards
    .filter((card) => card.weekScore > 0)
    .sort((a, b) => b.weekScore - a.weekScore)
    .slice(0, ROW_SIZE);
  const mostLoved = cards
    .filter((card) => card.likes + card.favorites > 0)
    .sort((a, b) => b.likes + 2 * b.favorites - (a.likes + 2 * a.favorites))
    .slice(0, ROW_SIZE);
  const latest = [...cards]
    .sort((a, b) => (b.lastChapterAt?.getTime() ?? 0) - (a.lastChapterAt?.getTime() ?? 0))
    .slice(0, ROW_SIZE);

  let forYou: typeof cards = [];
  if (userId) {
    const [followed, read] = await Promise.all([
      db.select({ id: storyFollows.storyId, genre: stories.genre }).from(storyFollows).innerJoin(stories, eq(stories.id, storyFollows.storyId)).where(eq(storyFollows.userId, userId)),
      db.select({ id: readingProgress.storyId, genre: stories.genre }).from(readingProgress).innerJoin(stories, eq(stories.id, readingProgress.storyId)).where(eq(readingProgress.userId, userId)),
    ]);
    // Poids des genres : un favori compte double par rapport à une simple lecture.
    const weights = new Map<string, number>();
    for (const row of followed) if (row.genre) weights.set(row.genre, (weights.get(row.genre) ?? 0) + 2);
    for (const row of read) if (row.genre) weights.set(row.genre, (weights.get(row.genre) ?? 0) + 1);
    const known = new Set([...followed, ...read].map((row) => row.id));
    if (weights.size > 0) {
      forYou = cards
        .filter((card) => !known.has(card.id) && card.authorId !== userId && card.genre && weights.has(card.genre))
        .sort(
          (a, b) =>
            (weights.get(b.genre!) ?? 0) * 10 + b.likes + b.favorites -
            ((weights.get(a.genre!) ?? 0) * 10 + a.likes + a.favorites),
        )
        .slice(0, ROW_SIZE);
    }
  }

  // Champs internes de calcul retirés avant envoi.
  const strip = (list: typeof cards) => list.map(({ weekScore: _w, lastChapterAt: _l, ...card }) => card);
  return { trending: strip(trending), mostLoved: strip(mostLoved), latest: strip(latest), forYou: strip(forYou) };
}
