import { afterAll, beforeAll, expect, it } from "vitest";
import { appRouter } from "../src/trpc/router";
import { aiUsageRecords, claudeReservations } from "../src/db/schema";
import { publicCaller, registerUser, setupDatabase, teardown, type TestContext, type TestUser } from "./helpers";

let ctx: TestContext, user: TestUser;
beforeAll(async () => { ctx = await setupDatabase(); user = await registerUser(ctx.db); });
afterAll(async () => { await teardown(ctx); });

it("réserve les agrégats à l'administration", async () => {
  await expect(publicCaller(ctx.db).admin.aiCosts()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  await expect(user.caller.admin.aiCosts()).rejects.toMatchObject({ code: "FORBIDDEN" });
});

it("compte le budget engagé sans additionner deux fois les provisions ajustées", async () => {
  const base = { userId: user.userId, month: new Date().toISOString().slice(0, 7), model: "claude-sonnet-5-5", reservedMicros: 1000 };
  await ctx.db.insert(claudeReservations).values([base, { ...base, settledMicros: 125 }, { ...base, settledMicros: 0 }, { ...base, month: "2000-01" }]);
  const report = await appRouter.createCaller({ db: ctx.db, role: "admin", userId: user.userId }).admin.aiCosts();
  expect(report.claudeBudget).toMatchObject({ entries: 3, reservedMicros: 3000, settledMicros: 125, pendingMicros: 1000, openEntries: 1, committedMicros: 1125 });
});

it("distingue simulation, coût connu et estimation incomplète sur le mois UTC", async () => {
  const base = { userId: user.userId, taskKind: "coach_chat", inputTokens: 10, outputTokens: 5 };
  await ctx.db.insert(aiUsageRecords).values([
    { ...base, provider: "anthropic", model: "claude-sonnet-5-5", estimatedCostMicros: 70 },
    { ...base, provider: "anthropic", model: "inconnu" },
    { ...base, provider: "mock", model: "simulation" },
    { ...base, provider: "anthropic", model: "ancien", createdAt: new Date("2001-01-01Z") },
  ]);
  const report = await appRouter.createCaller({ db: ctx.db, role: "admin", userId: user.userId }).admin.aiCosts();
  expect(report).toMatchObject({ unknownEntries: 1, knownSubtotalMicros: 70, estimatedTotalMicros: null });
  expect(report.rows).toHaveLength(3);
  expect(report.rows.find(r => r.provider === "mock")?.estimatedTotalMicros).toBe(0);
  expect(JSON.stringify(report)).not.toContain(user.userId);
  const free = report.byPlan.find(p => p.plan === "free")!;
  expect(free).toMatchObject({ accounts: 1, entries: 3, unknownEntries: 1, knownSubtotalMicros: 70, averagePerAccountMicros: null, priceCents: 0 });
  expect(report.byPlan.find(p => p.plan === "premium")).toMatchObject({ accounts: 0, entries: 0, averagePerAccountMicros: null });
});
