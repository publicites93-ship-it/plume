import { z } from "zod";
import { GENRES, CONTENT_WARNINGS } from "../design/tokens";

const genreEnum = z.enum([...GENRES] as [string, ...string[]]);
const warningEnum = z.enum([...CONTENT_WARNINGS] as [string, ...string[]]);

export const emailSchema = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .email("Adresse e-mail invalide.")
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(128, "Le mot de passe est trop long.")
  .refine((value) => /[a-zA-Z]/.test(value) && /[0-9]/.test(value), {
    message: "Le mot de passe doit contenir au moins une lettre et un chiffre.",
  });

export const pseudonymSchema = z
  .string()
  .trim()
  .min(3, "Le pseudonyme doit contenir au moins 3 caractères.")
  .max(32, "Le pseudonyme ne peut pas dépasser 32 caractères.")
  .regex(
    /^[\p{L}\p{N} _.'’-]+$/u,
    "Le pseudonyme contient des caractères non autorisés.",
  );

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  pseudonym: pseudonymSchema,
  acceptedTerms: z.literal(true, {
    message: "Vous devez accepter les conditions d'utilisation.",
  }),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis."),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

export const onboardingSchema = z.object({
  goal: z.enum(["read", "write", "both"]),
  genres: z.array(genreEnum).min(1).max(8),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  skills: z
    .array(
      z.enum([
        "characters",
        "dialogues",
        "tension",
        "descriptions",
        "pacing",
        "structure",
        "foreshadowing",
      ]),
    )
    .max(7),
  notifications: z.object({
    newChapters: z.boolean(),
    comments: z.boolean(),
    coaching: z.boolean(),
    progress: z.boolean(),
  }),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const storyStatusEnum = z.enum([
  "draft",
  "ongoing",
  "completed",
  "paused",
]);
export const storyVisibilityEnum = z.enum(["private", "unlisted", "public"]);
export const audienceEnum = z.enum(["all", "teen", "mature"]);

export const createStorySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Le titre est requis.")
    .max(120, "Le titre ne peut pas dépasser 120 caractères."),
  subtitle: z.string().trim().max(160).optional().nullable(),
  synopsis: z.string().trim().max(4000).optional().nullable(),
  genre: genreEnum.optional().nullable(),
  secondaryGenres: z.array(genreEnum).max(4).optional(),
  keywords: z.array(z.string().trim().min(1).max(32)).max(12).optional(),
  language: z.string().min(2).max(8).default("fr"),
  audience: audienceEnum.default("all"),
  contentWarnings: z.array(warningEnum).max(7).optional(),
  status: storyStatusEnum.default("draft"),
  visibility: storyVisibilityEnum.default("private"),
});

export const updateStorySchema = createStorySchema.partial().extend({
  id: z.string().uuid(),
});

export const chapterStatusEnum = z.enum(["draft", "published", "archived"]);

export const createChapterSchema = z.object({
  storyId: z.string().uuid(),
  title: z.string().trim().min(1).max(160).default("Chapitre sans titre"),
  content: z.string().max(1_000_000).default(""),
});

export const updateChapterMetaSchema = z.object({
  chapterId: z.string().uuid(),
  title: z.string().trim().min(1).max(160).optional(),
  status: chapterStatusEnum.optional(),
});

export const saveChapterSchema = z.object({
  chapterId: z.string().uuid(),
  content: z.string().max(1_000_000),
  /** Version serveur sur laquelle la modification est fondée. */
  baseVersion: z.number().int().nonnegative(),
  /** Identifiant idempotent généré côté client. */
  clientMutationId: z.string().uuid(),
  /** Horodatage local de la dernière frappe (ISO 8601). */
  localUpdatedAt: z.string().datetime(),
  title: z.string().trim().min(1).max(160).optional(),
  reason: z.enum(["autosave", "manual"]).default("autosave"),
  forceSnapshot: z.boolean().default(false),
});

export const reorderChaptersSchema = z.object({
  storyId: z.string().uuid(),
  chapterIds: z.array(z.string().uuid()).min(1),
});

export const storyIdSchema = z.object({ storyId: z.string().uuid() });
export const chapterIdSchema = z.object({ chapterId: z.string().uuid() });

export const characterSchema = z.object({
  storyId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().max(120).optional().nullable(),
  summary: z.string().trim().max(4000).optional().nullable(),
  motivation: z.string().trim().max(2000).optional().nullable(),
  fear: z.string().trim().max(2000).optional().nullable(),
  secret: z.string().trim().max(2000).optional().nullable(),
  arc: z.string().trim().max(2000).optional().nullable(),
  notes: z.string().trim().max(8000).optional().nullable(),
  customFields: z
    .array(z.object({ label: z.string().max(60), value: z.string().max(2000) }))
    .max(20)
    .optional(),
});

export const locationSchema = z.object({
  storyId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(8000).optional().nullable(),
  atmosphere: z.string().trim().max(2000).optional().nullable(),
  history: z.string().trim().max(4000).optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
});

export const plotThreadSchema = z.object({
  storyId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(8000).optional().nullable(),
  stakes: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["planned", "active", "resolved", "abandoned"]).default("planned"),
  resolution: z.string().trim().max(2000).optional().nullable(),
});

export const timelineEventSchema = z.object({
  storyId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).optional().nullable(),
  fictionalDate: z.string().trim().max(80).optional().nullable(),
  narrativeOrder: z.number().int().min(0).default(0),
  chapterId: z.string().uuid().optional().nullable(),
  consequences: z.string().trim().max(2000).optional().nullable(),
});

export const ideaSchema = z.object({
  storyId: z.string().uuid(),
  content: z.string().trim().min(1).max(4000),
  kind: z.enum(["scene", "dialogue", "character", "revelation", "research", "note"]).default("note"),
});

export const analysisRequestSchema = z.object({
  storyId: z.string().uuid(),
  chapterId: z.string().uuid().optional(),
  skill: z.enum([
    "characters",
    "dialogues",
    "tension",
    "descriptions",
    "pacing",
    "structure",
    "foreshadowing",
  ]),
  scope: z.enum(["chapter", "selection"]).default("chapter"),
  selection: z.string().max(20_000).optional(),
});

export const readingProgressSchema = z.object({
  storyId: z.string().uuid(),
  chapterId: z.string().uuid(),
  progress: z.number().min(0).max(1),
});

export const readingListSchema = z.object({
  name: z.string().trim().min(1).max(60),
  storyIds: z.array(z.string().uuid()).max(200).default([]),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type CreateStoryInput = z.infer<typeof createStorySchema>;
export type UpdateStoryInput = z.infer<typeof updateStorySchema>;
export type SaveChapterInput = z.infer<typeof saveChapterSchema>;
export type AnalysisRequestInput = z.infer<typeof analysisRequestSchema>;
