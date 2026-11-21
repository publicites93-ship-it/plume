import type { z } from "zod";
import { getConfig } from "../../config";
import { GeminiProvider } from "./gemini";
import { ProviderUnavailableError } from "./provider";
import { reserveClaude, settleClaude, type BudgetOwner } from "./budget";
import { estimateCostMicros } from "../plans";

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
  constructor(model: string = getConfig().ANTHROPIC_MODEL, private readonly owner?: BudgetOwner) {
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
    // Inclut aussi consignes, historique et noms de la bible (pas seulement le chapitre).
    if (prompt.length > 96_000) throw new ProviderUnavailableError(
      "Le contexte dépasse la taille maximale autorisée pour un appel Claude.",
    );
    const cap = getConfig().CLAUDE_USER_MONTHLY_CAP_MICROS;
    if (cap !== undefined && !this.owner) throw new ProviderUnavailableError("Contexte budgétaire manquant.");
    const reservation = cap !== undefined && this.owner
      ? await reserveClaude(this.owner, this.model, prompt, maxOutputTokens + 2048, cap) : null;
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
      if (reservation && this.owner && [400, 401, 403, 404, 413, 429].includes(response.status)) {
        await settleClaude(this.owner.db, reservation, 0);
      }
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
    const input = payload.usage?.input_tokens, output = payload.usage?.output_tokens;
    if (reservation && this.owner && typeof input === "number" && typeof output === "number" &&
        Number.isSafeInteger(input) && Number.isSafeInteger(output) && input >= 0 && output >= 0) {
      await settleClaude(this.owner.db, reservation, estimateCostMicros(this.model, input, output));
    }
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
