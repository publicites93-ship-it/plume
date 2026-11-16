import { z } from "zod";
import { COMMENT_MAX_LENGTH, STORY_REACTION_IDS, readingProgressSchema } from "@plume/shared";
import { protectedProcedure, publicProcedure, router } from "../trpc";
import {
  addBookmark,
  addStoryToList,
  authorProfile,
  createReadingList,
  getPublicStory,
  getPublishedChapter,
  listBookmarks,
  listCatalog,
  listLibrary,
  listReadingLists,
  removeBookmark,
  saveReadingProgress,
  toggleAuthorFollow,
  toggleStoryFollow,
} from "../../services/stories";
import {
  addChapterComment,
  chapterSocial,
  deleteComment,
  listChapterComments,
  storyStats,
  toggleChapterLike,
  toggleStoryReaction,
} from "../../services/social";

export const readingRouter = router({
  catalog: publicProcedure
    .input(
      z.object({
        query: z.string().trim().max(120).optional(),
        genre: z.string().trim().max(40).optional(),
        status: z.enum(["ongoing", "completed"]).optional(),
        limit: z.number().int().min(1).max(50).default(20),
        cursor: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => listCatalog(ctx.db, input)),

  story: publicProcedure
    .input(z.object({ storyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => getPublicStory(ctx.db, input.storyId, ctx.userId)),

  chapter: publicProcedure
    .input(z.object({ chapterId: z.string().uuid() }))
    .query(async ({ ctx, input }) => getPublishedChapter(ctx.db, input.chapterId, ctx.userId)),

  toggleFollow: protectedProcedure
    .input(z.object({ storyId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => toggleStoryFollow(ctx.db, ctx.userId, input.storyId)),

  toggleAuthorFollow: protectedProcedure
    .input(z.object({ authorId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => toggleAuthorFollow(ctx.db, ctx.userId, input.authorId)),

  saveProgress: protectedProcedure
    .input(readingProgressSchema)
    .mutation(async ({ ctx, input }) => saveReadingProgress(ctx.db, ctx.userId, input)),

  library: protectedProcedure.query(async ({ ctx }) => listLibrary(ctx.db, ctx.userId)),

  bookmarks: protectedProcedure.query(async ({ ctx }) => listBookmarks(ctx.db, ctx.userId)),

  addBookmark: protectedProcedure
    .input(
      z.object({
        storyId: z.string().uuid(),
        chapterId: z.string().uuid(),
        position: z.number().int().min(0).default(0),
        note: z.string().trim().max(500).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => addBookmark(ctx.db, ctx.userId, input)),

  removeBookmark: protectedProcedure
    .input(z.object({ bookmarkId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => removeBookmark(ctx.db, ctx.userId, input.bookmarkId)),

  lists: protectedProcedure.query(async ({ ctx }) => listReadingLists(ctx.db, ctx.userId)),

  createList: protectedProcedure
    .input(z.object({ name: z.string().trim().min(1).max(60) }))
    .mutation(async ({ ctx, input }) => createReadingList(ctx.db, ctx.userId, input.name)),

  addToList: protectedProcedure
    .input(z.object({ listId: z.string().uuid(), storyId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) =>
      addStoryToList(ctx.db, ctx.userId, input.listId, input.storyId),
    ),

  author: publicProcedure
    .input(z.object({ authorId: z.string().uuid() }))
    .query(async ({ ctx, input }) => authorProfile(ctx.db, input.authorId, ctx.userId)),
  stats: publicProcedure
    .input(z.object({ storyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => storyStats(ctx.db, input.storyId, ctx.userId)),

  toggleReaction: protectedProcedure
    .input(z.object({ storyId: z.string().uuid(), kind: z.enum(STORY_REACTION_IDS) }))
    .mutation(async ({ ctx, input }) =>
      toggleStoryReaction(ctx.db, ctx.userId, input.storyId, input.kind),
    ),

  chapterSocial: publicProcedure
    .input(z.object({ chapterId: z.string().uuid() }))
    .query(async ({ ctx, input }) => chapterSocial(ctx.db, input.chapterId, ctx.userId)),

  toggleChapterLike: protectedProcedure
    .input(z.object({ chapterId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => toggleChapterLike(ctx.db, ctx.userId, input.chapterId)),

  comments: publicProcedure
    .input(z.object({ chapterId: z.string().uuid() }))
    .query(async ({ ctx, input }) => listChapterComments(ctx.db, input.chapterId, ctx.userId)),

  addComment: protectedProcedure
    .input(
      z.object({
        chapterId: z.string().uuid(),
        body: z.string().trim().min(1).max(COMMENT_MAX_LENGTH),
      }),
    )
    .mutation(async ({ ctx, input }) => addChapterComment(ctx.db, ctx.userId, input)),

  deleteComment: protectedProcedure
    .input(z.object({ commentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => deleteComment(ctx.db, ctx.userId, input.commentId)),
});
