import { z } from "zod";
import { analysisRequestSchema } from "@plume/shared";
import { protectedProcedure, router } from "../trpc";
import {
  analysesForChapter,
  analyzeChapter,
  analyzeStory,
  getAnalysis,
  getCoachingSession,
  listAnalyses,
  listCoachingSessions,
  progressDashboard,
  sendCoachingMessage,
  startCoachingSession,
} from "../../services/ai/analysis";

export const aiRouter = router({
  analyzeChapter: protectedProcedure
    .input(analysisRequestSchema)
    .mutation(async ({ ctx, input }) =>
      analyzeChapter(ctx.db, ctx.userId, {
        storyId: input.storyId,
        chapterId: input.chapterId,
        skill: input.skill,
        scope: input.scope,
        selection: input.selection,
      }),
    ),

  analyzeStory: protectedProcedure
    .input(
      z.object({
        storyId: z.string().uuid(),
        chapterId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => analyzeStory(ctx.db, ctx.userId, input)),

  list: protectedProcedure
    .input(
      z.object({
        storyId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => listAnalyses(ctx.db, ctx.userId, input)),

  get: protectedProcedure
    .input(z.object({ analysisId: z.string().uuid() }))
    .query(async ({ ctx, input }) => getAnalysis(ctx.db, input.analysisId, ctx.userId)),

  forChapter: protectedProcedure
    .input(z.object({ chapterId: z.string().uuid() }))
    .query(async ({ ctx, input }) => analysesForChapter(ctx.db, ctx.userId, input.chapterId)),

  progress: protectedProcedure.query(async ({ ctx }) => progressDashboard(ctx.db, ctx.userId)),

  startSession: protectedProcedure
    .input(z.object({ storyId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => startCoachingSession(ctx.db, ctx.userId, input.storyId)),

  sessions: protectedProcedure
    .input(z.object({ storyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => listCoachingSessions(ctx.db, ctx.userId, input.storyId)),

  session: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => getCoachingSession(ctx.db, input.sessionId, ctx.userId)),

  send: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .mutation(async ({ ctx, input }) => sendCoachingMessage(ctx.db, ctx.userId, input)),
});
