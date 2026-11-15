import { resolve } from "node:path";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import type { Database } from "./client";

export async function runMigrations(
  db: Database,
  kind: "pglite" | "postgres",
  folder = resolve(process.cwd(), "migrations"),
): Promise<void> {
  if (kind === "postgres") {
    await migratePg(db, { migrationsFolder: folder });
  } else {
    await migratePglite(db as unknown as Parameters<typeof migratePglite>[0], {
      migrationsFolder: folder,
    });
  }
}
