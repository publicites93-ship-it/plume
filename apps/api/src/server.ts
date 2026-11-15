import { resolve } from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), ".env") });
dotenv.config({ path: resolve(process.cwd(), "../../.env"), override: false });

const { getConfig } = await import("./config");
const { buildApp } = await import("./app");

const config = getConfig();
const { app, close } = await buildApp();

try {
  await app.listen({ port: config.PORT, host: config.HOST });
  console.log(`[plume] API prête sur http://${config.HOST}:${config.PORT}/trpc`);
  console.log(`[plume] fournisseur IA: ${config.AI_PROVIDER}`);
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
