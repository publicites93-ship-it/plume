import { and, count, eq, gte, isNull, ne, sql, sum } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { Database } from "../db/client";
import {
  AI_TASK_CREDITS,
  AI_TASK_ESTIMATES,
  AI_TASK_KINDS,
  PLANS,
  type AiTaskKind,
  type PlanId,
} from "@plume/shared";
import { aiUsageRecords, chapters, stories, users } from "../db/schema";

export interface PlanSummary {
  plan: PlanId;
  planName: string;
  planExpiresAt: string | null;
  /**
   * Unité de quota présentée à l'auteur. Le coût réel en tokens du fournisseur
   * reste suivi séparément dans ai_usage_records.
   */
  creditsUsed: number;
  creditsLimit: number;
  creditsRemaining: number;
  activeStories: number;
  activeStoriesLimit: number;
  chaptersThisWeek: number;
  chaptersPerWeekLimit: number;
  multiChapterAnalyses: boolean;
  narrativeMemory: boolean;
  versionComparisons: boolean;
}

export function effectivePlan(user: {
  plan: PlanId;
  planExpiresAt: Date | null;
}): PlanId {
  if (user.plan !== "free" && user.planExpiresAt && user.planExpiresAt.getTime() < Date.now()) {
    return "free";
  }
  return user.plan;
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function startOfWeek(): Date {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

export async function tokensUsedThisMonth(db: Database, userId: string): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${aiUsageRecords.inputTokens} + ${aiUsageRecords.outputTokens}), 0)`,
    })
    .from(aiUsageRecords)
    .where(and(eq(aiUsageRecords.userId, userId), gte(aiUsageRecords.createdAt, startOfMonth())));
  return Number(row?.total ?? 0);
}

/** Crédits consommés ce mois-ci : somme du coût en crédits de chaque action enregistrée. */
export async function creditsUsedThisMonth(db: Database, userId: string): Promise<number> {
  const rows = await db
    .select({ taskKind: aiUsageRecords.taskKind, total: count() })
    .from(aiUsageRecords)
    .where(and(eq(aiUsageRecords.userId, userId), gte(aiUsageRecords.createdAt, startOfMonth())))
    .groupBy(aiUsageRecords.taskKind);
  return rows.reduce((sumCredits, row) => {
    // Les fonctions du Studio ont leurs propres quotas (plan_limits) : hors crédits du coach.
    if (row.taskKind.startsWith("studio_")) return sumCredits;
    const kind = (AI_TASK_KINDS as readonly string[]).includes(row.taskKind)
      ? (row.taskKind as AiTaskKind)
      : null;
    // Une tâche inconnue compte 1 crédit : le quota ne doit jamais être contourné.
    return sumCredits + Number(row.total) * (kind ? AI_TASK_CREDITS[kind] : 1);
  }, 0);
}

export async function countActiveStories(db: Database, userId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(stories)
    .where(
      and(
        eq(stories.authorId, userId),
        isNull(stories.deletedAt),
        ne(stories.status, "completed"),
      ),
    );
  return Number(row?.total ?? 0);
}

export async function countChaptersThisWeek(db: Database, userId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(chapters)
    .innerJoin(stories, eq(stories.id, chapters.storyId))
    .where(
      and(
        eq(stories.authorId, userId),
        isNull(chapters.deletedAt),
        gte(chapters.createdAt, startOfWeek()),
      ),
    );
  return Number(row?.total ?? 0);
}

export async function getPlanSummary(db: Database, userId: string): Promise<PlanSummary> {
  const [user] = await db
    .select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Compte introuvable." });
  }
  const planId = effectivePlan(user);
  const plan = PLANS[planId];
  const [used, activeStories, chaptersThisWeek] = await Promise.all([
    creditsUsedThisMonth(db, userId),
    countActiveStories(db, userId),
    countChaptersThisWeek(db, userId),
  ]);
  return {
    plan: planId,
    planName: plan.name,
    planExpiresAt: user.planExpiresAt?.toISOString() ?? null,
    creditsUsed: used,
    creditsLimit: plan.aiCreditsPerMonth,
    creditsRemaining: Math.max(0, plan.aiCreditsPerMonth - used),
    activeStories,
    activeStoriesLimit: plan.activeStories,
    chaptersThisWeek,
    chaptersPerWeekLimit: plan.chaptersPerWeek,
    multiChapterAnalyses: plan.multiChapterAnalyses,
    narrativeMemory: plan.narrativeMemory,
    versionComparisons: plan.versionComparisons,
  };
}

export async function assertCanCreateStory(db: Database, userId: string): Promise<void> {
  const [user] = await db
    .select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Compte introuvable." });
  const plan = PLANS[effectivePlan(user)];
  const active = await countActiveStories(db, userId);
  if (active >= plan.activeStories) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Votre formule ${plan.name} permet ${plan.activeStories} histoire${
        plan.activeStories > 1 ? "s" : ""
      } active${plan.activeStories > 1 ? "s" : ""}. Terminez ou archivez une histoire, ou découvrez Plume+.`,
      cause: {
        details: {
          code: "PLAN_LIMIT",
          limit: plan.activeStories,
          used: active,
          upgrade: plan.id === "free" ? "plus" : "premium",
        },
      },
    });
  }
}

