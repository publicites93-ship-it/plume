import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGINS: z.string().default("http://localhost:8081,http://localhost:19006"),
  DATABASE_URL: z.string().optional(),
  PGLITE_PATH: z.string().optional(),
  JWT_SECRET: z.string().min(16).default("plume-dev-secret-change-me-please"),
  ACCESS_TOKEN_TTL: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL: z.coerce.number().int().positive().default(2_592_000),
  AI_PROVIDER: z.enum(["mock", "gemini"]).default("mock"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
});

export type AppConfig = z.infer<typeof envSchema> & {
  corsOrigins: string[];
  isProduction: boolean;
};

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Configuration invalide:\n${details}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === "production") {
    if (env.JWT_SECRET.includes("change-me") || env.JWT_SECRET.length < 32) {
      throw new Error(
        "JWT_SECRET doit être défini avec une valeur aléatoire d'au moins 32 caractères en production.",
      );
    }
    if (!env.DATABASE_URL) {
      throw new Error("DATABASE_URL est requis en production (PostgreSQL).");
    }
  }
  cached = {
    ...env,
    corsOrigins: env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean),
    isProduction: env.NODE_ENV === "production",
  };
  return cached;
}

/** Réservé aux tests : force la relecture de l'environnement. */
export function resetConfigForTests(): void {
  cached = null;
}
