import { TRPCClientError } from "@trpc/client";

export interface ConflictDetails {
  code: "CHAPTER_CONFLICT";
  currentVersion: number;
  content: string;
  title: string;
  wordCount: number;
  updatedAt: string;
  baseVersion: number;
}

/** Réponse non JSON (page HTML d'un hébergeur, service suspendu, proxy…). */
const UNEXPECTED_RESPONSE =
  /JSON Parse error|Unexpected token|Unexpected character|is not valid JSON|Unable to transform response/i;

export function errorMessage(error: unknown): string {
  if (error instanceof Error && UNEXPECTED_RESPONSE.test(error.message)) {
    return "Le serveur a renvoyé une réponse inattendue. Vérifiez que l'application est à jour, puis réessayez dans un instant.";
  }
  if (error instanceof TRPCClientError) {
    if (error.message && error.message !== "Failed to fetch") return error.message;
    if (error.message === "Failed to fetch") {
      return "Démarrage du serveur, cela peut prendre une minute… Votre travail reste enregistré localement.";
    }
  }
  if (error instanceof Error) {
    if (/network|fetch|abort/i.test(error.message)) {
      return "Démarrage du serveur, cela peut prendre une minute… Votre travail reste enregistré localement.";
    }
    return error.message;
  }
  return "Une erreur inattendue est survenue. Aucune donnée n'a été perdue.";
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof TRPCClientError) {
    return /fetch|network|abort/i.test(error.message);
  }
  return error instanceof Error && /fetch|network/i.test(error.message);
}

export function errorDetails(error: unknown): Record<string, unknown> | null {
  if (!(error instanceof TRPCClientError)) return null;
  const details = (error.data as { details?: unknown } | undefined)?.details;
  if (!details || typeof details !== "object") return null;
  return details as Record<string, unknown>;
}

export function isEmailNotVerified(error: unknown): boolean {
  return errorDetails(error)?.code === "EMAIL_NOT_VERIFIED";
}

export function conflictDetails(error: unknown): ConflictDetails | null {
  if (!(error instanceof TRPCClientError)) return null;
  const details = (error.data as { details?: unknown } | undefined)?.details;
  if (!details || typeof details !== "object") return null;
  const candidate = details as Partial<ConflictDetails>;
  if (candidate.code !== "CHAPTER_CONFLICT") return null;
  return candidate as ConflictDetails;
}
