import { z } from "zod";
import { SKILLS, WORKSHOPS, WORKSHOP_BY_SLUG } from "@plume/shared";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../trpc";
import {
  listExerciseAttempts,
  progressDashboard,
  reviewExerciseAttempt,
} from "../../services/ai/analysis";

export const learningRouter = router({
  skills: publicProcedure.query(() => ({
    skills: SKILLS,
    workshops: WORKSHOPS.map((workshop) => ({
      slug: workshop.slug,
      skillId: workshop.skillId,
      title: workshop.title,
      subtitle: workshop.subtitle,
      exerciseCount: workshop.exercises.length,
    })),
  })),

  workshop: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(80) }))
    .query(({ input }) => {
      const workshop = WORKSHOP_BY_SLUG[input.slug];
      if (!workshop) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Atelier introuvable." });
      }
      return workshop;
    }),

  progress: protectedProcedure.query(async ({ ctx }) => progressDashboard(ctx.db, ctx.userId)),

  saveExerciseAttempt: protectedProcedure
    .input(
      z.object({
        exerciseId: z.string().min(1).max(120),
        storyId: z.string().uuid().optional(),
        content: z.string().max(20_000).default(""),
        status: z.enum(["started", "completed"]).default("started"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { exerciseAttempts } = await import("../../db/schema");
      const [row] = await ctx.db
        .insert(exerciseAttempts)
        .values({
          userId: ctx.userId,
          exerciseId: input.exerciseId,
          storyId: input.storyId ?? null,
          content: input.content,
          status: input.status,
        })
        .returning();
      return row;
    }),

  reviewExercise: protectedProcedure
    .input(
      z.object({
        exerciseId: z.string().min(1).max(120),
        content: z.string().trim().min(1).max(20_000),
        storyId: z.string().uuid().optional(),
        attemptId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => reviewExerciseAttempt(ctx.db, ctx.userId, input)),

  exerciseAttempts: protectedProcedure
    .input(
      z.object({
        exerciseId: z.string().min(1).max(120).optional(),
        limit: z.number().int().min(1).max(30).default(10),
      }),
    )
    .query(async ({ ctx, input }) => listExerciseAttempts(ctx.db, ctx.userId, input)),
});
