import "dotenv/config";
import { eq } from "drizzle-orm";
import { createDatabase } from "./client";
import { auditEvents, users } from "./schema";

/**
 * Attribue une formule à un compte, sans paiement (compte offert, support).
 *
 *   npm run db:set-plan --workspace @plume/api -- <email> <free|plus|premium> [jours]
 *
 * Sans nombre de jours, la formule n'expire pas. La commande ne crée aucun
 * compte : l'utilisateur doit s'être inscrit dans l'appli.
 */
const [emailArg, planArg, daysArg] = process.argv.slice(2);
const plans = ["free", "plus", "premium"] as const;
type Plan = (typeof plans)[number];

if (!emailArg || !plans.includes(planArg as Plan)) {
  console.error(
    "Usage : npm run db:set-plan --workspace @plume/api -- <email> <free|plus|premium> [jours]",
  );
  process.exit(1);
}
const days = daysArg ? Number(daysArg) : null;
if (days !== null && (!Number.isInteger(days) || days <= 0)) {
  console.error("[plume] Le nombre de jours doit être un entier positif.");
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const plan = planArg as Plan;
const expiresAt = days ? new Date(Date.now() + days * 86_400_000) : null;

const handle = await createDatabase();
try {
  const [user] = await handle.db
    .update(users)
    .set({ plan, planExpiresAt: plan === "free" ? null : expiresAt })
    .where(eq(users.email, email))
    .returning({ id: users.id, plan: users.plan, planExpiresAt: users.planExpiresAt });
  if (!user) {
    console.error(`[plume] Aucun compte pour ${email}. Créez-le d'abord dans l'appli.`);
    process.exitCode = 1;
  } else {
    await handle.db.insert(auditEvents).values({
      actorId: null,
      action: "plan.set_by_admin",
      targetType: "user",
      targetId: user.id,
      metadata: { plan, expiresAt: expiresAt?.toISOString() ?? null },
    });
    console.log(
      `[plume] ${email} → ${user.plan}${
        user.planExpiresAt ? ` jusqu'au ${user.planExpiresAt.toISOString().slice(0, 10)}` : " (sans expiration)"
      }`,
    );
  }
} finally {
  await handle.close();
}
