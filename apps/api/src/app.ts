import { coachStatus } from "./services/ai/index";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { getConfig } from "./config";
import { createDatabase, type Database, type DatabaseHandle } from "./db/client";
import { runMigrations } from "./db/migrate";
import { createContext } from "./trpc/trpc";
import { appRouter } from "./trpc/router";
import { registerLegalRoutes } from "./routes/legal";
import { registerAuthPages } from "./routes/authPages";
import { registerCoverRoutes } from "./routes/covers";

export interface BuildAppOptions {
  db?: Database;
  runMigrations?: boolean;
  logger?: boolean;
}

export interface BuiltApp {
  app: FastifyInstance;
  db: Database;
  close: () => Promise<void>;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<BuiltApp> {
  const config = getConfig();
  let handle: DatabaseHandle | null = null;
  let db: Database;
  if (options.db) {
    db = options.db;
  } else {
    handle = await createDatabase();
    db = handle.db;
    if (options.runMigrations !== false && handle.kind === "pglite") {
      await runMigrations(db, handle.kind);
    }
  }

  const app = Fastify({
    logger:
      options.logger === false
        ? false
        : {
            level: config.isProduction ? "info" : "warn",
            redact: {
              paths: [
                "req.headers.authorization",
                "req.headers.cookie",
                "body.password",
                "body.content",
              ],
              censor: "[redacted]",
            },
          },
    trustProxy: false,
    bodyLimit: 2 * 1024 * 1024,
  });

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (config.corsOrigins.includes("*") || config.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 300,
    timeWindow: "1 minute",
    allowList: [],
  });

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("referrer-policy", "no-referrer");
    return payload;
  });

  // Les pages web de réinitialisation utilisent un formulaire HTML classique.
  // Le corps reste petit et n'est jamais journalisé.
  app.addContentTypeParser(
    "application/x-www-form-urlencoded",
    { parseAs: "string" },
    (_request, body, done) => {
      try {
        done(null, Object.fromEntries(new URLSearchParams(String(body))));
      } catch (error) {
        done(error as Error);
      }
    },
  );

  await app.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: appRouter,
      createContext: ({ req }: { req: FastifyRequest }) =>
        createContext({
          db,
          authorization: req.headers.authorization,
          ip: req.ip,
        }),
      onError({ error, path }: { error: { code: string }; path?: string }) {
        if (error.code === "INTERNAL_SERVER_ERROR") {
          app.log.error({ path, code: error.code }, "tRPC internal error");
        }
      },
    },
  });

  app.get("/health", async () => ({
    ok: true,
    service: "plume-api",
    ai: config.AI_PROVIDER,
    aiAvailable: coachStatus().available,
    email: config.EMAIL_PROVIDER,
    emailVerification: config.REQUIRE_EMAIL_VERIFICATION,
  }));

  await registerLegalRoutes(app);
  await registerAuthPages(app, db);
  await registerCoverRoutes(app, db);

  app.setErrorHandler((error: unknown, _request, reply) => {
    const normalized = error as { message?: string; code?: string };
    app.log.error(
      { message: normalized.message, code: normalized.code },
      "unhandled error",
    );
    reply.status(500).send({ error: "internal_error" });
  });

  return {
    app,
    db,
    close: async () => {
      await app.close();
      if (handle) await handle.close();
    },
  };
}
