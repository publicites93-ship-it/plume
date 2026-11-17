import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { Database } from "../db/client";
import { stories, storyCovers } from "../db/schema";
import { requireOwnedStory } from "./stories";

/** Taille maximale d'une couverture après décodage (l'appli envoie ~600 × 900 px). */
export const MAX_COVER_BYTES = 600 * 1024;

const SIGNATURES: Array<{ mime: string; test: (b: Buffer) => boolean }> = [
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: "image/webp",
    test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

/** Vérifie le contenu réel (signature binaire), pas seulement le type annoncé. */
export function detectImageType(bytes: Buffer): string | null {
  return SIGNATURES.find((signature) => signature.test(bytes))?.mime ?? null;
}

export function coverPath(storyId: string, updatedAt: Date): string {
  return `/covers/${storyId}?v=${updatedAt.getTime()}`;
}

export async function setStoryCover(
  db: Database,
  userId: string,
  input: { storyId: string; imageBase64: string },
) {
  await requireOwnedStory(db, input.storyId, userId);
  const bytes = Buffer.from(input.imageBase64, "base64");
  if (bytes.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "L'image est vide." });
  }
  if (bytes.length > MAX_COVER_BYTES) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "L'image est trop lourde (600 Ko maximum). Choisissez une autre image.",
    });
  }
  const mimeType = detectImageType(bytes);
  if (!mimeType) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Format non pris en charge. Utilisez une image JPEG, PNG ou WebP.",
    });
  }
  const now = new Date();
  await db
    .insert(storyCovers)
    .values({
      storyId: input.storyId,
      mimeType,
      data: bytes.toString("base64"),
      byteSize: bytes.length,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: storyCovers.storyId,
      set: { mimeType, data: bytes.toString("base64"), byteSize: bytes.length, updatedAt: now },
    });
  const url = coverPath(input.storyId, now);
  await db.update(stories).set({ coverAssetUrl: url }).where(eq(stories.id, input.storyId));
  return { coverAssetUrl: url };
}

export async function removeStoryCover(db: Database, userId: string, storyId: string) {
  await requireOwnedStory(db, storyId, userId);
  await db.delete(storyCovers).where(eq(storyCovers.storyId, storyId));
  await db.update(stories).set({ coverAssetUrl: null }).where(eq(stories.id, storyId));
  return { coverAssetUrl: null };
}

/**
 * Lecture d'une couverture. Une histoire privée n'expose sa couverture qu'à son
 * auteur ; sinon NOT_FOUND, comme pour le reste des ressources privées.
 */
export async function readStoryCover(db: Database, storyId: string, viewerId: string | null) {
  const [row] = await db
    .select({
      cover: storyCovers,
      authorId: stories.authorId,
      visibility: stories.visibility,
      deletedAt: stories.deletedAt,
    })
    .from(storyCovers)
    .innerJoin(stories, eq(stories.id, storyCovers.storyId))
    .where(eq(storyCovers.storyId, storyId))
    .limit(1);
  if (!row || row.deletedAt) return null;
  if (row.visibility === "private" && row.authorId !== viewerId) return null;
  return {
    mimeType: row.cover.mimeType,
    bytes: Buffer.from(row.cover.data, "base64"),
    isPrivate: row.visibility === "private",
    updatedAt: row.cover.updatedAt,
  };
}
