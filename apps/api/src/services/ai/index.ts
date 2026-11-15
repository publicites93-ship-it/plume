import { getConfig } from "../../config";
import { GeminiProvider } from "./gemini";
import { MockPedagogicalProvider } from "./mock";
import type { AIProvider } from "./provider";

let provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (provider) return provider;
  const config = getConfig();
  provider = config.AI_PROVIDER === "gemini" ? new GeminiProvider() : new MockPedagogicalProvider();
  return provider;
}

export function resetAIProviderForTests(): void {
  provider = null;
}
