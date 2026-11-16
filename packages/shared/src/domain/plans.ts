export type PlanId = "free" | "plus" | "premium";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceLabel: string;
  priceCents: number;
  /** Crédits coach par mois : 1 crédit = 1 action du coach (voir AI_TASK_CREDITS). */
  aiCreditsPerMonth: number;
  activeStories: number;
  chaptersPerWeek: number;
  multiChapterAnalyses: boolean;
  narrativeMemory: boolean;
  versionComparisons: boolean;
  features: string[];
}

/**
 * Paramètres de projet, à valider économiquement avant commercialisation.
 * Les enveloppes de tokens ne sont PAS des coûts fixes.
 */
export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Plume",
    priceLabel: "Gratuit",
    priceCents: 0,
    aiCreditsPerMonth: 3,
    activeStories: 1,
    chaptersPerWeek: 3,
    multiChapterAnalyses: false,
    narrativeMemory: false,
    versionComparisons: false,
    features: [
      "Une histoire active",
      "Trois nouveaux chapitres par semaine",
      "Écriture, sauvegarde et export",
      "Lecture publique",
      "3 crédits coach par mois",
    ],
  },
  plus: {
    id: "plus",
    name: "Plume+",
    priceLabel: "4,99 € / mois",
    priceCents: 499,
    aiCreditsPerMonth: 15,
    activeStories: 5,
    chaptersPerWeek: 30,
    multiChapterAnalyses: false,
    narrativeMemory: true,
    versionComparisons: true,
    features: [
      "Cinq histoires actives",
      "15 crédits coach par mois",
      "Exercices personnalisés",
      "Historique et progression",
      "Mémoire narrative",
    ],
  },
  premium: {
    id: "premium",
    name: "Plume++",
    priceLabel: "9,99 € / mois",
    priceCents: 999,
    aiCreditsPerMonth: 30,
    activeStories: 20,
    chaptersPerWeek: 100,
    multiChapterAnalyses: true,
    narrativeMemory: true,
    versionComparisons: true,
    features: [
      "Tout Plume+",
      "Analyses multi-chapitres",
      "Mémoire narrative avancée",
      "Comparaisons longitudinales",
      "30 crédits coach par mois",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "plus", "premium"];

export const AI_TASK_KINDS = [
  "chapter_diagnostic",
  "targeted_analysis",
  "multi_chapter_analysis",
  "memory_extraction",
  "contradiction_check",
  "exercise_generation",
  "version_comparison",
  "progress_report",
  "coach_chat",
  "narrative_summary",
] as const;
export type AiTaskKind = (typeof AI_TASK_KINDS)[number];

/**
 * Coût en crédits de chaque action du coach. Règle produit : 1 crédit = 1 analyse.
 * Le coût réel (tokens, dollars) reste suivi côté serveur dans ai_usage_records.
 */
export const AI_TASK_CREDITS: Record<AiTaskKind, number> = {
  chapter_diagnostic: 1,
  targeted_analysis: 1,
  multi_chapter_analysis: 1,
  memory_extraction: 1,
  contradiction_check: 1,
  exercise_generation: 1,
  version_comparison: 1,
  progress_report: 1,
  coach_chat: 1,
  narrative_summary: 1,
};

/** Estimation de coût en tokens (suivi interne, n'est plus le quota présenté). */
export const AI_TASK_ESTIMATES: Record<AiTaskKind, number> = {
  chapter_diagnostic: 6_000,
  targeted_analysis: 2_500,
  multi_chapter_analysis: 18_000,
  memory_extraction: 4_000,
  contradiction_check: 7_000,
  exercise_generation: 2_000,
  version_comparison: 5_000,
  progress_report: 3_000,
  coach_chat: 1_500,
  narrative_summary: 4_000,
};
