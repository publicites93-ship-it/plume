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
  AI_PROVIDER: z.enum(["mock", "gemini", "anthropic"]).default("mock"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-3.8-flash"),
  ANTHROPIC_API_KEY: z.string().optional(),
  /** Nom alternatif accepté pour la clé Claude. */
  CLAUDE_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5-5"),
  /** Modèle Claude des comptes Gratuit (moins coûteux). */
  ANTHROPIC_MODEL_FREE: z.string().default("claude-haiku-5-5"),
  EMAIL_PROVIDER: z.enum(["console", "resend", "brevo", "test"]).default("console"),
  RESEND_API_KEY: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Plume <no-reply@plume.app>"),
  PUBLIC_APP_URL: z.string().url().default("http://localhost:4000"),
  REQUIRE_EMAIL_VERIFICATION: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
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
    if (env.REQUIRE_EMAIL_VERIFICATION) {
      if (env.EMAIL_PROVIDER !== "resend" && env.EMAIL_PROVIDER !== "brevo") {
        throw new Error(
          "REQUIRE_EMAIL_VERIFICATION=true exige EMAIL_PROVIDER=resend ou brevo en production.",
        );
      }
      if (env.EMAIL_PROVIDER === "resend" && !env.RESEND_API_KEY) {
        throw new Error(
          "REQUIRE_EMAIL_VERIFICATION=true exige RESEND_API_KEY en production.",
        );
      }
      if (env.EMAIL_PROVIDER === "brevo" && !env.BREVO_API_KEY) {
        throw new Error(
          "REQUIRE_EMAIL_VERIFICATION=true exige BREVO_API_KEY en production.",
        );
      }
      if (env.EMAIL_FROM === "Plume <no-reply@plume.app>") {
        throw new Error(
          "REQUIRE_EMAIL_VERIFICATION=true exige EMAIL_FROM avec une adresse expéditeur vérifiée.",
        );
      }
      if (!env.PUBLIC_APP_URL.startsWith("https://")) {
        throw new Error(
          "REQUIRE_EMAIL_VERIFICATION=true exige PUBLIC_APP_URL en HTTPS.",
        );
      }
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
