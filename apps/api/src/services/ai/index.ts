import { TRPCError } from "@trpc/server";
import { getConfig } from "../../config";
import { AnthropicProvider, anthropicApiKey } from "./anthropic";
import { GeminiProvider } from "./gemini";
import { MockPedagogicalProvider } from "./mock";
import type { AIProvider } from "./provider";
import type { PlanId } from "@plume/shared";

const providers = new Map<string, AIProvider>();

/** État du coach exposé à l'application et à /health, sans aucun secret. */
export function coachStatus(): {
  provider: "mock" | "gemini" | "anthropic";
  isSimulation: boolean;
  available: boolean;
} {
  const config = getConfig();
  if (config.AI_PROVIDER === "mock") {
    return { provider: "mock", isSimulation: true, available: true };
  }
  if (config.AI_PROVIDER === "anthropic") {
    return { provider: "anthropic", isSimulation: false, available: Boolean(anthropicApiKey()) };
  }
  return { provider: "gemini", isSimulation: false, available: Boolean(config.GEMINI_API_KEY) };
}

/**
 * Fournisseur du coach. Avec Claude, les comptes Gratuit utilisent un modèle
 * moins coûteux (ANTHROPIC_MODEL_FREE) ; les formules payantes, ANTHROPIC_MODEL.
 */
export function getAIProvider(plan: PlanId = "plus"): AIProvider {
  const config = getConfig();
  const model =
    config.AI_PROVIDER === "anthropic"
      ? plan === "free"
        ? config.ANTHROPIC_MODEL_FREE
        : config.ANTHROPIC_MODEL
      : config.AI_PROVIDER;
  const cached = providers.get(model);
  if (cached) return cached;
  if (!coachStatus().available) {
    // Le détail technique va au journal serveur ; l'auteur reçoit un message actionnable.
    console.error(`[plume] coach indisponible : AI_PROVIDER=${config.AI_PROVIDER} sans clé API.`);
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message:
        "Le coach n'est pas encore disponible sur ce serveur. Aucun crédit n'a été décompté et votre manuscrit est intact.",
    });
  }
  const provider =
    config.AI_PROVIDER === "anthropic"
      ? new AnthropicProvider(model)
      : config.AI_PROVIDER === "gemini"
        ? new GeminiProvider()
        : new MockPedagogicalProvider();
  providers.set(model, provider);
  return provider;
}

export function resetAIProviderForTests(): void {
  providers.clear();
}
