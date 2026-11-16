import { readFileSync } from "node:fs";
import { join } from "node:path";
import { is, sql } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";
import type { Database } from "./client";
import * as schema from "./schema";

/**
 * Complète une base existante qui n'a pas été créée par notre historique de
 * migrations (par exemple la base d'une autre version de Plume).
 *
 * Règles : uniquement des ajouts. Aucune table, colonne ni donnée n'est supprimée.
 * - types, tables, index : créés s'ils manquent ;
 * - colonnes manquantes : ajoutées ; « NOT NULL » sans valeur par défaut est
 *   assoupli pour ne pas échouer sur des lignes existantes ;
 * - contraintes : ajoutées si possible, sinon un avertissement est journalisé ;
 * - colonnes obligatoires inconnues de notre schéma : rendues facultatives,
 *   sinon nos insertions échoueraient.
 *
 * Chaque instruction est exécutée isolément : un échec n'annule pas les autres,
 * et la vérification de schéma qui suit décide si l'API peut démarrer.
 */
export async function reconcileWithInitialSchema(
  db: Database,
  folder: string,
  initialTag: string,
): Promise<string[]> {
  const warnings: string[] = [];
  const statements = readFileSync(join(folder, `${initialTag}.sql`), "utf8")
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

  async function run(statement: string, label: string, ignoreCodes: string[] = []) {
    try {
      await db.execute(sql.raw(statement));
    } catch (error) {
      const code = (error as { cause?: { code?: string }; code?: string }).cause?.code ??
        (error as { code?: string }).code;
      if (code && ignoreCodes.includes(code)) return;
      const message =
        (error as { cause?: { message?: string } }).cause?.message ??
        (error instanceof Error ? error.message.split("\n")[0] : String(error));
      warnings.push(`${label} : ${message}`);
    }
  }

  for (const statement of statements) {
    const enumMatch = statement.match(/^CREATE TYPE "public"\."(\w+)" AS ENUM\((.*)\);?$/s);
    if (enumMatch) {
      const [, name, rawValues] = enumMatch;
      await run(statement.replace(/;$/, ""), `type ${name}`, ["42710"]);
      for (const value of rawValues!.split(",").map((v) => v.trim())) {
        await run(
          `ALTER TYPE "public"."${name}" ADD VALUE IF NOT EXISTS ${value}`,
          `valeur ${name}.${value}`,
        );
      }
      continue;
    }

    const tableMatch = statement.match(/^CREATE TABLE "(\w+)" \((.*)\);?$/s);
    if (tableMatch) {
      const [, table, body] = tableMatch;
      await run(
        statement.replace(/^CREATE TABLE "/, 'CREATE TABLE IF NOT EXISTS "').replace(/;$/, ""),
        `table ${table}`,
      );
      for (const line of body!.split("\n")) {
        const column = line.trim().replace(/,$/, "").match(/^"(\w+)" (.+)$/);
        if (!column) continue;
        const [, name, definition] = column;
        let safe = definition!.replace(/\s*PRIMARY KEY/, "");
        if (/NOT NULL/.test(safe) && !/DEFAULT/.test(safe)) safe = safe.replace(/\s*NOT NULL/, "");
        await run(
          `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${name}" ${safe}`,
          `colonne ${table}.${name}`,
        );
      }
      continue;
    }

    if (/^ALTER TABLE .* ADD CONSTRAINT/s.test(statement)) {
      // 42710 : contrainte déjà présente ; 42P16/42P07 : clé ou relation déjà définie.
      await run(statement.replace(/;$/, ""), "contrainte", ["42710", "42P16", "42P07"]);
      continue;
    }

    if (/^CREATE (UNIQUE )?INDEX "/.test(statement)) {
      await run(
        statement.replace(/^CREATE (UNIQUE )?INDEX "/, (_m, unique: string | undefined) =>
          `CREATE ${unique ?? ""}INDEX IF NOT EXISTS "`,
        ).replace(/;$/, ""),
        "index",
      );
      continue;
    }

    await run(statement.replace(/;$/, ""), "instruction");
  }

  await relaxForeignRequiredColumns(db, warnings);
  return warnings;
}

/** Rend facultatives les colonnes NOT NULL sans défaut que notre code ne remplit pas. */
async function relaxForeignRequiredColumns(db: Database, warnings: string[]) {
  const known = new Map<string, Set<string>>();
  for (const value of Object.values(schema)) {
    if (!is(value, PgTable)) continue;
    const config = getTableConfig(value);
    known.set(config.name, new Set(config.columns.map((column) => column.name)));
  }
  const result = (await db.execute(sql`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public' and is_nullable = 'NO' and column_default is null
  `)) as unknown as { rows: Array<{ table_name: string; column_name: string }> };
  for (const row of result.rows) {
    const columns = known.get(row.table_name);
    if (!columns || columns.has(row.column_name)) continue;
    try {
      await db.execute(
        sql.raw(`ALTER TABLE "${row.table_name}" ALTER COLUMN "${row.column_name}" DROP NOT NULL`),
      );
      console.warn(
        `[plume] colonne héritée rendue facultative : ${row.table_name}.${row.column_name}`,
      );
    } catch (error) {
      warnings.push(
        `colonne héritée ${row.table_name}.${row.column_name} : ${(error as Error).message.split("\n")[0]}`,
      );
    }
  }
}
