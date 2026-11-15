import { z } from "zod";
import {
  characterSchema,
  ideaSchema,
  locationSchema,
  plotThreadSchema,
  timelineEventSchema,
} from "@plume/shared";
import { protectedProcedure, router } from "../trpc";
import {
  createCharacter,
  createEvent,
  createIdea,
  createLocation,
  createPlot,
  deleteCharacter,
  deleteEvent,
  deleteIdea,
  deleteLocation,
  deletePlot,
  listNarrative,
  savePlan,
  updateCharacter,
  updateEvent,
  updateIdea,
  updateLocation,
  updatePlot,
} from "../../services/narrative";

const idAndStory = z.object({ id: z.string().uuid(), storyId: z.string().uuid() });

export const narrativeRouter = router({
  list: protectedProcedure
    .input(z.object({ storyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => listNarrative(ctx.db, input.storyId, ctx.userId)),

  createCharacter: protectedProcedure
    .input(characterSchema)
    .mutation(async ({ ctx, input }) => createCharacter(ctx.db, ctx.userId, input)),

  updateCharacter: protectedProcedure
    .input(characterSchema.partial().extend(idAndStory.shape))
    .mutation(async ({ ctx, input }) => updateCharacter(ctx.db, ctx.userId, input)),

  deleteCharacter: protectedProcedure
    .input(idAndStory)
    .mutation(async ({ ctx, input }) =>
      deleteCharacter(ctx.db, ctx.userId, input.id, input.storyId),
    ),

  createLocation: protectedProcedure
    .input(locationSchema)
    .mutation(async ({ ctx, input }) => createLocation(ctx.db, ctx.userId, input)),

  updateLocation: protectedProcedure
    .input(locationSchema.partial().extend(idAndStory.shape))
    .mutation(async ({ ctx, input }) => updateLocation(ctx.db, ctx.userId, input)),

  deleteLocation: protectedProcedure
    .input(idAndStory)
    .mutation(async ({ ctx, input }) =>
      deleteLocation(ctx.db, ctx.userId, input.id, input.storyId),
    ),

  createPlot: protectedProcedure
    .input(plotThreadSchema)
    .mutation(async ({ ctx, input }) => createPlot(ctx.db, ctx.userId, input)),

  updatePlot: protectedProcedure
    .input(plotThreadSchema.partial().extend(idAndStory.shape))
    .mutation(async ({ ctx, input }) => updatePlot(ctx.db, ctx.userId, input)),

  deletePlot: protectedProcedure
    .input(idAndStory)
    .mutation(async ({ ctx, input }) =>
      deletePlot(ctx.db, ctx.userId, input.id, input.storyId),
    ),

  createEvent: protectedProcedure
    .input(timelineEventSchema)
    .mutation(async ({ ctx, input }) => createEvent(ctx.db, ctx.userId, input)),

  updateEvent: protectedProcedure
    .input(timelineEventSchema.partial().extend(idAndStory.shape))
    .mutation(async ({ ctx, input }) => updateEvent(ctx.db, ctx.userId, input)),

  deleteEvent: protectedProcedure
    .input(idAndStory)
    .mutation(async ({ ctx, input }) => deleteEvent(ctx.db, ctx.userId, input.id, input.storyId)),

  createIdea: protectedProcedure
    .input(ideaSchema)
    .mutation(async ({ ctx, input }) => createIdea(ctx.db, ctx.userId, input)),

  updateIdea: protectedProcedure
    .input(ideaSchema.partial().extend(idAndStory.shape))
    .mutation(async ({ ctx, input }) => updateIdea(ctx.db, ctx.userId, input)),

  deleteIdea: protectedProcedure
    .input(idAndStory)
    .mutation(async ({ ctx, input }) => deleteIdea(ctx.db, ctx.userId, input.id, input.storyId)),

  savePlan: protectedProcedure
    .input(
      z.object({
        storyId: z.string().uuid(),
        title: z.string().trim().min(1).max(120).default("Plan"),
        structure: z.unknown(),
      }),
    )
    .mutation(async ({ ctx, input }) => savePlan(ctx.db, ctx.userId, input)),
});
