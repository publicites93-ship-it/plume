import type { z } from "zod";
import { getConfig } from "../../config";
import { GeminiProvider } from "./gemini";
import { ProviderUnavailableError } from "./provider";

/** Clé Claude : ANTHROPIC_API_KEY, ou CLAUDE_API_KEY pour compatibilité. */
export function anthropicApiKey(): string | undefined {
  const config = getConfig();
  return config.ANTHROPIC_API_KEY || config.CLAUDE_API_KEY || undefined;
}

/**
 * Fournisseur Claude (API Messages d'Anthropic). Il réutilise les consignes
 * pédagogiques, les schémas et la vérification de GeminiProvider ; seul l'appel
 * réseau diffère. Les citations restent vérifiées mot pour mot par analysis.ts.
 */
export class AnthropicProvider extends GeminiProvider {
  constructor(model: string = getConfig().ANTHROPIC_MODEL) {
    const apiKey = anthropicApiKey();
    if (!apiKey) {
      throw new ProviderUnavailableError("AI_PROVIDER=anthropic sans clé Claude.");
    }
    super({ name: "anthropic", model, apiKey });
  }

  protected override async callJson<T>(
    prompt: string,
    schema: z.ZodType<T>,
    maxOutputTokens: number,
  ): Promise<{ data: T; inputTokens: number; outputTokens: number }> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxOutputTokens + 2048,
        system:
          "Tu réponds uniquement par un objet JSON valide, sans texte autour ni bloc Markdown.",
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      // Journal d'exploitation : type et message d'erreur d'Anthropic uniquement.
      let reason = "";
      try {
        const body = (await response.json()) as { error?: { type?: string; message?: string } };
        reason = `${body.error?.type ?? ""} ${body.error?.message ?? ""}`.trim().slice(0, 300);
      } catch {
        reason = "réponse illisible";
      }
      console.error(`[plume] Claude ${this.model} a refusé la requête (${response.status}) : ${reason}`);
      throw new ProviderUnavailableError(
        `Le fournisseur IA a refusé la requête (${response.status}).`,
      );
    }

    const payload = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      stop_reason?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = (payload.content ?? [])
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("");
    // Tolère un éventuel bloc ```json … ``` autour de l'objet.
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text);
    } catch {
      console.error(
        `[plume] Claude ${this.model} : réponse non JSON (${text.length} caractères, arrêt : ${
          payload.stop_reason ?? "inconnu"
        }).`,
      );
      throw new ProviderUnavailableError("La réponse du fournisseur IA n'est pas un JSON valide.");
    }
    const parsed = schema.safeParse(parsedJson);
    if (!parsed.success) {
      console.error(
        `[plume] Claude ${this.model} : schéma non respecté (${parsed.error.issues
          .slice(0, 5)
          .map((issue) => `${issue.path.join(".")} ${issue.code}`)
          .join(", ")}).`,
      );
      throw new ProviderUnavailableError(
        "La réponse du fournisseur IA ne respecte pas le schéma pédagogique attendu.",
      );
    }
    return {
      data: parsed.data,
      inputTokens: payload.usage?.input_tokens ?? Math.ceil(prompt.length / 4),
      outputTokens: payload.usage?.output_tokens ?? 900,
    };
  }
}
