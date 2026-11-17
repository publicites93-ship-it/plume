import { z } from "zod";
import {
  characterRelationSchema,
  characterSchema,
  RELATION_KIND_IDS,
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
import {
  addMedia,
  createRelation,
  deleteRelation,
  removeMedia,
  requireStudioAccess,
  updateRelation,
} from "../../services/studio";

/** Studio d'écriture : réservé aux profils « Écrire » et « Écrire et lire ». */
const studioProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  await requireStudioAccess(ctx.db, ctx.userId);
  return next();
});

const idAndStory = z.object({ id: z.string().uuid(), storyId: z.string().uuid() });

export const narrativeRouter = router({
  list: studioProcedure
    .input(z.object({ storyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => listNarrative(ctx.db, input.storyId, ctx.userId)),

  createCharacter: studioProcedure
    .input(characterSchema)
    .mutation(async ({ ctx, input }) => createCharacter(ctx.db, ctx.userId, input)),

  updateCharacter: studioProcedure
    .input(characterSchema.partial().extend(idAndStory.shape))
    .mutation(async ({ ctx, input }) => updateCharacter(ctx.db, ctx.userId, input)),

  deleteCharacter: studioProcedure
    .input(idAndStory)
    .mutation(async ({ ctx, input }) =>
      deleteCharacter(ctx.db, ctx.userId, input.id, input.storyId),
    ),

  createLocation: studioProcedure
    .input(locationSchema)
    .mutation(async ({ ctx, input }) => createLocation(ctx.db, ctx.userId, input)),

  updateLocation: studioProcedure
    .input(locationSchema.partial().extend(idAndStory.shape))
    .mutation(async ({ ctx, input }) => updateLocation(ctx.db, ctx.userId, input)),

  deleteLocation: studioProcedure
    .input(idAndStory)
    .mutation(async ({ ctx, input }) =>
      deleteLocation(ctx.db, ctx.userId, input.id, input.storyId),
    ),

  createPlot: studioProcedure
    .input(plotThreadSchema)
    .mutation(async ({ ctx, input }) => createPlot(ctx.db, ctx.userId, input)),

  updatePlot: studioProcedure
    .input(plotThreadSchema.partial().extend(idAndStory.shape))
    .mutation(async ({ ctx, input }) => updatePlot(ctx.db, ctx.userId, input)),

  deletePlot: studioProcedure
    .input(idAndStory)
    .mutation(async ({ ctx, input }) =>
      deletePlot(ctx.db, ctx.userId, input.id, input.storyId),
    ),

  createEvent: studioProcedure
    .input(timelineEventSchema)
    .mutation(async ({ ctx, input }) => createEvent(ctx.db, ctx.userId, input)),

  updateEvent: studioProcedure
    .input(timelineEventSchema.partial().extend(idAndStory.shape))
    .mutation(async ({ ctx, input }) => updateEvent(ctx.db, ctx.userId, input)),

  deleteEvent: studioProcedure
    .input(idAndStory)
    .mutation(async ({ ctx, input }) => deleteEvent(ctx.db, ctx.userId, input.id, input.storyId)),

  createIdea: studioProcedure
    .input(ideaSchema)
    .mutation(async ({ ctx, input }) => createIdea(ctx.db, ctx.userId, input)),

  updateIdea: studioProcedure
    .input(ideaSchema.partial().extend(idAndStory.shape))
    .mutation(async ({ ctx, input }) => updateIdea(ctx.db, ctx.userId, input)),

  deleteIdea: studioProcedure
    .input(idAndStory)
    .mutation(async ({ ctx, input }) => deleteIdea(ctx.db, ctx.userId, input.id, input.storyId)),

  savePlan: studioProcedure
    .input(
      z.object({
        storyId: z.string().uuid(),
        title: z.string().trim().min(1).max(120).default("Plan"),
        structure: z.unknown(),
      }),
    )
    .mutation(async ({ ctx, input }) => savePlan(ctx.db, ctx.userId, input)),

  createRelation: studioProcedure
    .input(characterRelationSchema)
    .mutation(async ({ ctx, input }) => createRelation(ctx.db, ctx.userId, input)),

  updateRelation: studioProcedure
    .input(
      idAndStory.extend({
        kind: z.enum(RELATION_KIND_IDS).optional(),
        description: z.string().trim().max(2000).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => updateRelation(ctx.db, ctx.userId, input)),

  deleteRelation: studioProcedure
    .input(idAndStory)
    .mutation(async ({ ctx, input }) => deleteRelation(ctx.db, ctx.userId, input.id, input.storyId)),

  addMedia: studioProcedure
    .input(
      z.object({
        storyId: z.string().uuid(),
        entityType: z.enum(["character", "location"]),
        entityId: z.string().uuid(),
        // ~300 Ko une fois décodée ; contrôle fin dans le service.
        imageBase64: z.string().min(100).max(420_000),
      }),
    )
    .mutation(async ({ ctx, input }) => addMedia(ctx.db, ctx.userId, input)),

  removeMedia: studioProcedure
    .input(idAndStory)
    .mutation(async ({ ctx, input }) => removeMedia(ctx.db, ctx.userId, input.id, input.storyId)),
});
