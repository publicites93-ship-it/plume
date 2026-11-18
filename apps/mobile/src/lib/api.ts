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

/** Message affiché quand le réveil Render dépasse quelques secondes. */
export const SERVER_WAKE_MESSAGE =
  "Démarrage du serveur, cela peut prendre une minute…";

const REQUEST_TIMEOUT_MS = 30_000;
/** Les appels à l'IA (coach, studio) peuvent prendre plus de 30 s : on leur laisse 2 minutes. */
const AI_REQUEST_TIMEOUT_MS = 120_000;

function timeoutFor(input: RequestInfo | URL): number {
  return /\/trpc\/[^?]*(ai\.|learning\.reviewExercise|studio\.)/.test(requestUrl(input))
    ? AI_REQUEST_TIMEOUT_MS
    : REQUEST_TIMEOUT_MS;
}
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 15_000, 30_000, 30_000, 30_000];

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (typeof URL !== "undefined" && input instanceof URL) return input.toString();
  return (input as Request).url;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== "undefined" && input instanceof Request) return input.method.toUpperCase();
  return "GET";
}

/** Seules les lectures et les mutations d'authentification sont rejouées. */
function isRetryableRequest(input: RequestInfo | URL, init?: RequestInit): boolean {
  if (requestMethod(input, init) === "GET") return true;
  return /\/auth\.(signIn|signUp|verifyEmail|requestPasswordReset|resetPassword|resendVerification)(\?|$|\/)/.test(
    requestUrl(input),
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = timeoutFor(input),
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const externalSignal = init?.signal;
  const abortFromExternal = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", abortFromExternal);
  }
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", abortFromExternal);
  }
}

/**
 * Réessaie les lectures et les connexions/inscriptions sur erreur réseau ou
 * 502/503/504, avec un backoff plafonné à environ deux minutes. Le délai par
 * requête reste limité à 30 s pour ne pas bloquer l'interface indéfiniment.
 */
async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retryable = isRetryableRequest(input, init),
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetchWithTimeout(input, init);
      const transient = response.status === 502 || response.status === 503 || response.status === 504;
      if (!retryable || !transient || attempt === RETRY_DELAYS_MS.length) return response;
    } catch (error) {
      lastError = error;
      if (!retryable || attempt === RETRY_DELAYS_MS.length) throw error;
    }
    await delay(RETRY_DELAYS_MS[attempt] ?? 30_000);
  }
  throw lastError instanceof Error ? lastError : new Error("Réseau indisponible.");
}

/**
 * Réveille l'API Render au lancement. Ne bloque jamais l'interface : si le
 * service dort, les requêtes suivantes bénéficient du retry ci-dessus.
 */
export async function wakeServer(): Promise<boolean> {
  const healthUrl = API_URL.replace(/\/trpc\/?$/, "") + "/health";
  try {
    const response = await fetchWithTimeout(healthUrl, { method: "GET" }, 5_000);
    return response.ok;
  } catch {
    return false;
  }
}

const refreshClient = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: API_URL,
      transformer: superjson,
      // Le rafraîchissement ne doit pas déclencher une seconde boucle 401.
      fetch: (input, init) => fetchWithRetry(input, init, true),
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
  const first = await fetchWithRetry(input, init);
  if (first.status !== 401) return first;
  const token = getRefreshToken();
  if (!token) return first;
  const renewed = await refreshAccessToken();
  if (!renewed) return first;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${renewed}`);
  return fetchWithTimeout(input, { ...init, headers });
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
