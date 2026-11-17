import { resolve } from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), ".env") });
dotenv.config({ path: resolve(process.cwd(), "../../.env"), override: false });

const { getConfig } = await import("./config");
const { billingConfigIssues } = await import("./services/billing");
const { buildApp } = await import("./app");

const config = getConfig();
const { app, close } = await buildApp();

try {
  await app.listen({ port: config.PORT, host: config.HOST });
  console.log(`[plume] API prête sur http://${config.HOST}:${config.PORT}/trpc`);
  console.log(`[plume] fournisseur IA: ${config.AI_PROVIDER}`);
  const stripeIssues = billingConfigIssues();
  if (stripeIssues.length === 4 && !config.STRIPE_SECRET_KEY) {
    console.log("[plume] paiement Stripe : non configuré");
  } else if (stripeIssues.length > 0) {
    // Noms des variables et format attendu uniquement : aucune valeur n'est affichée.
    for (const issue of stripeIssues) console.warn(`[plume] paiement Stripe désactivé : ${issue}`);
  } else {
    console.log("[plume] paiement Stripe : configuré");
  }
  console.log(
    `[plume] base: ${config.DATABASE_URL ? "PostgreSQL" : "PGlite embarqué (apps/api/data/pglite)"}`,
  );
} catch (error) {
  console.error(error);
  await close();
  process.exit(1);
}

const shutdown = async () => {
  await close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
