import { and, count, eq, gte, isNull, ne, sql, sum } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { Database } from "../db/client";
import { AI_TASK_ESTIMATES, PLANS, type AiTaskKind, type PlanId } from "@plume/shared";
import { aiUsageRecords, chapters, stories, users } from "../db/schema";

export interface PlanSummary {
  plan: PlanId;
  planName: string;
  planExpiresAt: string | null;
  tokensUsed: number;
  tokensLimit: number;
  tokensRemaining: number;
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
    tokensUsedThisMonth(db, userId),
    countActiveStories(db, userId),
    countChaptersThisWeek(db, userId),
  ]);
  return {
    plan: planId,
    planName: plan.name,
    planExpiresAt: user.planExpiresAt?.toISOString() ?? null,
    tokensUsed: used,
    tokensLimit: plan.aiTokensPerMonth,
    tokensRemaining: Math.max(0, plan.aiTokensPerMonth - used),
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
): Promise<{ estimatedTokens: number; used: number; limit: number }> {
  const [user] = await db
    .select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Compte introuvable." });
  const plan = PLANS[effectivePlan(user)];
  const estimated = AI_TASK_ESTIMATES[task];
  const used = await tokensUsedThisMonth(db, userId);
  if (used + estimated > plan.aiTokensPerMonth) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Votre enveloppe IA de ${plan.aiTokensPerMonth.toLocaleString(
        "fr-FR",
      )} tokens est presque épuisée (${used.toLocaleString("fr-FR")} utilisés). Elle se renouvellera le 1er du mois.`,
      cause: {
        details: {
          code: "QUOTA_EXCEEDED",
          used,
          limit: plan.aiTokensPerMonth,
          estimated,
          plan: plan.id,
          upgrade: plan.id === "free" ? "plus" : "premium",
        },
      },
    });
  }
  return { estimatedTokens: estimated, used, limit: plan.aiTokensPerMonth };
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
    estimatedCostMicros: input.estimatedCostMicros ?? 0,
  });
}

export async function totalTokensForUser(db: Database, userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sum(aiUsageRecords.inputTokens) })
    .from(aiUsageRecords)
    .where(eq(aiUsageRecords.userId, userId));
  return Number(row?.total ?? 0);
}
