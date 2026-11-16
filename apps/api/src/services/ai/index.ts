import { TRPCError } from "@trpc/server";
import { getConfig } from "../../config";
import { GeminiProvider } from "./gemini";
import { MockPedagogicalProvider } from "./mock";
import type { AIProvider } from "./provider";

let provider: AIProvider | null = null;

/** État du coach exposé à l'application et à /health, sans aucun secret. */
export function coachStatus(): {
  provider: "mock" | "gemini";
  isSimulation: boolean;
  available: boolean;
} {
  const config = getConfig();
  if (config.AI_PROVIDER === "mock") {
    return { provider: "mock", isSimulation: true, available: true };
  }
  return { provider: "gemini", isSimulation: false, available: Boolean(config.GEMINI_API_KEY) };
}

export function getAIProvider(): AIProvider {
  if (provider) return provider;
  const config = getConfig();
  if (config.AI_PROVIDER === "gemini" && !config.GEMINI_API_KEY) {
    // Le détail technique va au journal serveur ; l'auteur reçoit un message actionnable.
    console.error("[plume] coach indisponible : AI_PROVIDER=gemini sans GEMINI_API_KEY.");
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message:
        "Le coach n'est pas encore disponible sur ce serveur. Aucun crédit n'a été décompté et votre manuscrit est intact.",
    });
  }
  provider = config.AI_PROVIDER === "gemini" ? new GeminiProvider() : new MockPedagogicalProvider();
  return provider;
}

export function resetAIProviderForTests(): void {
  provider = null;
}
