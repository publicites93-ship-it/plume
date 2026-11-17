import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { Database } from "../db/client";
import {
  characters,
  locations,
  plotThreads,
  storyIdeas,
  storyPlans,
  timelineEvents,
} from "../db/schema";
import { requireOwnedStory } from "./stories";
import { deleteMediaForEntity, listMedia, listRelations } from "./studio";

/** Retire les champs vides : une information inconnue reste non renseignée. */
function cleanSheet(sheet?: Record<string, string>): Record<string, string> {
  if (!sheet) return {};
  return Object.fromEntries(
    Object.entries(sheet)
      .map(([key, value]) => [key, value.trim()] as const)
      .filter(([, value]) => value.length > 0),
  );
}

type OwnedTable = typeof characters | typeof locations | typeof plotThreads | typeof timelineEvents;

async function assertRowBelongsToStory(
  db: Database,
  table: OwnedTable,
  id: string,
  storyId: string,
) {
  const [row] = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, id), eq(table.storyId, storyId)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Élément introuvable." });
}

export async function listNarrative(db: Database, storyId: string, userId: string) {
  await requireOwnedStory(db, storyId, userId);
  const [characterRows, locationRows, plotRows, eventRows, ideaRows, planRows] =
    await Promise.all([
      db.select().from(characters).where(eq(characters.storyId, storyId)).orderBy(asc(characters.name)),
      db.select().from(locations).where(eq(locations.storyId, storyId)).orderBy(asc(locations.name)),
      db.select().from(plotThreads).where(eq(plotThreads.storyId, storyId)).orderBy(asc(plotThreads.name)),
      db
        .select()
        .from(timelineEvents)
        .where(eq(timelineEvents.storyId, storyId))
        .orderBy(asc(timelineEvents.narrativeOrder)),
      db.select().from(storyIdeas).where(eq(storyIdeas.storyId, storyId)).orderBy(desc(storyIdeas.createdAt)),
      db.select().from(storyPlans).where(eq(storyPlans.storyId, storyId)).limit(1),
    ]);
  const [relationRows, mediaRows] = await Promise.all([
    listRelations(db, storyId),
    listMedia(db, storyId),
  ]);
  return {
    characters: characterRows,
    locations: locationRows,
    plots: plotRows,
    events: eventRows,
    ideas: ideaRows,
    plan: planRows[0] ?? null,
    relations: relationRows,
    media: mediaRows,
  };
}

export async function createCharacter(
  db: Database,
  userId: string,
  input: {
    storyId: string;
    name: string;
    role?: string | null;
    summary?: string | null;
    motivation?: string | null;
    fear?: string | null;
    secret?: string | null;
    arc?: string | null;
    notes?: string | null;
    customFields?: Array<{ label: string; value: string }>;
    aliases?: string[];
    sheet?: Record<string, string>;
  },
) {
  await requireOwnedStory(db, input.storyId, userId);
  const [row] = await db
    .insert(characters)
    .values({
      ...input,
      customFields: input.customFields ?? [],
      aliases: input.aliases ?? [],
      sheet: cleanSheet(input.sheet),
    })
    .returning();
  return row;
}

export async function updateCharacter(
  db: Database,
  userId: string,
  input: { id: string; storyId: string } & Partial<{
    name: string;
    role: string | null;
    summary: string | null;
    motivation: string | null;
    fear: string | null;
    secret: string | null;
    arc: string | null;
    notes: string | null;
    customFields: Array<{ label: string; value: string }>;
    aliases: string[];
    sheet: Record<string, string>;
  }>,
) {
  await requireOwnedStory(db, input.storyId, userId);
  await assertRowBelongsToStory(db, characters, input.id, input.storyId);
  const { id, storyId, sheet, ...fields } = input;
  const [row] = await db
    .update(characters)
    .set({ ...fields, ...(sheet ? { sheet: cleanSheet(sheet) } : {}), updatedAt: new Date() })
    .where(eq(characters.id, id))
    .returning();
  return row;
}

