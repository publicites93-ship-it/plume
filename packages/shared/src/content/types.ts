import type { SkillId } from "../domain/skills";

export interface WorkshopSection {
  title: string;
  body: string;
}

export interface WorkshopExample {
  title: string;
  text: string;
  commentary: string;
}

export interface WorkshopMistake {
  mistake: string;
  why: string;
  fix: string;
}

export interface WorkshopExercise {
  id: string;
  title: string;
  objective: string;
  instructions: string;
  criteria: string[];
  durationMinutes: number;
  observe: string;
}

export interface Workshop {
  slug: string;
  skillId: SkillId;
  title: string;
  subtitle: string;
  introduction: string;
  theory: WorkshopSection[];
  examples: WorkshopExample[];
  commonMistakes: WorkshopMistake[];
  exercises: WorkshopExercise[];
  /** Invitation à appliquer l'atelier au manuscrit en cours. */
  manuscriptPrompt: string;
}

export interface DemoChapter {
  title: string;
  content: string;
}

export interface DemoStory {
  slug: string;
  title: string;
  author: string;
  authorBio: string;
  synopsis: string;
  genre: string;
  secondaryGenres: string[];
  keywords: string[];
  contentWarnings: string[];
  status: "ongoing" | "completed";
  /** Ambiance de couverture générée par le design system (aucune image externe). */
  coverMotif: "arch" | "rose" | "quill" | "moon" | "castle";
  chapters: DemoChapter[];
}

export interface WritingPrompt {
  id: string;
  text: string;
  skillId: SkillId;
  minutes: number;
}
