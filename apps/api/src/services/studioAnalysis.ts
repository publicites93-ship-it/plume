import { and, asc, count, eq, gte, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  CHARACTER_SECTIONS,
  EXTRACTABLE_CHARACTER_FIELDS,
  EXTRACTABLE_LOCATION_FIELDS,
  LOCATION_SECTIONS,
  RELATION_KIND_IDS,
  STUDIO_AI_DEFAULT_LIMITS,
  citationExists,
  countWords,
  type FactSource,
  type PlanId,
  type StudioAiFeature,
} from "@plume/shared";
import type { Database } from "../db/client";
import {
  aiUsageRecords,
  chapterAnalysisState,
  chapters,
  characterRelations,
  characters,
  locations,
  planLimits,
  stories,
  studioProposals,
  timelineEvents,
  users,
} from "../db/schema";
import { getAIProvider } from "./ai/index";
import type { ExtractedFact } from "./ai/provider";
import { effectivePlan, estimateCostMicros } from "./plans";
import { contentHash, requireOwnedStory } from "./stories";

/** Texte envoyé au modèle : borné pour rester loin du palier tarifaire des 100 000 tokens. */
const MAX_CHAPTER_CHARS = 60_000;
/** Intervalle minimal entre deux analyses automatiques d'un même chapitre. */
const AUTO_INTERVAL_MS = 10 * 60_000;
/** Une analyse « en cours » depuis plus longtemps est considérée comme interrompue. */
const STALE_RUN_MS = 5 * 60_000;
export const STUDIO_TASK_KIND = "studio_chapter_analysis";

const CHARACTER_COLUMNS = new Set(
  CHARACTER_SECTIONS.flatMap((s) => s.fields.filter((f) => f.column).map((f) => f.key)),
);
const LOCATION_COLUMNS = new Set(
  LOCATION_SECTIONS.flatMap((s) => s.fields.filter((f) => f.column).map((f) => f.key)),
);

