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

export interface CoachEvidence {
  quote: string;
  observation: string;
  recommendation: string | null;
  skill: string;
}

export interface CoachChatProviderInput {
  storyTitle: string;
  chapterTitle: string | null;
  chapterExcerpt: string | null;
  evidence: CoachEvidence[];
  history: Array<{ role: "user" | "assistant"; content: string }>;
  message: string;
}

export interface CoachChatDraft {
  reply: string;
  /** Citations proposées par le modèle ; le service les vérifie avant stockage. */
  citations: string[];
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  isSimulation: boolean;
}

export interface ExerciseReviewProviderInput {
  exerciseTitle: string;
  instructions: string;
  criteria: string[];
  skillName: string;
  content: string;
}

export interface ExerciseReviewDraft {
  feedback: string;
  strengths: string[];
  improvements: string[];
  nextStep: string;
  score: number | null;
  confidence: number;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  isSimulation: boolean;
}

export interface StoryAnalysisProviderInput {
  storyTitle: string;
  chapterTitle: string;
  manuscript: string;
}

export interface StorySkillAnalysisDraft {
  skill: SkillId;
  summary: string;
  score: number;
  confidence: number;
  findings: AnalysisFindingDraft[];
}

export interface StoryAnalysisDraft {
  analyses: StorySkillAnalysisDraft[];
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  isSimulation: boolean;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  analyzeChapter(input: AnalysisProviderInput): Promise<AnalysisDraft>;
  analyzeStory(input: StoryAnalysisProviderInput): Promise<StoryAnalysisDraft>;
  coachReply(input: CoachChatProviderInput): Promise<CoachChatDraft>;
  reviewExercise(input: ExerciseReviewProviderInput): Promise<ExerciseReviewDraft>;
}

export class ProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}