export async function deleteCharacter(db: Database, userId: string, id: string, storyId: string) {
  await requireOwnedStory(db, storyId, userId);
  await assertRowBelongsToStory(db, characters, id, storyId);
  await db.delete(characters).where(eq(characters.id, id));
  await deleteMediaForEntity(db, "character", id);
  return { ok: true };
}

export async function createLocation(
  db: Database,
  userId: string,
  input: {
    storyId: string;
    name: string;
    description?: string | null;
    atmosphere?: string | null;
    history?: string | null;
    notes?: string | null;
    sheet?: Record<string, string>;
  },
) {
  await requireOwnedStory(db, input.storyId, userId);
  const [row] = await db
    .insert(locations)
    .values({ ...input, sheet: cleanSheet(input.sheet) })
    .returning();
  return row;
}

export async function updateLocation(
  db: Database,
  userId: string,
  input: { id: string; storyId: string } & Partial<{
    name: string;
    description: string | null;
    atmosphere: string | null;
    history: string | null;
    notes: string | null;
    sheet: Record<string, string>;
  }>,
) {
  await requireOwnedStory(db, input.storyId, userId);
  await assertRowBelongsToStory(db, locations, input.id, input.storyId);
  const { id, storyId, sheet, ...fields } = input;
  const [row] = await db
    .update(locations)
    .set({ ...fields, ...(sheet ? { sheet: cleanSheet(sheet) } : {}), updatedAt: new Date() })
    .where(eq(locations.id, id))
    .returning();
  return row;
}

export async function deleteLocation(db: Database, userId: string, id: string, storyId: string) {
  await requireOwnedStory(db, storyId, userId);
  await assertRowBelongsToStory(db, locations, id, storyId);
  await db.delete(locations).where(eq(locations.id, id));
  await deleteMediaForEntity(db, "location", id);
  return { ok: true };
}

export async function createPlot(
  db: Database,
  userId: string,
  input: {
    storyId: string;
    name: string;
    description?: string | null;
    stakes?: string | null;
    status?: "planned" | "active" | "resolved" | "abandoned";
    resolution?: string | null;
    kind?: "main" | "secondary";
  },
) {
  await requireOwnedStory(db, input.storyId, userId);
  const [row] = await db.insert(plotThreads).values(input).returning();
  return row;
}

export async function updatePlot(
  db: Database,
  userId: string,
  input: { id: string; storyId: string } & Partial<{
    name: string;
    description: string | null;
    stakes: string | null;
    status: "planned" | "active" | "resolved" | "abandoned";
    resolution: string | null;
    kind: "main" | "secondary";
  }>,
) {
  await requireOwnedStory(db, input.storyId, userId);
  await assertRowBelongsToStory(db, plotThreads, input.id, input.storyId);
  const { id, storyId, ...fields } = input;
  const [row] = await db
    .update(plotThreads)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(plotThreads.id, id))
    .returning();
  return row;
}

export async function deletePlot(db: Database, userId: string, id: string, storyId: string) {
  await requireOwnedStory(db, storyId, userId);
  await assertRowBelongsToStory(db, plotThreads, id, storyId);
  await db.delete(plotThreads).where(eq(plotThreads.id, id));
  return { ok: true };
}

export async function createEvent(
  db: Database,
  userId: string,
  input: {
    storyId: string;
    title: string;
    description?: string | null;
    fictionalDate?: string | null;
    narrativeOrder?: number;
    chapterId?: string | null;
    consequences?: string | null;
    certainty?: "confirmed" | "hypothesis" | "idea";
  },
) {
  await requireOwnedStory(db, input.storyId, userId);
  const [row] = await db.insert(timelineEvents).values(input).returning();
  return row;
}

