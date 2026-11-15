import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { Database } from "../db/client";
import { profiles, refreshTokens, userPreferences, users } from "../db/schema";
import { hashPassword, randomToken, sha256, verifyPassword } from "./password";
import { signAccessToken } from "./tokens";
import { getConfig } from "../config";

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

export async function issueSession(
  db: Database,
  userId: string,
  role: "user" | "admin",
): Promise<SessionTokens> {
  const config = getConfig();
  const accessToken = await signAccessToken({ userId, role });
  const refreshToken = randomToken();
  const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_TTL * 1000);
  await db.insert(refreshTokens).values({
    userId,
    tokenHash: sha256(refreshToken),
    expiresAt,
  });
  return {
    accessToken,
    refreshToken,
    accessTokenExpiresIn: config.ACCESS_TOKEN_TTL,
    refreshTokenExpiresIn: config.REFRESH_TOKEN_TTL,
  };
}

export async function registerUser(
  db: Database,
  input: { email: string; password: string; pseudonym: string },
): Promise<{ userId: string; tokens: SessionTokens }> {
  const existingEmail = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);
  if (existingEmail.length > 0) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Un compte existe déjà avec cette adresse e-mail.",
    });
  }
  const existingName = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(sql`lower(${profiles.pseudonym}) = lower(${input.pseudonym})`)
    .limit(1);
  if (existingName.length > 0) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Ce pseudonyme est déjà utilisé. Choisissez-en un autre.",
    });
  }

  const passwordHash = await hashPassword(input.password);
  const userId = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email: input.email, passwordHash })
      .returning({ id: users.id });
    if (!user) throw new Error("Création du compte impossible.");
    await tx.insert(profiles).values({ userId: user.id, pseudonym: input.pseudonym });
    await tx.insert(userPreferences).values({ userId: user.id });
    return user.id;
  });

  const tokens = await issueSession(db, userId, "user");
  return { userId, tokens };
}

export async function authenticateUser(
  db: Database,
  input: { email: string; password: string },
): Promise<{ userId: string; tokens: SessionTokens }> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, input.email), isNull(users.deletedAt)))
    .limit(1);
  const genericError = new TRPCError({
    code: "UNAUTHORIZED",
    message: "Adresse e-mail ou mot de passe incorrect.",
  });
  if (!user) {
    // Coût constant : évite de révéler l'existence d'un compte par le temps de réponse.
    await hashPassword(input.password);
    throw genericError;
  }
  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw genericError;

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  const tokens = await issueSession(db, user.id, user.role);
  return { userId: user.id, tokens };
}

export async function rotateRefreshToken(
  db: Database,
  refreshToken: string,
): Promise<SessionTokens> {
  const hash = sha256(refreshToken);
  const [record] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hash))
    .limit(1);
  if (!record) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Session invalide. Reconnectez-vous." });
  }
  if (record.revokedAt) {
    // Réutilisation d'un jeton déjà tourné : on révoque toutes les sessions.
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, record.userId), isNull(refreshTokens.revokedAt)));
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Session révoquée par sécurité. Reconnectez-vous.",
    });
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Session expirée. Reconnectez-vous." });
  }
  const [user] = await db
    .select({ id: users.id, role: users.role, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, record.userId))
    .limit(1);
  if (!user || user.deletedAt) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Compte indisponible." });
  }
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, record.id));
  return issueSession(db, user.id, user.role);
}

export async function revokeRefreshToken(db: Database, refreshToken: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(refreshTokens.tokenHash, sha256(refreshToken)), gt(refreshTokens.expiresAt, new Date())),
    );
}

export async function revokeAllSessions(db: Database, userId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
}
