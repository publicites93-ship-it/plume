import { DevSettings, Platform } from "react-native";
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

/**
 * Thèmes clairs. Chaque couleur de texte atteint au moins 4,5:1 (WCAG AA) sur
 * TOUS les fonds de son thème, y compris le plus foncé (« enfoncé »).
 *
 * Sépia et Ivoire doivent se distinguer au premier coup d'œil : Sépia est un
 * papier jauni, chaud et doré ; Ivoire un blanc cassé presque neutre.
 *
 * Sur fond clair, le rôle des deux ors s'inverse : `goldBright` sert d'accent
 * appuyé (badges, chiffres, onglet actif) et doit donc être le plus FONCÉ des
 * deux, alors qu'il est le plus lumineux sur le thème Nuit.
 */
const light = {
  textOnGold: "#241B0D",
  overlay: "rgba(42,33,27,0.45)",
};

const THEMES: Record<AppThemeId, SemanticTheme> = {
  night: semantic.dark,
  sepia: {
    ...light,
    background: "#EDDCB8",
    backgroundDeep: "#E6D2A9",
    surface: "#F4E6C8",
    surfaceRaised: "#F8EDD5",
    surfaceSunken: "#E2CDA2",
    textPrimary: "#3A2E24",
    textSecondary: "#5B4B3C",
    textMuted: "#65533F",
    border: "rgba(92,70,40,0.24)",
    borderStrong: "rgba(107,82,47,0.50)",
    gold: "#6B522F",
    goldBright: "#5C4628",
    danger: "#8A3F3F",
    success: "#455D42",
    warning: "#6F5129",
    info: "#455870",
  },
  ivory: {
    ...light,
    background: "#FBFAF7",
    backgroundDeep: "#F7F6F2",
    surface: "#FFFFFF",
    surfaceRaised: "#FFFFFF",
    surfaceSunken: "#EEECE6",
    textPrimary: "#1F1B17",
    textSecondary: "#4A4038",
    textMuted: "#655A4F",
    border: "rgba(60,52,44,0.16)",
    borderStrong: "rgba(113,87,50,0.42)",
    gold: "#715732",
    goldBright: "#624B2B",
    danger: "#8E4242",
    success: "#496246",
    warning: "#75562C",
    info: "#495D77",
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
  await SecureStore.setItemAsync(THEME_KEY, id);
  try {
    await reloadAppAsync("Changement de thème");
  } catch (error) {
    // Expo Go / développement : relance par le serveur Metro.
    if (__DEV__) DevSettings.reload("Changement de thème");
    else throw error;
  }
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
