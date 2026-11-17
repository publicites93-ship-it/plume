import { create } from "zustand";
import { deleteSecureItem, getSecureItem, setSecureItem } from "./storage";

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn?: number;
  refreshTokenExpiresIn?: number;
}

interface AuthState {
  session: SessionTokens | null;
  /**
   * « Se souvenir de moi ». Vrai : la session est gardée dans le stockage
   * chiffré du téléphone (30 jours renouvelables). Faux : elle ne vit qu'en
   * mémoire et disparaît à la fermeture complète de l'appli.
   */
  remember: boolean;
  /** Adresse pré-remplie à l'écran de connexion (jamais le mot de passe). */
  rememberedEmail: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setRemember: (remember: boolean, email?: string | null) => Promise<void>;
  setSession: (session: SessionTokens) => Promise<void>;
  clearSession: () => Promise<void>;
}

const ACCESS_KEY = "plume.session.access";
const REFRESH_KEY = "plume.session.refresh";
const REMEMBER_KEY = "plume.session.remember";
const EMAIL_KEY = "plume.session.email";

async function persistTokens(session: SessionTokens) {
  await Promise.all([
    setSecureItem(ACCESS_KEY, session.accessToken),
    setSecureItem(REFRESH_KEY, session.refreshToken),
  ]);
}

async function forgetTokens() {
  await Promise.all([deleteSecureItem(ACCESS_KEY), deleteSecureItem(REFRESH_KEY)]);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  // Les comptes existants restaient connectés : on conserve ce comportement
  // tant qu'aucun choix n'a été fait à l'écran de connexion.
  remember: true,
  rememberedEmail: null,
  hydrated: false,
  hydrate: async () => {
    const [accessToken, refreshToken, rememberRaw, email] = await Promise.all([
      getSecureItem(ACCESS_KEY),
      getSecureItem(REFRESH_KEY),
      getSecureItem(REMEMBER_KEY),
      getSecureItem(EMAIL_KEY),
    ]);
    const remember = rememberRaw !== "0";
    set({
      session: remember && accessToken && refreshToken ? { accessToken, refreshToken } : null,
      remember,
      rememberedEmail: email,
      hydrated: true,
    });
    // Une session éventuellement restée sur le disque alors que l'option est
    // désactivée est effacée.
    if (!remember && (accessToken || refreshToken)) await forgetTokens();
  },
  setRemember: async (remember, email) => {
    set({ remember, rememberedEmail: remember ? (email ?? get().rememberedEmail) : null });
    await setSecureItem(REMEMBER_KEY, remember ? "1" : "0");
    if (remember && email) {
      await setSecureItem(EMAIL_KEY, email);
    } else if (!remember) {
      await deleteSecureItem(EMAIL_KEY);
      await forgetTokens();
    }
  },
  setSession: async (session) => {
    set({ session });
    // Le renouvellement des jetons passe aussi par ici : il respecte le choix.
    if (get().remember) await persistTokens(session);
  },
  clearSession: async () => {
    await forgetTokens();
    set({ session: null });
  },
}));

export function getAccessToken(): string | null {
  return useAuthStore.getState().session?.accessToken ?? null;
}

export function getRefreshToken(): string | null {
  return useAuthStore.getState().session?.refreshToken ?? null;
}
