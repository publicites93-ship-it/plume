import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { createDatabase, type Database, type DatabaseHandle } from "../src/db/client";
import { runMigrations } from "../src/db/migrate";
import { createContext } from "../src/trpc/trpc";
import { appRouter } from "../src/trpc/router";
import { users } from "../src/db/schema";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-with-at-least-32-characters-long";
process.env.AI_PROVIDER = "mock";

export interface TestContext {
  handle: DatabaseHandle;
  db: Database;
}

export async function setupDatabase(): Promise<TestContext> {
  const handle = await createDatabase({ memory: true });
  await runMigrations(handle.db, handle.kind);
  return { handle, db: handle.db };
}

export async function teardown(context: TestContext) {
  await context.handle.close();
}

export function publicCaller(db: Database) {
  return appRouter.createCaller({ db, ip: "127.0.0.1" });
}

export interface TestUser {
  userId: string;
  accessToken: string;
  refreshToken: string;
  caller: ReturnType<typeof appRouter.createCaller>;
}

export async function registerUser(
  db: Database,
  options: { email?: string; pseudonym?: string } = {},
): Promise<TestUser> {
  const suffix = randomUUID().slice(0, 8);
  const email = options.email ?? `test-${suffix}@plume.test`;
  const pseudonym = options.pseudonym ?? `Testeur ${suffix}`;
  const caller = publicCaller(db);
  const result = await caller.auth.signUp({
    email,
    password: "PlumeTest1",
    pseudonym,
    acceptedTerms: true,
  });
  const context = await createContext({
    db,
    authorization: `Bearer ${result.tokens.accessToken}`,
    ip: "127.0.0.1",
  });
  return {
    userId: result.userId,
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    caller: appRouter.createCaller(context),
  };
}

export async function setPlan(db: Database, userId: string, plan: "free" | "plus" | "premium") {
  await db.update(users).set({ plan }).where(eq(users.id, userId));
}

export const SAMPLE_TEXT =
  "La bibliothèque sentait la cire et le vieux papier. Alma posa la lampe sur la table, puis elle entendit un pas derrière la porte. Ce n'était pas son père : son père marchait toujours en traînant le pied gauche. Elle retint son souffle. La clé tourna dans la serrure, lentement, comme si quelqu'un voulait lui laisser le temps de fuir. Alma aurait dû courir. Elle resta. Le battant s'ouvrit sur une obscurité plus froide que la pièce, et une voix très douce prononça son prénom. C'était la voix de sa mère, morte depuis onze ans.";
