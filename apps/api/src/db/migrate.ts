import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { is, sql } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import type { Database } from "./client";
import * as schema from "./schema";
import { reconcileWithInitialSchema } from "./reconcile";

interface JournalEntry {
  tag: string;
  when: number;
}

async function rows<T>(db: Database, query: ReturnType<typeof sql>): Promise<T[]> {
  // node-postgres et PGlite renvoient tous deux un objet { rows }.
  const result = (await db.execute(query)) as unknown as { rows: T[] };
  return result.rows;
}

/**
 * Une base créée par une autre version de l'API (autre historique de migrations)
 * contient déjà une partie du schéma, mais pas notre trace de 0000 dans
 * drizzle.__drizzle_migrations. Rejouer 0000 échouerait (« relation already exists »).
 * On complète alors la base de façon additive (voir reconcile.ts), puis on
 * enregistre 0000 comme appliquée. Sur une base vierge, rien n'est fait ici.
 */
async function prepareExistingDatabase(db: Database, folder: string): Promise<void> {
  const journal = JSON.parse(readFileSync(join(folder, "meta/_journal.json"), "utf8")) as {
    entries: JournalEntry[];
  };
  const initial = journal.entries[0];
  if (!initial) return;
  const [existing] = await rows<{ users: string | null }>(
    db,
    sql`select to_regclass('public.users')::text as users`,
  );
  if (!existing?.users) return;

  const problems = await findSchemaDrift(db, initialTables(folder, initial.tag));
  if (problems.length > 0) {
    console.warn(
      `[plume] base existante incomplète (${problems.length} écarts) : complément additif du schéma initial.`,
    );
    const warnings = await reconcileWithInitialSchema(db, folder, initial.tag);
    for (const warning of warnings) console.warn(`[plume] avertissement : ${warning}`);
  }

  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
  const [latest] = await rows<{ created_at: string | number | null }>(
    db,
    sql`select created_at from drizzle.__drizzle_migrations order by created_at desc limit 1`,
  );
  if (latest && Number(latest.created_at) >= initial.when) return;

  const content = readFileSync(join(folder, `${initial.tag}.sql`)).toString();
  const hash = createHash("sha256").update(content).digest("hex");
  await db.execute(
    sql`insert into drizzle.__drizzle_migrations (hash, created_at) values (${hash}, ${initial.when})`,
  );
  console.warn("[plume] schéma initial présent (autre historique) : 0000 marquée comme appliquée.");
}

/** Tables créées par la migration initiale, pour ne pas exiger celles des migrations suivantes. */
function initialTables(folder: string, tag: string): Set<string> {
  const content = readFileSync(join(folder, `${tag}.sql`), "utf8");
  return new Set([...content.matchAll(/CREATE TABLE "(\w+)"/g)].map((match) => match[1]!));
}

/** Compare le schéma Drizzle à la base réelle et liste tables et colonnes manquantes. */
export async function findSchemaDrift(db: Database, onlyTables?: Set<string>): Promise<string[]> {
  const columns = await rows<{ table_name: string; column_name: string }>(
    db,
    sql`select table_name, column_name from information_schema.columns where table_schema = 'public'`,
  );
  const present = new Map<string, Set<string>>();
  for (const column of columns) {
    if (!present.has(column.table_name)) present.set(column.table_name, new Set());
    present.get(column.table_name)!.add(column.column_name);
  }
  const problems: string[] = [];
  for (const value of Object.values(schema)) {
    if (!is(value, PgTable)) continue;
    const config = getTableConfig(value);
    if (onlyTables && !onlyTables.has(config.name)) continue;
    const existing = present.get(config.name);
    if (!existing) {
      problems.push(`table manquante : ${config.name}`);
      continue;
    }
    for (const column of config.columns) {
      if (!existing.has(column.name)) problems.push(`colonne manquante : ${config.name}.${column.name}`);
    }
  }
  return problems;
}

export async function runMigrations(
  db: Database,
  kind: "pglite" | "postgres",
  folder = resolve(process.cwd(), "migrations"),
): Promise<void> {
  await prepareExistingDatabase(db, folder);
  if (kind === "postgres") {
    await migratePg(db, { migrationsFolder: folder });
  } else {
    await migratePglite(db as unknown as Parameters<typeof migratePglite>[0], {
      migrationsFolder: folder,
    });
  }
  const drift = await findSchemaDrift(db);
  if (drift.length > 0) {
    throw new Error(
      `[plume] la base ne correspond pas au schéma attendu :\n- ${drift.join("\n- ")}`,
    );
  }
}