export async function updateEvent(
  db: Database,
  userId: string,
  input: { id: string; storyId: string } & Partial<{
    title: string;
    description: string | null;
    fictionalDate: string | null;
    narrativeOrder: number;
    chapterId: string | null;
    consequences: string | null;
    certainty: "confirmed" | "hypothesis" | "idea";
  }>,
) {
  await requireOwnedStory(db, input.storyId, userId);
  await assertRowBelongsToStory(db, timelineEvents, input.id, input.storyId);
  const { id, storyId, ...fields } = input;
  const [row] = await db
    .update(timelineEvents)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(timelineEvents.id, id))
    .returning();
  return row;
}

export async function deleteEvent(db: Database, userId: string, id: string, storyId: string) {
  await requireOwnedStory(db, storyId, userId);
  await assertRowBelongsToStory(db, timelineEvents, id, storyId);
  await db.delete(timelineEvents).where(eq(timelineEvents.id, id));
  return { ok: true };
}

export async function createIdea(
  db: Database,
  userId: string,
  input: {
    storyId: string;
    content: string;
    kind?: "scene" | "dialogue" | "character" | "revelation" | "research" | "note";
  },
) {
  await requireOwnedStory(db, input.storyId, userId);
  const [row] = await db.insert(storyIdeas).values(input).returning();
  return row;
}

export async function updateIdea(
  db: Database,
  userId: string,
  input: { id: string; storyId: string } & Partial<{
    content: string;
    kind: "scene" | "dialogue" | "character" | "revelation" | "research" | "note";
  }>,
) {
  await requireOwnedStory(db, input.storyId, userId);
  const [existing] = await db
    .select({ id: storyIdeas.id })
    .from(storyIdeas)
    .where(and(eq(storyIdeas.id, input.id), eq(storyIdeas.storyId, input.storyId)))
    .limit(1);
  if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Idée introuvable." });
  const { id, storyId, ...fields } = input;
  const [row] = await db
    .update(storyIdeas)
    .set(fields)
    .where(eq(storyIdeas.id, id))
    .returning();
  return row;
}

export async function deleteIdea(db: Database, userId: string, id: string, storyId: string) {
  await requireOwnedStory(db, storyId, userId);
  const [row] = await db
    .select()
    .from(storyIdeas)
    .where(and(eq(storyIdeas.id, id), eq(storyIdeas.storyId, storyId)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Idée introuvable." });
  await db.delete(storyIdeas).where(eq(storyIdeas.id, id));
  return { ok: true };
}

export async function savePlan(
  db: Database,
  userId: string,
  input: { storyId: string; title: string; structure: unknown },
) {
  await requireOwnedStory(db, input.storyId, userId);
  const [existing] = await db
    .select()
    .from(storyPlans)
    .where(eq(storyPlans.storyId, input.storyId))
    .limit(1);
  if (existing) {
    const [row] = await db
      .update(storyPlans)
      .set({ title: input.title, structure: input.structure, updatedAt: new Date() })
      .where(eq(storyPlans.id, existing.id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(storyPlans)
    .values({
      storyId: input.storyId,
      title: input.title,
      structure: input.structure,
    })
    .returning();
  return row;
}

export async function storyBibleStats(db: Database, storyId: string) {
  const [characterRows, locationRows, plotRows, eventRows, ideaRows] = await Promise.all([
    db.select({ id: characters.id }).from(characters).where(eq(characters.storyId, storyId)),
    db.select({ id: locations.id }).from(locations).where(eq(locations.storyId, storyId)),
    db.select({ id: plotThreads.id }).from(plotThreads).where(eq(plotThreads.storyId, storyId)),
    db.select({ id: timelineEvents.id }).from(timelineEvents).where(eq(timelineEvents.storyId, storyId)),
    db.select({ id: storyIdeas.id }).from(storyIdeas).where(eq(storyIdeas.storyId, storyId)),
  ]);
  return {
    characters: characterRows.length,
    locations: locationRows.length,
    plots: plotRows.length,
    events: eventRows.length,
    ideas: ideaRows.length,
  };
}


