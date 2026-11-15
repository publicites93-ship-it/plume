import "dotenv/config";
import { createDatabase } from "./client";
import { runMigrations } from "./migrate";
import { seedDatabase } from "./seed";

const handle = await createDatabase();
try {
  await runMigrations(handle.db, handle.kind);
  const result = await seedDatabase(handle.db);
  if (result.created) {
    console.log("[plume] données de démonstration créées.");
    console.log("[plume] comptes : lecteur@plume.app / auteur@plume.app");
    console.log(`[plume] mot de passe de démonstration : ${result.demoPassword}`);
    console.log("[plume] Ces comptes sont réservés au développement local.");
  } else {
    console.log("[plume] données de démonstration déjà présentes.");
  }
} finally {
  await handle.close();
}
