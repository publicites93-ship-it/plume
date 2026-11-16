/**
 * Réactions de lecture partagées entre l'API et l'application.
 * Chaque lecteur peut poser au plus une réaction de chaque type sur une histoire,
 * et au plus MAX_REACTIONS_PER_READER au total.
 */
export const STORY_REACTIONS = [
  { id: "frisson", emoji: "😱", label: "Frisson" },
  { id: "tension", emoji: "😬", label: "Tension" },
  { id: "love", emoji: "😍", label: "Love" },
  { id: "decroche", emoji: "😴", label: "Je décroche" },
] as const;

export type StoryReactionKind = (typeof STORY_REACTIONS)[number]["id"];

export const STORY_REACTION_IDS = STORY_REACTIONS.map((r) => r.id) as [
  StoryReactionKind,
  ...StoryReactionKind[],
];

export const MAX_REACTIONS_PER_READER = 5;

export const COMMENT_MAX_LENGTH = 2000;
