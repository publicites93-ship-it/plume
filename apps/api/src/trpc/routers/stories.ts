import { z } from "zod";
import {
  createChapterSchema,
  createStorySchema,
  saveChapterSchema,
  updateStorySchema,
} from "@plume/shared";
import { protectedProcedure, router } from "../trpc";
import {
  createChapter,
  createStory,
  duplicateChapter,
  exportManuscript,
  getChapterForOwner,
  getStoryDashboard,
  listChapterVersions,
  listMyStories,
  publishChapter,
  reorderChapters,
  restoreChapter,
  restoreChapterVersion,
  saveChapter,
  setChapterArchived,
  softDeleteChapter,
  softDeleteStory,
  unpublishChapter,
  updateStory,
} from "../../services/stories";
import { storyBibleStats } from "../../services/narrative";

export const storyRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => listMyStories(ctx.db, ctx.userId)),

  create: protectedProcedure.input(createStorySchema).mutation(async ({ ctx, input }) => {
    return createStory(ctx.db, ctx.userId, input);
  }),

  update: protectedProcedure.input(updateStorySchema).mutation(async ({ ctx, input }) => {
    return updateStory(ctx.db, ctx.userId, input);
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const story = await softDeleteStory(ctx.db, input.id, ctx.userId);
      return { ok: true, story };
    }),

  dashboard: protectedProcedure
    .input(z.object({ storyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const dashboard = await getStoryDashboard(ctx.db, input.storyId, ctx.userId);
      const bible = await storyBibleStats(ctx.db, input.storyId);
      return { ...dashboard, bible };
    }),

  export: protectedProcedure
    .input(z.object({ storyId: z.string().uuid(), format: z.enum(["md", "txt"]) }))
    .mutation(async ({ ctx, input }) => {
      return exportManuscript(ctx.db, ctx.userId, input.storyId, input.format);
    }),

  createChapter: protectedProcedure
    .input(createChapterSchema)
    .mutation(async ({ ctx, input }) => createChapter(ctx.db, ctx.userId, input)),

  saveChapter: protectedProcedure
    .input(saveChapterSchema)
    .mutation(async ({ ctx, input }) => saveChapter(ctx.db, ctx.userId, input)),

  chapter: protectedProcedure
    .input(z.object({ chapterId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const row = await getChapterForOwner(ctx.db, input.chapterId, ctx.userId);
      const versions = await listChapterVersions(ctx.db, input.chapterId, ctx.userId);
      return { ...row.chapter, story: row.story, versions };
    }),

  versions: protectedProcedure
    .input(z.object({ chapterId: z.string().uuid() }))
    .query(async ({ ctx, input }) => listChapterVersions(ctx.db, input.chapterId, ctx.userId)),

  restoreVersion: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) =>
      restoreChapterVersion(ctx.db, ctx.userId, input.versionId),
    ),

  publishChapter: protectedProcedure
    .input(z.object({ chapterId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => publishChapter(ctx.db, ctx.userId, input.chapterId)),

  unpublishChapter: protectedProcedure
    .input(z.object({ chapterId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => unpublishChapter(ctx.db, ctx.userId, input.chapterId)),

  archiveChapter: protectedProcedure
    .input(z.object({ chapterId: z.string().uuid(), archived: z.boolean() }))
    .mutation(async ({ ctx, input }) =>
      setChapterArchived(ctx.db, ctx.userId, input.chapterId, input.archived),
    ),

  deleteChapter: protectedProcedure
    .input(z.object({ chapterId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => softDeleteChapter(ctx.db, ctx.userId, input.chapterId)),

  restoreChapter: protectedProcedure
    .input(z.object({ chapterId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => restoreChapter(ctx.db, ctx.userId, input.chapterId)),

  duplicateChapter: protectedProcedure
    .input(z.object({ chapterId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => duplicateChapter(ctx.db, ctx.userId, input.chapterId)),

  reorderChapters: protectedProcedure
    .input(
      z.object({
        storyId: z.string().uuid(),
        chapterIds: z.array(z.string().uuid()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      reorderChapters(ctx.db, ctx.userId, input.storyId, input.chapterIds),
    ),
});
