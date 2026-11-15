import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  emailSchema,
  onboardingSchema,
  passwordSchema,
  pseudonymSchema,
  signInSchema,
  signUpSchema,
} from "@plume/shared";
import {
  authenticateUser,
  registerUser,
  revokeAllSessions,
  revokeRefreshToken,
  rotateRefreshToken,
} from "../../auth/service";
import { hashPassword, verifyPassword } from "../../auth/password";
import {
  aiAnalyses,
  analysisFindings,
  auditEvents,
  chapters,
  characters,
  locations,
  plotThreads,
  profiles,
  stories,
  storyIdeas,
  timelineEvents,
  userPreferences,
  users,
} from "../../db/schema";
import { getPlanSummary } from "../../services/plans";
import {
  FixedWindowLimiter,
  protectedProcedure,
  publicProcedure,
  router,
} from "../trpc";

const authLimiter = new FixedWindowLimiter(20, 15 * 60 * 1000);
const refreshLimiter = new FixedWindowLimiter(60, 15 * 60 * 1000);

function rateLimit(limiter: FixedWindowLimiter, key: string, message: string) {
  if (!limiter.check(key)) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message });
  }
}

async function loadMe(db: Parameters<typeof getPlanSummary>[0], userId: string) {
  const [row] = await db
    .select({ user: users, profile: profiles, preferences: userPreferences })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(userPreferences, eq(userPreferences.userId, users.id))
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Compte introuvable." });
  }
  const planSummary = await getPlanSummary(db, userId);
  return {
    user: {
      id: row.user.id,
      email: row.user.email,
      role: row.user.role,
      emailVerified: Boolean(row.user.emailVerifiedAt),
      createdAt: row.user.createdAt.toISOString(),
    },
    profile: {
      pseudonym: row.profile.pseudonym,
      bio: row.profile.bio,
      avatarMotif: row.profile.avatarMotif,
      goal: row.profile.goal,
      experience: row.profile.experience,
      genres: row.profile.genres,
      skills: row.profile.skills,
      onboardingCompleted: Boolean(row.profile.onboardingCompletedAt),
    },
    preferences: {
      notifications: row.preferences?.notifications ?? {
        newChapters: true,
        comments: true,
        coaching: true,
        progress: true,
      },
      readingTheme: row.preferences?.readingTheme ?? "night",
      writingTheme: row.preferences?.writingTheme ?? "night",
      fontScale: row.preferences?.fontScale ?? 1,
      reduceMotion: row.preferences?.reduceMotion ?? false,
    },
    plan: planSummary,
  };
}