export async function assertCanCreateChapter(db: Database, userId: string): Promise<void> {
  const [user] = await db
    .select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Compte introuvable." });
  const plan = PLANS[effectivePlan(user)];
  const used = await countChaptersThisWeek(db, userId);
  if (used >= plan.chaptersPerWeek) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Votre formule ${plan.name} permet ${plan.chaptersPerWeek} nouveaux chapitres par semaine. Vos manuscrits existants restent intacts.`,
      cause: {
        details: {
          code: "PLAN_LIMIT",
          limit: plan.chaptersPerWeek,
          used,
          upgrade: "plus",
        },
      },
    });
  }
}

export async function assertAiQuota(
  db: Database,
  userId: string,
  task: AiTaskKind,
): Promise<{ estimatedTokens: number; used: number; limit: number; plan: PlanId }> {
  const [user] = await db
    .select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Compte introuvable." });
  const plan = PLANS[effectivePlan(user)];
  const cost = AI_TASK_CREDITS[task];
  const used = await creditsUsedThisMonth(db, userId);
  const limit = plan.aiCreditsPerMonth;
  if (used + cost > limit) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Vous avez utilisé vos ${limit} crédit${limit > 1 ? "s" : ""} coach ce mois-ci. Ils se renouvelleront le 1er du mois${
        plan.id === "premium" ? "." : ", ou dès maintenant avec une formule supérieure."
      }`,
      cause: {
        details: {
          code: "QUOTA_EXCEEDED",
          used,
          limit,
          cost,
          plan: plan.id,
          upgrade: plan.id === "free" ? "plus" : plan.id === "plus" ? "premium" : null,
        },
      },
    });
  }
  return { estimatedTokens: AI_TASK_ESTIMATES[task], used, limit, plan: plan.id };
}

/**
 * Coût fournisseur estimé en micro-dollars, pour suivre la rentabilité.
 * Tarifs publics par million de tokens (entrée / sortie), relevés en novembre 2026.
 */
const MODEL_PRICES_PER_MTOK: Record<string, [number, number]> = {
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
  "gemini-3.8-flash": [0.75, 3.75],
};

export function estimateCostMicros(model: string, inputTokens: number, outputTokens: number): number {
  if (!hasModelPrice(model)) return 0;
  const price = MODEL_PRICES_PER_MTOK[model];
  if (!price) return 0;
  return Math.round(inputTokens * price[0] + outputTokens * price[1]);
}

export function hasModelPrice(model: string): boolean {
  return Object.hasOwn(MODEL_PRICES_PER_MTOK, model);
}

export async function recordAiUsage(
  db: Database,
  input: {
    userId: string;
    storyId?: string | null;
    analysisId?: string | null;
    taskKind: string;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    estimatedCostMicros?: number;
  },
): Promise<void> {
  await db.insert(aiUsageRecords).values({
    userId: input.userId,
    storyId: input.storyId ?? null,
    analysisId: input.analysisId ?? null,
    taskKind: input.taskKind,
    provider: input.provider,
    model: input.model,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    estimatedCostMicros:
      input.estimatedCostMicros ?? estimateCostMicros(input.model, input.inputTokens, input.outputTokens),
  });
}

export async function totalTokensForUser(db: Database, userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sum(aiUsageRecords.inputTokens) })
    .from(aiUsageRecords)
    .where(eq(aiUsageRecords.userId, userId));
  return Number(row?.total ?? 0);
}
