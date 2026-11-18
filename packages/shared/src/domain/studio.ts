/**
 * Studio d'écriture : structure des fiches, partagée par l'API et l'application.
 *
 * Chaque champ est soit une colonne historique de la bible (`column`), soit une
 * entrée du dictionnaire `sheet` (jsonb). Ainsi les fiches déjà saisies sont
 * conservées telles quelles, et de nouveaux champs s'ajoutent sans migration.
 */

export interface StudioField {
  key: string;
  label: string;
  /** Colonne existante de la table ; sinon le champ vit dans `sheet`. */
  column?: boolean;
  multiline?: boolean;
  placeholder?: string;
}

export interface StudioSection {
  id: string;
  title: string;
  icon: string;
  fields: StudioField[];
}

export const CHARACTER_SECTIONS: StudioSection[] = [
  {
    id: "identity",
    title: "Identité",
    icon: "person-outline",
    fields: [
      { key: "role", label: "Rôle dans l'histoire", column: true, placeholder: "Protagoniste, témoin, antagoniste…" },
      { key: "nickname", label: "Surnom" },
      { key: "age", label: "Âge" },
      { key: "profession", label: "Profession" },
    ],
  },
  {
    id: "appearance",
    title: "Apparence",
    icon: "eye-outline",
    fields: [
      { key: "physical", label: "Caractéristiques physiques", multiline: true },
      { key: "hair", label: "Coiffure" },
      { key: "clothing", label: "Style vestimentaire", multiline: true },
      { key: "accessories", label: "Accessoires" },
      { key: "marks", label: "Signes distinctifs" },
    ],
  },
  {
    id: "personality",
    title: "Personnalité",
    icon: "happy-outline",
    fields: [
      { key: "summary", label: "Caractère", column: true, multiline: true },
      { key: "qualities", label: "Qualités", multiline: true },
      { key: "flaws", label: "Défauts", multiline: true },
      { key: "temperament", label: "Tempérament" },
      { key: "habits", label: "Habitudes et manies", multiline: true },
      { key: "mood", label: "Humeur dominante" },
      { key: "speech", label: "Manière de parler", multiline: true },
    ],
  },
  {
    id: "tastes",
    title: "Goûts",
    icon: "heart-outline",
    fields: [
      { key: "likes", label: "Aime", multiline: true },
      { key: "dislikes", label: "Déteste", multiline: true },
      { key: "passions", label: "Passions", multiline: true },
    ],
  },
  {
    id: "psychology",
    title: "Psychologie",
    icon: "bulb-outline",
    fields: [
      { key: "motivation", label: "Motivations", column: true, multiline: true },
      { key: "goals", label: "Objectifs", multiline: true },
      { key: "fear", label: "Peurs", column: true, multiline: true },
      { key: "wounds", label: "Blessures émotionnelles", multiline: true },
      { key: "secret", label: "Secrets", column: true, multiline: true },
      { key: "contradictions", label: "Contradictions", multiline: true },
    ],
  },
  {
    id: "evolution",
    title: "Évolution",
    icon: "trending-up-outline",
    fields: [
      { key: "firstAppearance", label: "Première apparition" },
      { key: "keyEvents", label: "Événements importants", multiline: true },
      { key: "arc", label: "Évolution narrative", column: true, multiline: true },
      { key: "changes", label: "Changements de personnalité", multiline: true },
    ],
  },
  {
    id: "notes",
    title: "Notes",
    icon: "document-text-outline",
    fields: [{ key: "notes", label: "Notes libres", column: true, multiline: true }],
  },
];

export const LOCATION_SECTIONS: StudioSection[] = [
  {
    id: "identity",
    title: "Identité",
    icon: "location-outline",
    fields: [{ key: "type", label: "Type de lieu", placeholder: "Maison, forêt, ville, vaisseau…" }],
  },
  {
    id: "senses",
    title: "Description et ambiance",
    icon: "color-palette-outline",
    fields: [
      { key: "description", label: "Description visuelle", column: true, multiline: true },
      { key: "atmosphere", label: "Atmosphère générale", column: true, multiline: true },
      { key: "sensations", label: "Sons, odeurs et sensations", multiline: true },
      { key: "lighting", label: "Éclairage, météo ou saison", multiline: true },
      { key: "particularities", label: "Particularités", multiline: true },
    ],
  },
  {
    id: "story",
    title: "Dans le récit",
    icon: "book-outline",
    fields: [
      { key: "history", label: "Histoire du lieu", column: true, multiline: true },
      { key: "events", label: "Événements importants", multiline: true },
      { key: "notes", label: "Notes", column: true, multiline: true },
    ],
  },
];

