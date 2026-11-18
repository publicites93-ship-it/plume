import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { requireStudioAccess } from "../../services/studio";
import {
  analysisOverview,
  decideProposal,
  listProposals,
  requestChapterAnalysis,
} from "../../services/studioAnalysis";

const studioProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  await requireStudioAccess(ctx.db, ctx.userId);
  return next();
});

export const studioRouter = router({
  /** Analyse d'un chapitre en arrière-plan (sortie de l'éditeur ou bouton du studio). */
  requestAnalysis: studioProcedure
    .input(
      z.object({
        chapterId: z.string().uuid(),
        manual: z.boolean().default(false),
        force: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => requestChapterAnalysis(ctx.db, ctx.userId, input)),

  overview: studioProcedure
    .input(z.object({ storyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => analysisOverview(ctx.db, ctx.userId, input.storyId)),

  proposals: studioProcedure
    .input(z.object({ storyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => listProposals(ctx.db, ctx.userId, input.storyId)),

  decide: studioProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        storyId: z.string().uuid(),
        decision: z.enum(["accept", "reject"]),
      }),
    )
    .mutation(async ({ ctx, input }) => decideProposal(ctx.db, ctx.userId, input)),
});
