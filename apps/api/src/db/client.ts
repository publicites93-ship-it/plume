import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getConfig } from "../config";
import * as schema from "./schema";

/**
 * Type commun aux deux pilotes. PGlite et node-postgres exposent la même API
 * de construction de requêtes Drizzle ; le cast centralise cette compatibilité.
 */
export type Database = NodePgDatabase<typeof schema>;

export interface DatabaseHandle {
  db: Database;
  kind: "pglite" | "postgres";
  close: () => Promise<void>;
}

export interface DatabaseOptions {
  url?: string | null;
  pglitePath?: string;
  memory?: boolean;
}

export async function createDatabase(options: DatabaseOptions = {}): Promise<DatabaseHandle> {
  const config = getConfig();
  const url = options.url === undefined ? config.DATABASE_URL : options.url;

  if (url) {
    const pool = new Pool({ connectionString: url, max: 10 });
    const db = drizzlePg(pool, { schema }) as unknown as Database;
    return {
      db,
      kind: "postgres",
      close: async () => {
        await pool.end();
      },
    };
  }

  const path = options.memory
    ? undefined
    : resolve(options.pglitePath ?? config.PGLITE_PATH ?? "data/pglite");
  if (path) mkdirSync(dirname(path), { recursive: true });
  const client = path ? new PGlite(path) : new PGlite();
  await client.waitReady;
  const db = drizzlePglite(client, { schema }) as unknown as Database;
  return {
    db,
    kind: "pglite",
    close: async () => {
      await client.close();
    },
  };
}

let singleton: DatabaseHandle | null = null;

export async function getDatabase(): Promise<DatabaseHandle> {
  if (!singleton) singleton = await createDatabase();
  return singleton;
}

export async function closeDatabase(): Promise<void> {
  if (singleton) {
    await singleton.close();
    singleton = null;
  }
}