const running = new Set<Promise<unknown>>();
/** Réservé aux tests : attend la fin des analyses lancées en arrière-plan. */
export async function waitForStudioAnalyses() {
  await Promise.all([...running]);
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Un nom (personnage, lieu, surnom) doit apparaître dans le chapitre, comme mot
 * entier, sans tenir compte des majuscules ni des accents. citationExists exige
 * au moins 8 caractères, trop pour un prénom comme « Alma ».
 */
function nameAppears(name: string, text: string): boolean {
  const needle = normalize(name);
  if (needle.length < 2) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "u").test(normalize(text));
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Quota mensuel : valeur de plan_limits si elle existe, sinon valeur par défaut. */
export async function monthlyLimit(db: Database, plan: PlanId, feature: StudioAiFeature): Promise<number> {
  const [row] = await db
    .select({ limit: planLimits.monthlyLimit })
    .from(planLimits)
    .where(and(eq(planLimits.plan, plan), eq(planLimits.feature, feature)))
    .limit(1);
  return row?.limit ?? STUDIO_AI_DEFAULT_LIMITS[plan][feature];
}

async function usageThisMonth(db: Database, userId: string, taskKind: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(aiUsageRecords)
    .where(
      and(
        eq(aiUsageRecords.userId, userId),
        eq(aiUsageRecords.taskKind, taskKind),
        gte(aiUsageRecords.createdAt, startOfMonth()),
      ),
    );
  return Number(row?.n ?? 0);
}

async function userPlan(db: Database, userId: string): Promise<PlanId> {
  const [user] = await db
    .select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Compte introuvable." });
  return effectivePlan(user);
}

export async function studioQuota(db: Database, userId: string) {
  const plan = await userPlan(db, userId);
  const [limit, used] = await Promise.all([
    monthlyLimit(db, plan, "chapter_analysis"),
    usageThisMonth(db, userId, STUDIO_TASK_KIND),
  ]);
  return { plan, chapterAnalyses: { limit, used, remaining: Math.max(0, limit - used) } };
}

export type AnalysisRequestStatus =
  | "queued"
  | "running"
  | "up_to_date"
  | "deferred"
  | "too_short"
  | "quota";

/**
 * Demande l'analyse d'un chapitre. Ne fait rien si le texte n'a pas changé ;
 * les demandes automatiques (sortie de l'éditeur) sont espacées de 10 minutes.
 * L'analyse elle-même tourne en arrière-plan et ne bloque jamais l'écriture.
 */
export async function requestChapterAnalysis(
  db: Database,
  userId: string,
  input: { chapterId: string; manual: boolean },
): Promise<{ status: AnalysisRequestStatus; limit?: number; used?: number }> {
  const [row] = await db
    .select({ chapter: chapters, story: stories })
    .from(chapters)
    .innerJoin(stories, eq(stories.id, chapters.storyId))
    .where(and(eq(chapters.id, input.chapterId), isNull(chapters.deletedAt), isNull(stories.deletedAt)))
    .limit(1);
  if (!row || row.story.authorId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Chapitre introuvable." });
  }
  const hash = contentHash(row.chapter.content);
  const [state] = await db
    .select()
    .from(chapterAnalysisState)
    .where(eq(chapterAnalysisState.chapterId, row.chapter.id))
    .limit(1);
  const now = Date.now();
  if (state?.status === "running" && state.startedAt && now - state.startedAt.getTime() < STALE_RUN_MS) {
    return { status: "running" };
  }
  if (state?.contentHash === hash && state.status === "done") return { status: "up_to_date" };
  if (!input.manual && state?.analyzedAt && now - state.analyzedAt.getTime() < AUTO_INTERVAL_MS) {
    return { status: "deferred" };
  }
  if (countWords(row.chapter.content) < 30) return { status: "too_short" };

  const quota = await studioQuota(db, userId);
  if (quota.chapterAnalyses.remaining <= 0) {
    return { status: "quota", limit: quota.chapterAnalyses.limit, used: quota.chapterAnalyses.used };
  }

  await db
    .insert(chapterAnalysisState)
    .values({ chapterId: row.chapter.id, storyId: row.story.id, status: "running", startedAt: new Date(), error: null })
    .onConflictDoUpdate({
      target: chapterAnalysisState.chapterId,
      set: { status: "running", startedAt: new Date(), error: null },
    });

  const task = runChapterAnalysis(db, userId, quota.plan, row.story, row.chapter, hash).catch(async (error) => {
    console.error(`[plume] analyse studio échouée : ${(error as Error).name}`);
    await db
      .update(chapterAnalysisState)
      .set({ status: "failed", error: "L'analyse n'a pas pu aboutir. Aucun quota n'a été décompté." })
      .where(eq(chapterAnalysisState.chapterId, row.chapter.id));
  });
  running.add(task);
  void task.finally(() => running.delete(task));
  return { status: "queued" };
}

type StoryRow = typeof stories.$inferSelect;
type ChapterRow = typeof chapters.$inferSelect;
type CharacterRow = typeof characters.$inferSelect;
type LocationRow = typeof locations.$inferSelect;

function currentValue(row: CharacterRow | LocationRow, field: string, columns: Set<string>): string {
  const raw = columns.has(field) ? (row as Record<string, unknown>)[field] : row.sheet[field];
  return raw === null || raw === undefined ? "" : String(raw).trim();
}

async function runChapterAnalysis(
  db: Database,
  userId: string,
  plan: PlanId,
  story: StoryRow,
  chapter: ChapterRow,
  hash: string,
) {
  const text = chapter.content.slice(0, MAX_CHAPTER_CHARS);
  const [characterRows, locationRows] = await Promise.all([
    db.select().from(characters).where(eq(characters.storyId, story.id)),
    db.select().from(locations).where(eq(locations.storyId, story.id)),
  ]);
  // Extraction : toujours le modèle économique (Haiku avec Claude), quelle que soit la formule.
  const provider = getAIProvider("free");
  const draft = await provider.extractStudioMemory({
    storyTitle: story.title,
    chapterTitle: chapter.title,
    chapterText: text,
    knownCharacters: characterRows.map((c) => ({ name: c.name, aliases: c.aliases })),
    knownLocations: locationRows.map((l) => l.name),
  });

  const at = new Date().toISOString();
  const source = (quote: string): FactSource => ({
    origin: "ai",
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    quote,
    at,
  });
  // Seules les informations dont la citation figure mot pour mot dans le chapitre sont retenues.
  const verified = (quote: string | null | undefined) => Boolean(quote && citationExists(quote, text));
  const summary = { characters: 0, locations: 0, fields: 0, relations: 0, events: 0, proposals: 0, discarded: 0 };

  const byName = new Map<string, CharacterRow>();
  for (const row of characterRows) {
    byName.set(normalize(row.name), row);
    for (const alias of row.aliases) byName.set(normalize(alias), row);
  }

  async function applyFacts(
    entityType: "character" | "location",
    row: CharacterRow | LocationRow,
    facts: ExtractedFact[],
    allowed: readonly string[],
    columns: Set<string>,
  ) {
    const updates: Record<string, string> = {};
    const sheet = { ...row.sheet };
    const sources = { ...row.sources };
    for (const fact of facts) {
      if (!allowed.includes(fact.field)) continue;
      if (!verified(fact.quote)) {
        summary.discarded += 1;
        continue;
      }
      const value = fact.value.trim();
      const current = currentValue(row, fact.field, columns);
      if (!current) {
        if (columns.has(fact.field)) updates[fact.field] = value;
        else sheet[fact.field] = value;
        sources[fact.field] = source(fact.quote);
        summary.fields += 1;
      } else if (normalize(current) !== normalize(value)) {
        // Champ déjà renseigné : jamais écrasé. L'auteur décide.
        const [existing] = await db
          .select({ id: studioProposals.id })
          .from(studioProposals)
          .where(
            and(
              eq(studioProposals.entityId, row.id),
              eq(studioProposals.field, fact.field),
              eq(studioProposals.proposedValue, value),
            ),
          )
          .limit(1);
        if (!existing) {
          await db.insert(studioProposals).values({
            storyId: story.id,
            entityType,
            entityId: row.id,
            field: fact.field,
            currentValue: current,
            proposedValue: value,
            sourceChapterId: chapter.id,
            sourceQuote: fact.quote,
          });
          summary.proposals += 1;
        }
      }
    }
    const table = entityType === "character" ? characters : locations;
    await db
      .update(table)
      .set({ ...updates, sheet, sources, updatedAt: new Date() })
      .where(eq(table.id, row.id));
  }

  for (const extracted of draft.characters) {
    // Un personnage dont le nom n'apparaît pas dans le chapitre est une invention : ignoré.
    if (!nameAppears(extracted.name, text)) {
      summary.discarded += 1;
      continue;
    }
    const aliases = extracted.aliases.filter((alias) => alias.trim() && nameAppears(alias, text));
    let row =
      byName.get(normalize(extracted.name)) ??
      aliases.map((alias) => byName.get(normalize(alias))).find(Boolean);
    if (!row) {
      const [created] = await db
        .insert(characters)
        .values({ storyId: story.id, name: extracted.name.trim(), aliases, origin: "ai" })
        .returning();
      row = created!;
      summary.characters += 1;
    } else {
      const known = new Set([normalize(row.name), ...row.aliases.map(normalize)]);
      const added = aliases.filter((alias) => !known.has(normalize(alias)));
      if (added.length) {
        await db.update(characters).set({ aliases: [...row.aliases, ...added].slice(0, 12) }).where(eq(characters.id, row.id));
        row = { ...row, aliases: [...row.aliases, ...added] };
      }
    }
    byName.set(normalize(row.name), row);
    for (const alias of row.aliases) byName.set(normalize(alias), row);
    await applyFacts("character", row, extracted.facts, EXTRACTABLE_CHARACTER_FIELDS, CHARACTER_COLUMNS);
  }

  const locByName = new Map(locationRows.map((row) => [normalize(row.name), row]));
  for (const extracted of draft.locations) {
    if (!nameAppears(extracted.name, text)) {
      summary.discarded += 1;
      continue;
    }
    let row = locByName.get(normalize(extracted.name));
    if (!row) {
      const [created] = await db
        .insert(locations)
        .values({ storyId: story.id, name: extracted.name.trim(), origin: "ai" })
        .returning();
      row = created!;
      locByName.set(normalize(row.name), row);
      summary.locations += 1;
    }
    await applyFacts("location", row, extracted.facts, EXTRACTABLE_LOCATION_FIELDS, LOCATION_COLUMNS);
  }

  for (const relation of draft.relations) {
    const from = byName.get(normalize(relation.from));
    const to = byName.get(normalize(relation.to));
    if (!from || !to || from.id === to.id || !(RELATION_KIND_IDS as readonly string[]).includes(relation.kind)) continue;
    if (!verified(relation.quote)) {
      summary.discarded += 1;
      continue;
    }
    const inserted = await db
      .insert(characterRelations)
      .values({
        storyId: story.id,
        fromCharacterId: from.id,
        toCharacterId: to.id,
        kind: relation.kind,
        description: relation.description,
        origin: "extracted",
        sourceChapterId: chapter.id,
        sourceQuote: relation.quote,
      })
      .onConflictDoNothing()
      .returning({ id: characterRelations.id });
    summary.relations += inserted.length;
  }

  const existingEvents = await db
    .select({ title: timelineEvents.title })
    .from(timelineEvents)
    .where(eq(timelineEvents.storyId, story.id));
  const eventTitles = new Set(existingEvents.map((event) => normalize(event.title)));
  for (const event of draft.events) {
    if (!verified(event.quote) || eventTitles.has(normalize(event.title))) {
      if (!verified(event.quote)) summary.discarded += 1;
      continue;
    }
    await db.insert(timelineEvents).values({
      storyId: story.id,
      title: event.title.trim(),
      description: event.description,
      chapterId: chapter.id,
      narrativeOrder: chapter.orderIndex * 10,
      certainty: "confirmed",
      origin: "ai",
      sourceQuote: event.quote,
    });
    eventTitles.add(normalize(event.title));
    summary.events += 1;
  }

  // Le quota n'est décompté qu'une fois l'analyse réussie.
  await db.insert(aiUsageRecords).values({
    userId,
    storyId: story.id,
    taskKind: STUDIO_TASK_KIND,
    provider: draft.provider,
    model: draft.model,
    inputTokens: draft.inputTokens,
    outputTokens: draft.outputTokens,
    estimatedCostMicros: estimateCostMicros(draft.model, draft.inputTokens, draft.outputTokens),
  });
  await db
    .update(chapterAnalysisState)
    .set({ status: "done", contentHash: hash, analyzedAt: new Date(), model: draft.model, summary, error: null })
    .where(eq(chapterAnalysisState.chapterId, chapter.id));
  void plan;
  return summary;
}

export async function analysisOverview(db: Database, userId: string, storyId: string) {
  await requireOwnedStory(db, storyId, userId);
  const [chapterRows, states, quota, pending] = await Promise.all([
    db
      .select({ id: chapters.id, title: chapters.title, content: chapters.content, orderIndex: chapters.orderIndex })
      .from(chapters)
      .where(and(eq(chapters.storyId, storyId), isNull(chapters.deletedAt)))
      .orderBy(asc(chapters.orderIndex)),
    db.select().from(chapterAnalysisState).where(eq(chapterAnalysisState.storyId, storyId)),
    studioQuota(db, userId),
    db
      .select({ n: count() })
      .from(studioProposals)
      .where(and(eq(studioProposals.storyId, storyId), eq(studioProposals.status, "pending"))),
  ]);
  const byChapter = new Map(states.map((state) => [state.chapterId, state]));
  return {
    quota,
    pendingProposals: Number(pending[0]?.n ?? 0),
    simulation: getAIProvider("free").name === "mock",
    chapters: chapterRows.map((chapter) => {
      const state = byChapter.get(chapter.id);
      const stale = state?.status === "running" && state.startedAt && Date.now() - state.startedAt.getTime() > STALE_RUN_MS;
      return {
        id: chapter.id,
        title: chapter.title,
        status: stale ? "failed" : (state?.status ?? "never"),
        upToDate: state?.status === "done" && state.contentHash === contentHash(chapter.content),
        analyzedAt: state?.analyzedAt ?? null,
        summary: state?.summary ?? {},
        error: state?.error ?? null,
      };
    }),
  };
}

export async function listProposals(db: Database, userId: string, storyId: string) {
  await requireOwnedStory(db, storyId, userId);
  return db
    .select()
    .from(studioProposals)
    .where(and(eq(studioProposals.storyId, storyId), eq(studioProposals.status, "pending")))
    .orderBy(asc(studioProposals.createdAt));
}

/**
 * Décision de l'auteur. Accepter applique la valeur et en fait une information
 * de l'auteur (prioritaire sur toute analyse future) ; refuser l'écarte.
 */
export async function decideProposal(
  db: Database,
  userId: string,
  input: { id: string; storyId: string; decision: "accept" | "reject" },
) {
  await requireOwnedStory(db, input.storyId, userId);
  const [proposal] = await db
    .select()
    .from(studioProposals)
    .where(and(eq(studioProposals.id, input.id), eq(studioProposals.storyId, input.storyId), eq(studioProposals.status, "pending")))
    .limit(1);
  if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "Proposition introuvable." });

  if (input.decision === "accept") {
    const isCharacter = proposal.entityType === "character";
    const table = isCharacter ? characters : locations;
    const columns = isCharacter ? CHARACTER_COLUMNS : LOCATION_COLUMNS;
    const [row] = await db.select().from(table).where(and(eq(table.id, proposal.entityId), eq(table.storyId, input.storyId))).limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Fiche introuvable." });
    const sources = { ...row.sources, [proposal.field]: { origin: "author", at: new Date().toISOString() } as FactSource };
    const patch = columns.has(proposal.field)
      ? { [proposal.field]: proposal.proposedValue }
      : { sheet: { ...row.sheet, [proposal.field]: proposal.proposedValue } };
    await db.update(table).set({ ...patch, sources, updatedAt: new Date() }).where(eq(table.id, row.id));
  }
  await db
    .update(studioProposals)
    .set({ status: input.decision === "accept" ? "accepted" : "rejected", decidedAt: new Date() })
    .where(eq(studioProposals.id, proposal.id));
  return { ok: true };
}
