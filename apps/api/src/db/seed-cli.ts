import "dotenv/config";
import { createDatabase } from "./client";
import { runMigrations } from "./migrate";
import { seedDatabase } from "./seed";

const handle = await createDatabase();
try {
  await runMigrations(handle.db, handle.kind);
  const result = await seedDatabase(handle.db);
  if (result.created) {
    console.log("[plume] données de démonstration créées pour le développement local.");
    console.log("[plume] Ne jamais activer SEED_DEMO en production.");
  } else {
    console.log("[plume] données de démonstration déjà présentes.");
  }
} finally {
  await handle.close();
}
