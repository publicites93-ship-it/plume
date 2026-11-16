import "dotenv/config";
import { inArray, like, or } from "drizzle-orm";
import { createDatabase } from "./client";
import { users } from "./schema";

/**
 * Supprime les comptes et contenus de démonstration.
 *
 * Les histoires, chapitres, versions, analyses, bibliothèques et sessions sont
 * supprimés en cascade par les clés étrangères. Garde-fou volontaire : la
 * commande refuse de s'exécuter sans CONFIRM_DELETE_DEMO=yes.
 */
if (process.env.CONFIRM_DELETE_DEMO !== "yes") {
  console.error(
    "[plume] Suppression annulée. Relancez avec CONFIRM_DELETE_DEMO=yes pour effacer les comptes de démonstration.",
  );
  process.exit(1);
}

const handle = await createDatabase();
try {
  const deleted = await handle.db
    .delete(users)
    .where(
      or(
        inArray(users.email, ["auteur@plume.app", "lecteur@plume.app"]),
        like(users.email, "%@demo.plume.app"),
      ),
    )
    .returning({ id: users.id, email: users.email });

  if (deleted.length === 0) {
    console.log("[plume] Aucun compte de démonstration trouvé.");
  } else {
    console.log(`[plume] ${deleted.length} compte(s) de démonstration supprimé(s) :`);
    for (const user of deleted) {
      console.log(`  - ${user.email}`);
    }
    console.log(
      "[plume] Les manuscrits, chapitres, versions, analyses et données de lecture associés ont été supprimés en cascade.",
    );
  }
} finally {
  await handle.close();
}
