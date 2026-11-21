import { afterAll, beforeAll, expect, it } from "vitest";
import { registerUser, setupDatabase, teardown, type TestContext } from "./helpers";
import { reserveClaude, settleClaude } from "../src/services/ai/budget";

let ctx: TestContext;
beforeAll(async () => { ctx = await setupDatabase(); });
afterAll(async () => { await teardown(ctx); });

it("une seule des deux réservations concurrentes tient dans le budget ; le solde réglé libère la différence", async () => {
  const { userId } = await registerUser(ctx.db);
  const reserve = () => reserveClaude({ db: ctx.db, userId }, "claude-sonnet-5-5", "abc", 100, 4000);
  const attempts = await Promise.allSettled([reserve(), reserve()]);
  const accepted = attempts.filter(r => r.status === "fulfilled");
  expect(accepted).toHaveLength(1);
  expect(attempts.find(r => r.status === "rejected")?.reason.code).toBe("FORBIDDEN");
  await settleClaude(ctx.db, accepted[0]!.value, 100);
  await expect(reserve()).resolves.toBeTruthy();
  const other = await registerUser(ctx.db);
  await expect(reserveClaude({ db: ctx.db, userId: other.userId }, "claude-sonnet-5-5", "abc", 100, 4000)).resolves.toBeTruthy();
});
