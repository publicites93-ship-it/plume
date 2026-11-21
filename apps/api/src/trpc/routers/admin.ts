import { and, count, eq, gte, lt, sql, sum } from "drizzle-orm";
import { aiUsageRecords as usage, claudeReservations as ledger, users } from "../../db/schema";
import { PLANS } from "@plume/shared";
import { getConfig } from "../../config";
import { hasModelPrice } from "../../services/plans";
import { adminProcedure, router } from "../trpc";

// Registre des usages enregistrés, distinct des factures du fournisseur.
export const adminRouter = router({
  aiCosts: adminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const groups = await ctx.db.select({
      task: usage.taskKind, provider: usage.provider, model: usage.model,
      entries: count(), input: sum(usage.inputTokens), output: sum(usage.outputTokens),
      micros: sum(usage.estimatedCostMicros),
      zeroEntries: sql<number>`count(*) filter (where ${usage.estimatedCostMicros} = 0)`.mapWith(Number),
    }).from(usage).where(and(gte(usage.createdAt, start), lt(usage.createdAt, now)))
      .groupBy(usage.taskKind, usage.provider, usage.model)
      .orderBy(usage.taskKind, usage.provider, usage.model);
    const rows = groups.map(g => {
      const unknown = g.provider !== "mock" && !hasModelPrice(g.model) ? g.zeroEntries : 0;
      return { task: g.task, provider: g.provider, model: g.model, entries: g.entries,
        inputTokens: Number(g.input), outputTokens: Number(g.output), unknownEntries: unknown,
        knownSubtotalMicros: Number(g.micros), estimatedTotalMicros: unknown ? null : Number(g.micros) };
    });
    const unknownEntries = rows.reduce((n, row) => n + row.unknownEntries, 0);
    const knownSubtotalMicros = rows.reduce((n, row) => n + row.knownSubtotalMicros, 0);
    // Par formule ACTUELLE du compte (la formule au moment de l'appel n'est pas enregistrée).
    const planGroups = await ctx.db.select({
      plan: users.plan, provider: usage.provider, model: usage.model,
      accounts: sql<number>`count(distinct ${usage.userId})`.mapWith(Number), entries: count(), micros: sum(usage.estimatedCostMicros),
      zeroEntries: sql<number>`count(*) filter (where ${usage.estimatedCostMicros} = 0)`.mapWith(Number),
    }).from(usage).innerJoin(users, eq(users.id, usage.userId))
      .where(and(gte(usage.createdAt, start), lt(usage.createdAt, now)))
      .groupBy(users.plan, usage.provider, usage.model);
    const accountsByPlan = await ctx.db.select({ plan: users.plan, accounts: sql<number>`count(distinct ${usage.userId})`.mapWith(Number) })
      .from(usage).innerJoin(users, eq(users.id, usage.userId))
      .where(and(gte(usage.createdAt, start), lt(usage.createdAt, now))).groupBy(users.plan);
    const byPlan = (["free", "plus", "premium"] as const).map(plan => {
      const own = planGroups.filter(g => g.plan === plan);
      const unknownEntries = own.reduce((n, g) => n + (g.provider !== "mock" && !hasModelPrice(g.model) ? g.zeroEntries : 0), 0);
      const knownSubtotalMicros = own.reduce((n, g) => n + Number(g.micros), 0);
      const accounts = accountsByPlan.find(a => a.plan === plan)?.accounts ?? 0;
      return { plan, priceCents: PLANS[plan].priceCents, accounts, entries: own.reduce((n, g) => n + g.entries, 0),
        unknownEntries, knownSubtotalMicros,
        averagePerAccountMicros: accounts && !unknownEntries ? Math.round(knownSubtotalMicros / accounts) : null };
    });
    const [bucket] = await ctx.db.select({ entries: count(), reserved: sum(ledger.reservedMicros), settled: sum(ledger.settledMicros),
      open: sql<number>`count(*) filter (where ${ledger.settledMicros} is null)`.mapWith(Number),
      pending: sql<number>`coalesce(sum(${ledger.reservedMicros}) filter (where ${ledger.settledMicros} is null), 0)`.mapWith(Number),
    }).from(ledger).where(eq(ledger.month, start.toISOString().slice(0, 7)));
    const settledMicros = Number(bucket?.settled ?? 0), pendingMicros = bucket?.pending ?? 0;
    const claudeBudget = { entries: bucket?.entries ?? 0, reservedMicros: Number(bucket?.reserved ?? 0),
      settledMicros, pendingMicros, openEntries: bucket?.open ?? 0, committedMicros: settledMicros + pendingMicros,
      capPerAccountMicros: getConfig().CLAUDE_USER_MONTHLY_CAP_MICROS ?? null };
    return { claudeBudget, byPlan, from: start.toISOString(), until: now.toISOString(), currency: "USD" as const,
      knownSubtotalMicros, unknownEntries, estimatedTotalMicros: unknownEntries ? null : knownSubtotalMicros, rows };
  }),
});
