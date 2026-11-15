/**
 * Utilitaires de texte partagés par l'éditeur, le lecteur et l'API.
 * Aucun accès au DOM : testables dans Node.
 */

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;

export function countWords(text: string): number {
  if (!text) return 0;
  const cleaned = stripMarkdown(text);
  const matches = cleaned.match(WORD_PATTERN);
  return matches ? matches.length : 0;
}

export function countCharacters(text: string, options?: { withSpaces?: boolean }): number {
  if (!text) return 0;
  if (options?.withSpaces === false) return text.replace(/\s/g, "").length;
  return text.length;
}

/** Estimation à 220 mots/minute, plancher à 1 minute pour un texte non vide. */
export function readingTimeMinutes(words: number, wordsPerMinute = 220): number {
  if (words <= 0) return 0;
  return Math.max(1, Math.round(words / wordsPerMinute));
}

/** Retire les marqueurs Markdown légers utilisés par l'éditeur Plume. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*([-*_]\s*){3,}$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function excerpt(text: string, maxLength = 180): string {
  const cleaned = stripMarkdown(text).replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  const cut = cleaned.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > maxLength * 0.6 ? lastSpace : maxLength).trimEnd()}…`;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export interface TextDiffPart {
  type: "equal" | "add" | "remove";
  value: string;
}

/**
 * Diff mot à mot (LCS) pour comparer deux versions de manuscrit.
 * Limité à 3 000 jetons par côté pour rester réactif ; au-delà, un diff
 * par blocs de lignes est utilisé.
 */
export function diffWords(oldText: string, newText: string): TextDiffPart[] {
  const tokenize = (value: string) => value.match(/\S+|\s+/g) ?? [];
  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);

  if (oldTokens.length > 3000 || newTokens.length > 3000) {
    return coarseDiff(oldText, newText);
  }

  const n = oldTokens.length;
  const m = newTokens.length;
  const table: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));

  for (let i = n - 1; i >= 0; i--) {
    const row = table[i]!;
    const next = table[i + 1]!;
    for (let j = m - 1; j >= 0; j--) {
      row[j] =
        oldTokens[i] === newTokens[j]
          ? next[j + 1]! + 1
          : Math.max(next[j]!, row[j + 1]!);
    }
  }

  const parts: TextDiffPart[] = [];
  const push = (type: TextDiffPart["type"], value: string) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.value += value;
    else parts.push({ type, value });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (oldTokens[i] === newTokens[j]) {
      push("equal", oldTokens[i]!);
      i++;
      j++;
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) {
      push("remove", oldTokens[i]!);
      i++;
    } else {
      push("add", newTokens[j]!);
      j++;
    }
  }
  while (i < n) push("remove", oldTokens[i++]!);
  while (j < m) push("add", newTokens[j++]!);

  return parts;
}

function coarseDiff(oldText: string, newText: string): TextDiffPart[] {
  const oldLines = oldText.split(/(?<=\n)/);
  const newLines = newText.split(/(?<=\n)/);
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);
  const parts: TextDiffPart[] = [];
  const push = (type: TextDiffPart["type"], value: string) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.value += value;
    else parts.push({ type, value });
  };
  for (const line of oldLines) if (!newSet.has(line)) push("remove", line);
  for (const line of newLines) if (!oldSet.has(line)) push("add", line);
  return parts;
}

/** Vérifie qu'une citation existe réellement dans le manuscrit (anti-hallucination). */
export function citationExists(quote: string, manuscript: string): boolean {
  const normalize = (value: string) =>
    value
      .replace(/[«»“”"']/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  const needle = normalize(quote);
  if (needle.length < 8) return false;
  return normalize(manuscript).includes(needle);
}

/** Extrait un passage autour d'une citation pour l'affichage des preuves. */
export function contextAround(
  manuscript: string,
  quote: string,
  radius = 120,
): string {
  const index = manuscript.toLowerCase().indexOf(quote.toLowerCase());
  if (index === -1) return "";
  const start = Math.max(0, index - radius);
  const end = Math.min(manuscript.length, index + quote.length + radius);
  return `${start > 0 ? "…" : ""}${manuscript.slice(start, end).trim()}${
    end < manuscript.length ? "…" : ""
  }`;
}
