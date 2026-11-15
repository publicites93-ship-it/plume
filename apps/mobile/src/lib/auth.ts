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
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (session: SessionTokens) => Promise<void>;
  clearSession: () => Promise<void>;
}

const ACCESS_KEY = "plume.session.access";
const REFRESH_KEY = "plume.session.refresh";

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  hydrated: false,
  hydrate: async () => {
    const [accessToken, refreshToken] = await Promise.all([
      getSecureItem(ACCESS_KEY),
      getSecureItem(REFRESH_KEY),
    ]);
    set({
      session: accessToken && refreshToken ? { accessToken, refreshToken } : null,
      hydrated: true,
    });
  },
  setSession: async (session) => {
    await Promise.all([
      setSecureItem(ACCESS_KEY, session.accessToken),
      setSecureItem(REFRESH_KEY, session.refreshToken),
    ]);
    set({ session });
  },
  clearSession: async () => {
    await Promise.all([deleteSecureItem(ACCESS_KEY), deleteSecureItem(REFRESH_KEY)]);
    set({ session: null });
  },
}));

export function getAccessToken(): string | null {
  return useAuthStore.getState().session?.accessToken ?? null;
}

export function getRefreshToken(): string | null {
  return useAuthStore.getState().session?.refreshToken ?? null;
}
