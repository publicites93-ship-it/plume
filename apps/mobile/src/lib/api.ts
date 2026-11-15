import { createTRPCClient, httpBatchLink, httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { QueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";
import superjson from "superjson";
import type { AppRouter } from "@plume/api";
import { getAccessToken, getRefreshToken, useAuthStore } from "./auth";

/**
 * URL de l'API. Sur un appareil physique, définir EXPO_PUBLIC_API_URL avec
 * l'adresse LAN de la machine (ex. http://192.168.1.20:4000/trpc).
 * L'émulateur Android voit la machine hôte via 10.0.2.2.
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === "android"
    ? "http://10.0.2.2:4000/trpc"
    : "http://localhost:4000/trpc");

export const trpc = createTRPCReact<AppRouter>();

const refreshClient = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: API_URL,
      transformer: superjson,
    }),
  ],
});

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;
    try {
      const result = await refreshClient.auth.refresh.mutate({ refreshToken });
      await useAuthStore.getState().setSession(result.tokens);
      return result.tokens.accessToken;
    } catch {
      await useAuthStore.getState().clearSession();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

const resilientFetch: typeof fetch = async (input, init) => {
  const first = await fetch(input, init);
  if (first.status !== 401) return first;
  const token = getRefreshToken();
  if (!token) return first;
  const renewed = await refreshAccessToken();
  if (!renewed) return first;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${renewed}`);
  return fetch(input, { ...init, headers });
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false;
        const message = error instanceof Error ? error.message : "";
        return !/UNAUTHORIZED|FORBIDDEN|NOT_FOUND|BAD_REQUEST/i.test(message);
      },
    },
    mutations: {
      retry: false,
    },
  },
});

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: API_URL,
        transformer: superjson,
        maxURLLength: 2048,
        fetch: resilientFetch,
        headers() {
          const token = getAccessToken();
          return {
            "x-plume-client": "mobile",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          };
        },
      }),
    ],
  });
}

/** Invalide les données liées à une histoire après une mutation. */
export function invalidateStory(storyId: string) {
  void queryClient.invalidateQueries({ queryKey: [["stories", "list"]] });
  void queryClient.invalidateQueries({
    queryKey: [["stories", "dashboard"], { input: { storyId } }],
  });
  void queryClient.invalidateQueries({ queryKey: [["narrative", "list"]] });
}