const sheetKeys = (sections: StudioSection[]) =>
  sections.flatMap((section) => section.fields.filter((field) => !field.column).map((field) => field.key));

/** Clés autorisées dans `sheet` : le serveur refuse toute autre clé. */
export const CHARACTER_SHEET_KEYS = sheetKeys(CHARACTER_SECTIONS);
export const LOCATION_SHEET_KEYS = sheetKeys(LOCATION_SECTIONS);

export const RELATION_KINDS = [
  { id: "family", label: "Famille" },
  { id: "friend", label: "Amitié" },
  { id: "love", label: "Amour" },
  { id: "rival", label: "Rivalité" },
  { id: "enemy", label: "Ennemi" },
  { id: "mentor", label: "Mentor" },
  { id: "ally", label: "Allié" },
  { id: "other", label: "Autre" },
] as const;
export type RelationKind = (typeof RELATION_KINDS)[number]["id"];
export const RELATION_KIND_IDS = RELATION_KINDS.map((kind) => kind.id) as [RelationKind, ...RelationKind[]];

export const PLOT_KINDS = [
  { id: "main", label: "Intrigue principale" },
  { id: "secondary", label: "Intrigue secondaire" },
] as const;

/** Niveau de certitude d'un événement : établi dans le texte, supposé, ou envisagé pour la suite. */
export const EVENT_CERTAINTY = [
  { id: "confirmed", label: "Confirmé" },
  { id: "hypothesis", label: "Hypothèse" },
  { id: "idea", label: "Idée pour la suite" },
] as const;

/** Images du studio (portraits, lieux) : plafonds tant que le stockage reste en base. */
export const STUDIO_MEDIA_MAX_PER_ENTITY = 3;
export const STUDIO_MEDIA_MAX_BYTES = 300 * 1024;

/**
 * Champs que l'analyse automatique peut renseigner. Les champs de pure intention
 * de l'auteur (arc, notes, évolution future) restent réservés à l'auteur.
 */
export const EXTRACTABLE_CHARACTER_FIELDS = [
  "role", "nickname", "age", "profession", "physical", "hair", "clothing", "accessories", "marks",
  "summary", "qualities", "flaws", "temperament", "habits", "mood", "speech",
  "likes", "dislikes", "passions", "motivation", "goals", "fear", "wounds", "secret", "firstAppearance",
] as const;
export const EXTRACTABLE_LOCATION_FIELDS = [
  "type", "description", "atmosphere", "sensations", "lighting", "particularities",
] as const;

/** Origine d'une information du studio. */
export type FactOrigin = "author" | "ai";
export interface FactSource {
  origin: FactOrigin;
  chapterId?: string;
  chapterTitle?: string;
  quote?: string;
  at: string;
}

/** Fonctions IA du studio soumises à quota mensuel (valeurs modifiables en base : plan_limits). */
export const STUDIO_AI_FEATURES = ["chapter_analysis", "muse_quick", "muse_deep", "coherence"] as const;
export type StudioAiFeature = (typeof STUDIO_AI_FEATURES)[number];

/** Quotas par défaut (décision du 17/11/2026 : Muse mixte rapide/approfondie). */
export const STUDIO_AI_DEFAULT_LIMITS: Record<"free" | "plus" | "premium", Record<StudioAiFeature, number>> = {
  free: { chapter_analysis: 2, muse_quick: 5, muse_deep: 0, coherence: 0 },
  plus: { chapter_analysis: 25, muse_quick: 80, muse_deep: 10, coherence: 5 },
  premium: { chapter_analysis: 100, muse_quick: 300, muse_deep: 40, coherence: 30 },
};
