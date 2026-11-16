import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Database } from "../db/client";
import { verifyAccessToken } from "../auth/tokens";

export interface Context {
  db: Database;
  userId?: string;
  role?: "user" | "admin";
  ip?: string;
  /** Vrai si un en-tête Authorization a été fourni, même invalide/expiré. */
  hadToken?: boolean;
}

export async function createContext(opts: {
  db: Database;
  authorization?: string;
  ip?: string;
}): Promise<Context> {
  let userId: string | undefined;
  let role: "user" | "admin" | undefined;
  const header = opts.authorization;
  const hadToken = Boolean(header?.startsWith("Bearer "));
  if (hadToken && header) {
    try {
      const payload = await verifyAccessToken(header.slice(7));
      userId = payload.sub;
      role = payload.role;
    } catch {
      // Jeton présent mais invalide/expiré : les procédures publiques restent
      // accessibles, les procédures protégées renvoient un message distinct.
    }
  }
  return { db: opts.db, userId, role, ip: opts.ip, hadToken };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const cause = error.cause;
    const details =
      cause && typeof cause === "object" && "details" in cause
        ? (cause as { details?: unknown }).details
        : undefined;
    return { ...shape, data: { ...shape.data, details } };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ctx.hadToken
        ? "Votre session a expiré. Reconnectez-vous pour continuer."
        : "Connectez-vous pour continuer.",
    });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId, role: ctx.role ?? "user" } });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé à l'administration." });
  }
  return next({ ctx });
});

export function notFound(message = "Ressource introuvable."): never {
  throw new TRPCError({ code: "NOT_FOUND", message });
}

export function forbidden(message = "Vous n'avez pas accès à cette ressource."): never {
  throw new TRPCError({ code: "FORBIDDEN", message });
}

export function badRequest(message: string, details?: unknown): never {
  throw new TRPCError({ code: "BAD_REQUEST", message, cause: { details } });
}

export function conflict(message: string, details?: unknown): never {
  throw new TRPCError({ code: "CONFLICT", message, cause: { details } });
}

/** Limiteur en mémoire (fenêtre fixe). En production : Redis / @fastify/rate-limit distribué. */
export class FixedWindowLimiter {
  private buckets = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  check(key: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (bucket.count >= this.limit) return false;
    bucket.count += 1;
    return true;
  }
}
