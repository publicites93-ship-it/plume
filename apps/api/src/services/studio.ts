import { and, asc, count, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  STUDIO_MEDIA_MAX_BYTES,
  STUDIO_MEDIA_MAX_PER_ENTITY,
  type RelationKind,
} from "@plume/shared";
import type { Database } from "../db/client";
import { characterRelations, characters, locations, profiles, studioMedia } from "../db/schema";
import { detectImageType } from "./covers";
import { requireOwnedStory } from "./stories";

/**
 * Le Studio est réservé aux profils « Écrire » et « Écrire et lire ».
 * Un profil sans choix enregistré (comptes anciens) garde l'accès.
 */
export async function requireStudioAccess(db: Database, userId: string) {
  const [profile] = await db
    .select({ goal: profiles.goal })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  if (profile?.goal === "read") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Le Studio d'écriture est réservé aux profils « Écrire » et « Écrire et lire ». Vous pouvez changer de profil dans les réglages.",
      cause: { details: { code: "STUDIO_PROFILE_REQUIRED" } },
    });
  }
}

async function requireCharacters(db: Database, storyId: string, ids: string[]) {
  const rows = await db
    .select({ id: characters.id })
    .from(characters)
    .where(and(eq(characters.storyId, storyId), inArray(characters.id, ids)));
  if (rows.length !== new Set(ids).size) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Personnage introuvable." });
  }
}

export async function listRelations(db: Database, storyId: string) {
  return db
    .select()
    .from(characterRelations)
    .where(eq(characterRelations.storyId, storyId))
    .orderBy(asc(characterRelations.createdAt));
}

export async function createRelation(
  db: Database,
  userId: string,
  input: { storyId: string; fromCharacterId: string; toCharacterId: string; kind: RelationKind; description?: string | null },
) {
  await requireOwnedStory(db, input.storyId, userId);
  await requireCharacters(db, input.storyId, [input.fromCharacterId, input.toCharacterId]);
  const [row] = await db
    .insert(characterRelations)
    .values({ ...input, description: input.description ?? null, origin: "author" })
    .onConflictDoNothing()
    .returning();
  if (!row) {
    throw new TRPCError({ code: "CONFLICT", message: "Cette relation existe déjà entre ces deux personnages." });
  }
  return row;
}

export async function updateRelation(
  db: Database,
  userId: string,
  input: { id: string; storyId: string; kind?: RelationKind; description?: string | null },
) {
  await requireOwnedStory(db, input.storyId, userId);
  const { id, storyId, ...fields } = input;
  const [row] = await db
    .update(characterRelations)
    // Toute modification par l'auteur fait de lui la source de l'information.
    .set({ ...fields, origin: "author", updatedAt: new Date() })
    .where(and(eq(characterRelations.id, id), eq(characterRelations.storyId, storyId)))
    .returning();
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Relation introuvable." });
  return row;
}

export async function deleteRelation(db: Database, userId: string, id: string, storyId: string) {
  await requireOwnedStory(db, storyId, userId);
  await db
    .delete(characterRelations)
    .where(and(eq(characterRelations.id, id), eq(characterRelations.storyId, storyId)));
  return { ok: true };
}

type EntityType = "character" | "location";

async function requireEntity(db: Database, storyId: string, entityType: EntityType, entityId: string) {
  const table = entityType === "character" ? characters : locations;
  const [row] = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, entityId), eq(table.storyId, storyId)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Fiche introuvable." });
}

/** Métadonnées des images d'une histoire (jamais le contenu, servi à part). */
export async function listMedia(db: Database, storyId: string) {
  return db
    .select({
      id: studioMedia.id,
      entityType: studioMedia.entityType,
      entityId: studioMedia.entityId,
      createdAt: studioMedia.createdAt,
    })
    .from(studioMedia)
    .where(eq(studioMedia.storyId, storyId))
    .orderBy(asc(studioMedia.createdAt));
}

export async function addMedia(
  db: Database,
  userId: string,
  input: { storyId: string; entityType: EntityType; entityId: string; imageBase64: string },
) {
  await requireOwnedStory(db, input.storyId, userId);
  await requireEntity(db, input.storyId, input.entityType, input.entityId);
  const bytes = Buffer.from(input.imageBase64, "base64");
  if (bytes.length === 0 || bytes.length > STUDIO_MEDIA_MAX_BYTES) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `L'image doit peser moins de ${Math.round(STUDIO_MEDIA_MAX_BYTES / 1024)} Ko.`,
    });
  }
  const mimeType = detectImageType(bytes);
  if (!mimeType) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Format non pris en charge. Utilisez JPEG, PNG ou WebP." });
  }
  const [existing] = await db
    .select({ n: count() })
    .from(studioMedia)
    .where(and(eq(studioMedia.entityType, input.entityType), eq(studioMedia.entityId, input.entityId)));
  if (Number(existing?.n ?? 0) >= STUDIO_MEDIA_MAX_PER_ENTITY) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${STUDIO_MEDIA_MAX_PER_ENTITY} images au maximum par fiche. Retirez-en une pour en ajouter une autre.`,
    });
  }
  const [row] = await db
    .insert(studioMedia)
    .values({
      storyId: input.storyId,
      entityType: input.entityType,
      entityId: input.entityId,
      mimeType,
      data: bytes.toString("base64"),
      byteSize: bytes.length,
    })
    .returning({ id: studioMedia.id, entityType: studioMedia.entityType, entityId: studioMedia.entityId, createdAt: studioMedia.createdAt });
  return row!;
}

export async function removeMedia(db: Database, userId: string, id: string, storyId: string) {
  await requireOwnedStory(db, storyId, userId);
  await db.delete(studioMedia).where(and(eq(studioMedia.id, id), eq(studioMedia.storyId, storyId)));
  return { ok: true };
}

/** Lecture d'une image : réservée au propriétaire de l'histoire, sinon null (→ 404). */
export async function readMedia(db: Database, id: string, viewerId: string | null) {
  if (!viewerId) return null;
  const [row] = await db.select().from(studioMedia).where(eq(studioMedia.id, id)).limit(1);
  if (!row) return null;
  try {
    await requireOwnedStory(db, row.storyId, viewerId);
  } catch {
    return null;
  }
  return { mimeType: row.mimeType, bytes: Buffer.from(row.data, "base64") };
}

/** Une fiche supprimée emporte ses images (pas de clé étrangère polymorphe). */
export async function deleteMediaForEntity(db: Database, entityType: EntityType, entityId: string) {
  await db
    .delete(studioMedia)
    .where(and(eq(studioMedia.entityType, entityType), eq(studioMedia.entityId, entityId)));
}
