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

export function errorMessage(error: unknown): string {
  if (error instanceof TRPCClientError) {
    if (error.message && error.message !== "Failed to fetch") return error.message;
    if (error.message === "Failed to fetch") {
      return "Le serveur est injoignable. Votre travail reste enregistré localement.";
    }
  }
  if (error instanceof Error) {
    if (/network|fetch/i.test(error.message)) {
      return "Le serveur est injoignable. Votre travail reste enregistré localement.";
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

export function conflictDetails(error: unknown): ConflictDetails | null {
  if (!(error instanceof TRPCClientError)) return null;
  const details = (error.data as { details?: unknown } | undefined)?.details;
  if (!details || typeof details !== "object") return null;
  const candidate = details as Partial<ConflictDetails>;
  if (candidate.code !== "CHAPTER_CONFLICT") return null;
  return candidate as ConflictDetails;
}