export const authRouter = router({
  signUp: publicProcedure.input(signUpSchema).mutation(async ({ ctx, input }) => {
    rateLimit(authLimiter, `signup:${ctx.ip ?? "unknown"}`, "Trop de tentatives. Réessayez dans quelques minutes.");
    const { userId, tokens } = await registerUser(ctx.db, input);
    return { userId, tokens };
  }),

  signIn: publicProcedure.input(signInSchema).mutation(async ({ ctx, input }) => {
    rateLimit(authLimiter, `signin:${ctx.ip ?? "unknown"}`, "Trop de tentatives. Réessayez dans quelques minutes.");
    const { userId, tokens } = await authenticateUser(ctx.db, input);
    return { userId, tokens };
  }),

  refresh: publicProcedure
    .input(z.object({ refreshToken: z.string().min(20) }))
    .mutation(async ({ ctx, input }) => {
      rateLimit(refreshLimiter, `refresh:${ctx.ip ?? "unknown"}`, "Trop de demandes de session.");
      const tokens = await rotateRefreshToken(ctx.db, input.refreshToken);
      return { tokens };
    }),

  logout: publicProcedure
    .input(z.object({ refreshToken: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (input.refreshToken) await revokeRefreshToken(ctx.db, input.refreshToken);
      return { ok: true };
    }),

  me: protectedProcedure.query(async ({ ctx }) => loadMe(ctx.db, ctx.userId)),

  updateProfile: protectedProcedure
    .input(
      z.object({
        pseudonym: pseudonymSchema.optional(),
        bio: z.string().trim().max(600).optional(),
        avatarMotif: z.enum(["quill", "rose", "moon", "arch", "castle", "owl"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.pseudonym) {
        const [existing] = await ctx.db
          .select({ id: profiles.id })
          .from(profiles)
          .where(
            and(
              sql`lower(${profiles.pseudonym}) = lower(${input.pseudonym})`,
              sql`${profiles.userId} <> ${ctx.userId}`,
            ),
          )
          .limit(1);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Ce pseudonyme est déjà utilisé.",
          });
        }
      }
      const values: Record<string, unknown> = { updatedAt: new Date() };
      if (input.pseudonym !== undefined) values.pseudonym = input.pseudonym;
      if (input.bio !== undefined) values.bio = input.bio;
      if (input.avatarMotif !== undefined) values.avatarMotif = input.avatarMotif;
      await ctx.db.update(profiles).set(values).where(eq(profiles.userId, ctx.userId));
      return loadMe(ctx.db, ctx.userId);
    }),

  completeOnboarding: protectedProcedure
    .input(onboardingSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(profiles)
        .set({
          goal: input.goal,
          experience: input.experience,
          genres: input.genres,
          skills: input.skills,
          onboardingCompletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(profiles.userId, ctx.userId));
      await ctx.db
        .update(userPreferences)
        .set({ notifications: input.notifications, updatedAt: new Date() })
        .where(eq(userPreferences.userId, ctx.userId));
      return loadMe(ctx.db, ctx.userId);
    }),

  updatePreferences: protectedProcedure
    .input(
      z.object({
        readingTheme: z.enum(["night", "sepia", "ivory"]).optional(),
        writingTheme: z.enum(["night", "sepia", "ivory"]).optional(),
        fontScale: z.number().min(0.8).max(1.6).optional(),
        reduceMotion: z.boolean().optional(),
        notifications: z
          .object({
            newChapters: z.boolean(),
            comments: z.boolean(),
            coaching: z.boolean(),
            progress: z.boolean(),
          })
          .partial()
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const values: Record<string, unknown> = { updatedAt: new Date() };
      if (input.readingTheme) values.readingTheme = input.readingTheme;
      if (input.writingTheme) values.writingTheme = input.writingTheme;
      if (input.fontScale !== undefined) values.fontScale = input.fontScale;
      if (input.reduceMotion !== undefined) values.reduceMotion = input.reduceMotion;
      if (input.notifications) {
        const [prefs] = await ctx.db
          .select()
          .from(userPreferences)
          .where(eq(userPreferences.userId, ctx.userId))
          .limit(1);
        values.notifications = { ...(prefs?.notifications ?? {}), ...input.notifications };
      }
      await ctx.db
        .update(userPreferences)
        .set(values)
        .where(eq(userPreferences.userId, ctx.userId));
      return loadMe(ctx.db, ctx.userId);
    }),

  changePassword: protectedProcedure
    .input(z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema }))
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, ctx.userId))
        .limit(1);
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Compte introuvable." });
      const valid = await verifyPassword(input.currentPassword, user.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Le mot de passe actuel est incorrect.",
        });
      }
      const passwordHash = await hashPassword(input.newPassword);
      await ctx.db.update(users).set({ passwordHash }).where(eq(users.id, ctx.userId));
      await revokeAllSessions(ctx.db, ctx.userId);
      return { ok: true, message: "Mot de passe modifié. Reconnectez-vous sur vos autres appareils." };
    }),

  deleteAccount: protectedProcedure
    .input(z.object({ password: z.string().min(1), confirmation: z.literal("SUPPRIMER") }))
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, ctx.userId))
        .limit(1);
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Compte introuvable." });
      const valid = await verifyPassword(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Mot de passe incorrect. La suppression n'a pas été effectuée.",
        });
      }
      await ctx.db.insert(auditEvents).values({
        actorId: ctx.userId,
        action: "account.deleted",
        targetType: "user",
        targetId: ctx.userId,
        metadata: { selfService: true },
      });
      // Suppression réelle : les manuscrits privés, chapitres, versions et
      // analyses sont supprimés en cascade (RGPD — droit à l'effacement).
      await ctx.db.delete(users).where(eq(users.id, ctx.userId));
      return { ok: true };
    }),

  exportData: protectedProcedure.mutation(async ({ ctx }) => {
    const me = await loadMe(ctx.db, ctx.userId);
    const storyRows = await ctx.db
      .select()
      .from(stories)
      .where(eq(stories.authorId, ctx.userId))
      .orderBy(desc(stories.updatedAt));
    const storyIds = storyRows.map((s) => s.id);
    const chapterRows = storyIds.length
      ? await ctx.db
          .select()
          .from(chapters)
          .where(inArray(chapters.storyId, storyIds))
      : [];
    const characterRows = storyIds.length
      ? await ctx.db.select().from(characters).where(inArray(characters.storyId, storyIds))
      : [];
    const locationRows = storyIds.length
      ? await ctx.db.select().from(locations).where(inArray(locations.storyId, storyIds))
      : [];
    const plotRows = storyIds.length
      ? await ctx.db.select().from(plotThreads).where(inArray(plotThreads.storyId, storyIds))
      : [];
    const eventRows = storyIds.length
      ? await ctx.db.select().from(timelineEvents).where(inArray(timelineEvents.storyId, storyIds))
      : [];
    const ideaRows = storyIds.length
      ? await ctx.db.select().from(storyIdeas).where(inArray(storyIdeas.storyId, storyIds))
      : [];
    const analysisRows = await ctx.db
      .select()
      .from(aiAnalyses)
      .where(eq(aiAnalyses.userId, ctx.userId));
    const analysisIds = analysisRows.map((a) => a.id);
    const findingRows = analysisIds.length
      ? await ctx.db
          .select()
          .from(analysisFindings)
          .where(inArray(analysisFindings.analysisId, analysisIds))
      : [];
    return {
      exportedAt: new Date().toISOString(),
      formatVersion: 1,
      account: me,
      stories: storyRows,
      chapters: chapterRows,
      narrative: {
        characters: characterRows,
        locations: locationRows,
        plots: plotRows,
        events: eventRows,
        ideas: ideaRows,
      },
      analyses: analysisRows,
      findings: findingRows,
    };
  }),

  resendVerification: protectedProcedure.mutation(async () => {
    throw new TRPCError({
      code: "NOT_IMPLEMENTED",
      message:
        "La vérification d'e-mail nécessite un fournisseur d'envoi (non configuré dans cette version).",
    });
  }),

  requestPasswordReset: publicProcedure
    .input(z.object({ email: emailSchema }))
    .mutation(async () => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message:
          "La réinitialisation par e-mail nécessite un fournisseur d'envoi (non configuré dans cette version). Contactez le support.",
      });
    }),
});

export type AuthRouter = typeof authRouter;
