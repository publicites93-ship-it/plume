import type { SkillId } from "@plume/shared";

export interface AnalysisFindingDraft {
  kind: "strength" | "improvement" | "question";
  title: string;
  observation: string;
  quote: string | null;
  explanation: string;
  impact: string | null;
  priority: "low" | "medium" | "high";
  confidence: number;
  recommendation: string | null;
  exercise: string | null;
}

export interface AnalysisDraft {
  summary: string;
  score: number;
  confidence: number;
  findings: AnalysisFindingDraft[];
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Vrai uniquement pour un fournisseur réel ; faux pour la simulation locale. */
  isSimulation: boolean;
}

export interface AnalysisProviderInput {
  skill: SkillId;
  manuscript: string;
  chapterTitle: string;
  storyTitle: string;
  scope: "chapter" | "selection";
  authorContext?: string;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  analyzeChapter(input: AnalysisProviderInput): Promise<AnalysisDraft>;
}

export class ProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}
