import {
  palette,
  readingThemes,
  semantic,
  type ReadingThemeId,
} from "@plume/shared";

/**
 * Thème de l'application. Plume est volontairement sombre : le bleu nuit
 * protège la lecture longue et fait ressortir l'or comme un enluminure.
 * Le mode clair existe uniquement pour la lecture (thèmes sépia / ivoire).
 */
export const theme = semantic.dark;

export const gradients = {
  night: [palette.nightDeep, palette.night, palette.slate] as const,
  gold: [palette.goldBright, palette.gold, palette.goldDim] as const,
  cover: [palette.slate, palette.nightDeep] as const,
  bordeaux: [palette.bordeaux, palette.bordeauxDeep] as const,
};

export function getReadingTheme(id: ReadingThemeId) {
  return readingThemes[id];
}

export { palette, readingThemes };
export type { ReadingThemeId };
