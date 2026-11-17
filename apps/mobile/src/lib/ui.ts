import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { fontScaleOptions, type FontScale, type ReadingThemeId } from "@plume/shared";

/** Police du lecteur : Lora (classique, à empattements) ou Inter (moderne). */
export type ReadingFont = "serif" | "sans";

interface UiState {
  fontScale: FontScale;
  readingFont: ReadingFont;
  readingTheme: ReadingThemeId;
  writingTheme: ReadingThemeId;
  reduceMotion: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setFontScale: (scale: FontScale) => void;
  setReadingFont: (font: ReadingFont) => void;
  setReadingTheme: (theme: ReadingThemeId) => void;
  setWritingTheme: (theme: ReadingThemeId) => void;
  setReduceMotion: (value: boolean) => void;
  applyRemote: (prefs: {
    fontScale?: number;
    readingTheme?: string;
    writingTheme?: string;
    reduceMotion?: boolean;
  }) => void;
}

const KEY = "plume.ui.preferences";

function normalizeScale(value: number): FontScale {
  return (fontScaleOptions.find((option) => Math.abs(option - value) < 0.01) ?? 1) as FontScale;
}

function normalizeTheme(value?: string): ReadingThemeId {
  return value === "sepia" || value === "ivory" || value === "night" ? value : "night";
}

async function persist(state: {
  fontScale: FontScale;
  readingFont: ReadingFont;
  readingTheme: ReadingThemeId;
  writingTheme: ReadingThemeId;
  reduceMotion: boolean;
}) {
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify({
      fontScale: state.fontScale,
      readingFont: state.readingFont,
      readingTheme: state.readingTheme,
      writingTheme: state.writingTheme,
      reduceMotion: state.reduceMotion,
    }),
  );
}

export const useUiStore = create<UiState>((set, get) => ({
  fontScale: 1,
  readingFont: "serif",
  readingTheme: "night",
  writingTheme: "night",
  reduceMotion: false,
  hydrated: false,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        set({
          fontScale: normalizeScale(Number(parsed.fontScale ?? 1)),
          readingFont: parsed.readingFont === "sans" ? "sans" : "serif",
          readingTheme: normalizeTheme(String(parsed.readingTheme ?? "night")),
          writingTheme: normalizeTheme(String(parsed.writingTheme ?? "night")),
          reduceMotion: Boolean(parsed.reduceMotion ?? false),
        });
      }
    } finally {
      set({ hydrated: true });
    }
  },
  setFontScale: (fontScale) => {
    set({ fontScale });
    void persist({ ...get(), fontScale });
  },
  setReadingFont: (readingFont) => {
    set({ readingFont });
    void persist({ ...get(), readingFont });
  },
  setReadingTheme: (readingTheme) => {
    set({ readingTheme });
    void persist({ ...get(), readingTheme });
  },
  setWritingTheme: (writingTheme) => {
    set({ writingTheme });
    void persist({ ...get(), writingTheme });
  },
  setReduceMotion: (reduceMotion) => {
    set({ reduceMotion });
    void persist({ ...get(), reduceMotion });
  },
  applyRemote: (prefs) => {
    const next = {
      fontScale: prefs.fontScale ? normalizeScale(prefs.fontScale) : get().fontScale,
      readingTheme: prefs.readingTheme ? normalizeTheme(prefs.readingTheme) : get().readingTheme,
      writingTheme: prefs.writingTheme ? normalizeTheme(prefs.writingTheme) : get().writingTheme,
      reduceMotion: prefs.reduceMotion ?? get().reduceMotion,
    };
    set(next);
    void persist({ ...get(), ...next });
  },
}));
