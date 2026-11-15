import "dotenv/config";
import { createDatabase } from "./client";
import { runMigrations } from "./migrate";

const handle = await createDatabase();
try {
  await runMigrations(handle.db, handle.kind);
  console.log(`[plume] migrations appliquées (${handle.kind})`);
} finally {
  await handle.close();
}
