/**
 * Jetons de design de Plume — source unique de vérité partagée par
 * l'application mobile, la documentation et les tests de contraste.
 *
 * Direction artistique : bibliothèque gothique enchantée. Bleu nuit et
 * parchemin dominants, or ancien réservé aux accents et aux bordures.
 */
export const palette = {
  night: "#101827",
  nightDeep: "#0B111C",
  nightSoft: "#162133",
  slate: "#1C283B",
  ink: "#24344B",
  inkSoft: "#2E4058",
  parchment: "#F1E6D1",
  parchmentDeep: "#E4D5B8",
  ivory: "#FAF5EA",
  gold: "#C5A46A",
  goldBright: "#E0C58A",
  goldDim: "#8C7550",
  bordeaux: "#673A49",
  bordeauxDeep: "#4C2A36",
  rose: "#B88791",
  leather: "#493A33",
  leatherDeep: "#332824",
  // Sémantique
  success: "#8FAF8B",
  warning: "#D3A566",
  danger: "#C77C7C",
  info: "#8FA3C0",
} as const;

export const semantic = {
  dark: {
    background: palette.night,
    backgroundDeep: palette.nightDeep,
    surface: palette.slate,
    surfaceRaised: palette.ink,
    surfaceSunken: "#0D1522",
    textPrimary: "#F4EBDD",
    textSecondary: "#C3B7A4",
    textMuted: "#938A7C",
    textOnGold: "#1A1409",
    border: "rgba(197,164,106,0.24)",
    borderStrong: "rgba(197,164,106,0.48)",
    gold: palette.gold,
    goldBright: palette.goldBright,
    danger: palette.danger,
    success: palette.success,
    warning: palette.warning,
    info: palette.info,
    overlay: "rgba(5,9,15,0.72)",
  },
  parchment: {
    background: palette.parchment,
    backgroundDeep: palette.parchmentDeep,
    surface: palette.ivory,
    surfaceRaised: "#FFFBF2",
    surfaceSunken: "#E8DAC0",
    textPrimary: "#2A211B",
    textSecondary: "#5B4B3C",
    textMuted: "#7C6A57",
    textOnGold: "#241B0D",
    border: "rgba(73,58,51,0.20)",
    borderStrong: "rgba(140,117,80,0.45)",
    gold: palette.goldDim,
    goldBright: "#A8874F",
    danger: "#8E4242",
    success: "#4F6B4C",
    warning: "#8A6534",
    info: "#4E637F",
    overlay: "rgba(42,33,27,0.45)",
  },
} as const;

export const typography = {
  display: "PlayfairDisplay_600SemiBold",
  displayItalic: "PlayfairDisplay_600SemiBold_Italic",
  displayBold: "PlayfairDisplay_700Bold",
  literary: "Lora_400Regular",
  literaryItalic: "Lora_400Regular_Italic",
  literaryMedium: "Lora_500Medium",
  ui: "Inter_400Regular",
  uiMedium: "Inter_500Medium",
  uiSemibold: "Inter_600SemiBold",
} as const;

export const fontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 25,
  "2xl": 31,
  "3xl": 38,
  "4xl": 46,
} as const;

export const lineHeights = {
  tight: 1.18,
  snug: 1.32,
  normal: 1.5,
  relaxed: 1.62,
  reading: 1.72,
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48,
  10: 64,
  11: 80,
  12: 96,
} as const;

export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const motion = {
  fast: 140,
  normal: 240,
  slow: 420,
  ceremonial: 720,
} as const;

export const touchTarget = {
  minimum: 44,
  comfortable: 48,
} as const;

export type ReadingThemeId = "night" | "sepia" | "ivory";

export interface ReadingTheme {
  id: ReadingThemeId;
  label: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
}

export const readingThemes: Record<ReadingThemeId, ReadingTheme> = {
  night: {
    id: "night",
    label: "Nuit",
    background: "#0E1420",
    surface: "#17202F",
    text: "#E9E0CF",
    textMuted: "#A79C8A",
    accent: palette.gold,
  },
  sepia: {
    id: "sepia",
    label: "Sépia",
    background: "#EDDCB8",
    surface: "#F4E6C8",
    text: "#3A2E24",
    textMuted: "#65533F",
    accent: "#6B522F",
  },
  ivory: {
    id: "ivory",
    label: "Ivoire",
    background: "#FBFAF7",
    surface: "#FFFFFF",
    text: "#1F1B17",
    textMuted: "#655A4F",
    accent: "#715732",
  },
};

/** Échelle de taille de texte proposée dans les réglages. */
export const fontScaleOptions = [0.9, 1, 1.1, 1.25, 1.4] as const;
export type FontScale = (typeof fontScaleOptions)[number];

/** Genres proposés à l'onboarding et au catalogue. */
export const GENRES = [
  "Fantasy",
  "Romance",
  "Fantastique",
  "Thriller",
  "Science-fiction",
  "Historique",
  "Horreur",
  "Mystère",
  "Aventure",
  "Drame",
  "Contemporain",
  "Young Adult",
] as const;
export type Genre = (typeof GENRES)[number];

export const CONTENT_WARNINGS = [
  "Violence",
  "Mort",
  "Contenu sexuel",
  "Troubles mentaux",
  "Addiction",
  "Discrimination",
  "Guerre",
] as const;
