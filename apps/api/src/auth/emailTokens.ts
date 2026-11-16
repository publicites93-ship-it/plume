import { and, eq, gt, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { Database } from "../db/client";
import { authTokens, refreshTokens, users } from "../db/schema";
import { getConfig } from "../config";
import { hashPassword, randomToken, sha256 } from "./password";

const EMAIL_VERIFICATION_TTL_SECONDS = 24 * 60 * 60;
const PASSWORD_RESET_TTL_SECONDS = 60 * 60;

type AuthTokenKind = "email_verification" | "password_reset";

/**
 * Crée un jeton opaque à usage unique. Seul le hachage est stocké : le jeton
 * brut ne doit jamais être journalisé ni conservé côté serveur.
 */
export async function createAuthToken(
  db: Database,
  userId: string,
  kind: AuthTokenKind,
  ttlSeconds: number,
): Promise<string> {
  const token = randomToken();
  await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(authTokens.userId, userId), eq(authTokens.kind, kind), isNull(authTokens.usedAt)));
  await db.insert(authTokens).values({
    userId,
    kind,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + ttlSeconds * 1000),
  });
  return token;
}

export function createEmailVerificationToken(db: Database, userId: string): Promise<string> {
  return createAuthToken(db, userId, "email_verification", EMAIL_VERIFICATION_TTL_SECONDS);
}

export function createPasswordResetToken(db: Database, userId: string): Promise<string> {
  return createAuthToken(db, userId, "password_reset", PASSWORD_RESET_TTL_SECONDS);
}

/**
 * Consomme un jeton de façon atomique : la mise à jour conditionnelle empêche
 * deux requêtes concurrentes d'utiliser le même lien.
 */
async function consumeAuthToken(
  db: Database,
  token: string,
  kind: AuthTokenKind,
): Promise<string> {
  const [row] = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(authTokens.tokenHash, sha256(token)),
        eq(authTokens.kind, kind),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .returning({ userId: authTokens.userId });
  if (!row) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Ce lien est invalide, expiré ou déjà utilisé. Demandez un nouveau lien depuis l'application.",
    });
  }
  return row.userId;
}

export async function markEmailVerified(db: Database, token: string): Promise<string> {
  const userId = await consumeAuthToken(db, token, "email_verification");
  await db
    .update(users)
    .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
  return userId;
}

export async function resetPasswordWithToken(
  db: Database,
  token: string,
  newPassword: string,
): Promise<string> {
  const userId = await consumeAuthToken(db, token, "password_reset");
  const passwordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
  // Une réinitialisation doit fermer toutes les sessions existantes.
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  return userId;
}

export function emailVerificationRequired(): boolean {
  return getConfig().REQUIRE_EMAIL_VERIFICATION;
}

export function emailDeliveryConfigured(): boolean {
  const config = getConfig();
  if (config.EMAIL_PROVIDER === "resend") return Boolean(config.RESEND_API_KEY);
  if (config.EMAIL_PROVIDER === "test") return true;
  // Le transport console écrit dans un fichier local : utilisable en
  // développement, jamais pour un envoi réel en production.
  return !config.isProduction;
}
