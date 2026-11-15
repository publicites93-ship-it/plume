import AsyncStorage from "@react-native-async-storage/async-storage";

export interface LocalDraft {
  chapterId: string;
  title: string;
  content: string;
  baseVersion: number;
  savedAt: string;
  serverUpdatedAt?: string;
}

const keyFor = (chapterId: string) => `plume.draft.${chapterId}`;

export async function saveLocalDraft(draft: LocalDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(keyFor(draft.chapterId), JSON.stringify(draft));
  } catch {
    // Un échec de stockage local ne doit jamais interrompre la frappe.
  }
}

export async function loadLocalDraft(chapterId: string): Promise<LocalDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(chapterId));
    if (!raw) return null;
    return JSON.parse(raw) as LocalDraft;
  } catch {
    return null;
  }
}

export async function clearLocalDraft(chapterId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyFor(chapterId));
  } catch {
    // idem
  }
}

export interface PendingSave {
  chapterId: string;
  title: string;
  content: string;
  baseVersion: number;
  localUpdatedAt: string;
}

const PENDING_KEY = "plume.pending.saves";

export async function listPendingSaves(): Promise<PendingSave[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingSave[]) : [];
  } catch {
    return [];
  }
}

export async function enqueuePendingSave(save: PendingSave): Promise<void> {
  const current = await listPendingSaves();
  const next = [save, ...current.filter((item) => item.chapterId !== save.chapterId)].slice(0, 40);
  try {
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(next));
  } catch {
    // idem
  }
}

export async function removePendingSave(chapterId: string): Promise<void> {
  const current = await listPendingSaves();
  try {
    await AsyncStorage.setItem(
      PENDING_KEY,
      JSON.stringify(current.filter((item) => item.chapterId !== chapterId)),
    );
  } catch {
    // idem
  }
}
