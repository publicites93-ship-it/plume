import { Platform } from "react-native";
import { reloadAppAsync } from "expo";
import * as SecureStore from "expo-secure-store";
import {
  palette,
  readingThemes,
  semantic,
  type ReadingThemeId,
} from "@plume/shared";

/**
 * Thème de toute l'application : Nuit (par défaut), Sépia ou Ivoire.
 *
 * Les styles des écrans sont calculés une seule fois, au chargement des
 * modules. Le thème est donc lu de façon synchrone AVANT tout écran, et un
 * changement de thème relance l'interface (voir setAppTheme).
 */
export type AppThemeId = "night" | "sepia" | "ivory";

const THEME_KEY = "plume.app.theme";

function readStoredTheme(): AppThemeId {
  try {
    const value =
      Platform.OS === "web" ? globalThis.localStorage?.getItem(THEME_KEY) : SecureStore.getItem(THEME_KEY);
    return value === "sepia" || value === "ivory" ? value : "night";
  } catch {
    return "night";
  }
}

type SemanticTheme = { [K in keyof typeof semantic.dark]: string };

const light = {
  danger: "#8E4242",
  success: "#4F6B4C",
  warning: "#8A6534",
  info: "#4E637F",
  textOnGold: "#241B0D",
  overlay: "rgba(42,33,27,0.45)",
};

const THEMES: Record<AppThemeId, SemanticTheme> = {
  night: semantic.dark,
  sepia: {
    ...light,
    background: readingThemes.sepia.background,
    backgroundDeep: "#E4D5B8",
    surface: readingThemes.sepia.surface,
    surfaceRaised: "#FAF2E2",
    surfaceSunken: "#E2D3B4",
    textPrimary: readingThemes.sepia.text,
    textSecondary: "#5B4B3C",
    textMuted: readingThemes.sepia.textMuted,
    border: "rgba(73,58,51,0.20)",
    borderStrong: "rgba(140,117,80,0.45)",
    gold: readingThemes.sepia.accent,
    goldBright: "#A8874F",
  },
  ivory: {
    ...light,
    background: readingThemes.ivory.background,
    backgroundDeep: "#F1E6D1",
    surface: readingThemes.ivory.surface,
    surfaceRaised: "#FFFFFF",
    surfaceSunken: "#EFE6D3",
    textPrimary: readingThemes.ivory.text,
    textSecondary: "#5B4B3C",
    textMuted: readingThemes.ivory.textMuted,
    border: "rgba(73,58,51,0.18)",
    borderStrong: "rgba(140,117,80,0.42)",
    gold: readingThemes.ivory.accent,
    goldBright: "#A8874F",
  },
};

export const appThemeId: AppThemeId = readStoredTheme();
export const isDarkTheme = appThemeId === "night";

/** Couleurs sémantiques du thème actif (fonds, textes, accents). */
export const theme: SemanticTheme & { sheet: string } = {
  ...THEMES[appThemeId],
  // Fond des panneaux coulissants : légèrement détaché du fond de l'écran.
  sheet: isDarkTheme ? palette.nightSoft : THEMES[appThemeId].surface,
};

/** Couleur avec transparence, à partir d'une couleur #RRGGBB. */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const gradients = {
  night: [theme.backgroundDeep, theme.background, theme.surface] as const,
  gold: [palette.goldBright, palette.gold, palette.goldDim] as const,
  cover: [palette.slate, palette.nightDeep] as const,
  bordeaux: [palette.bordeaux, palette.bordeauxDeep] as const,
};

/** Enregistre le thème puis relance l'interface pour l'appliquer partout. */
export async function setAppTheme(id: AppThemeId): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(THEME_KEY, id);
    globalThis.location?.reload();
    return;
  }
  SecureStore.setItem(THEME_KEY, id);
  await reloadAppAsync("Changement de thème");
}

export const APP_THEME_OPTIONS: Array<{ id: AppThemeId; label: string; background: string; text: string }> = [
  { id: "night", label: "Nuit", background: THEMES.night.background, text: THEMES.night.textPrimary },
  { id: "sepia", label: "Sépia", background: THEMES.sepia.background, text: THEMES.sepia.textPrimary },
  { id: "ivory", label: "Ivoire", background: THEMES.ivory.background, text: THEMES.ivory.textPrimary },
];

export function getReadingTheme(id: ReadingThemeId) {
  return readingThemes[id];
}

export { palette, readingThemes };
export type { ReadingThemeId };
