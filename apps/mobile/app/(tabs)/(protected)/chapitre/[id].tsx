import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  countWords,
  readingTimeMinutes,
  radii,
  spacing,
  typography,
} from "@plume/shared";
import {
  Badge,
  Button,
  Card,
  Divider,
  ErrorState,
  IconButton,
  InlineNotice,
  LoadingState,
  Screen,
  SectionHeader,
  Sheet,
  Text,
} from "@/components";
import { StudioQuickPanel } from "@/components/StudioQuickPanel";
import { queryClient, trpc } from "@/lib/api";
import {
  clearLocalDraft,
  enqueuePendingSave,
  listPendingSaves,
  loadLocalDraft,
  removePendingSave,
  saveLocalDraft,
} from "@/lib/drafts";
import { conflictDetails, errorMessage, isNetworkError, type ConflictDetails } from "@/lib/errors";
import { shareTextFile } from "@/lib/export";
import { formatDate, formatNumber, relativeTime } from "@/lib/format";
import { createMutationId } from "@/lib/id";
import { useNetworkStatus } from "@/lib/network";
import { toast } from "@/lib/toast";
import { palette, theme } from "@/theme";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "offline" | "conflict";

const HISTORY_LIMIT = 60;

export default function ChapterEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chapterId = String(id ?? "");
  const router = useRouter();
  const utils = trpc.useUtils();
  const { online } = useNetworkStatus();

  const chapterQuery = trpc.stories.chapter.useQuery(
    { chapterId },
    { enabled: Boolean(chapterId), refetchOnWindowFocus: false },
  );
  const versionsQuery = trpc.stories.versions.useQuery(
    { chapterId },
    { enabled: Boolean(chapterId) },
  );

  const saveChapter = trpc.stories.saveChapter.useMutation();
  const restoreVersion = trpc.stories.restoreVersion.useMutation();
  const publishChapter = trpc.stories.publishChapter.useMutation();
  const unpublishChapter = trpc.stories.unpublishChapter.useMutation();

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [baseVersion, setBaseVersion] = useState(1);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [conflict, setConflict] = useState<ConflictDetails | null>(null);
  const [localDraftNotice, setLocalDraftNotice] = useState<{
    savedAt: string;
    baseVersion: number;
    content: string;
    title: string;
  } | null>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [selectionOverride, setSelectionOverride] = useState<{ start: number; end: number } | null>(
    null,
  );
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [publishBusy, setPublishBusy] = useState(false);

  const past = useRef<string[]>([]);
  const future = useRef<string[]>([]);
  const [historyTick, setHistoryTick] = useState(0);
  const lastSnapshot = useRef<string>("");
  const lastSavedContent = useRef<string>("");
  const contentRef = useRef(content);
  const titleRef = useRef(title);
  const baseVersionRef = useRef(baseVersion);
  const onlineRef = useRef(online);
  const savingRef = useRef(false);
  const conflictRef = useRef<ConflictDetails | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);
  useEffect(() => {
    baseVersionRef.current = baseVersion;
  }, [baseVersion]);
  useEffect(() => {
    onlineRef.current = online;
  }, [online]);
  useEffect(() => {
    conflictRef.current = conflict;
  }, [conflict]);

  // En quittant l'éditeur, le studio analyse le chapitre en arrière-plan. Le
  // serveur ignore la demande si le texte n'a pas changé ; aucune erreur n'est
  // montrée ici (profil « Lire », quota atteint…) : l'écriture n'est jamais gênée.
  const studioClient = trpc.useUtils().client;
  useEffect(() => {
    if (!chapterId) return;
    return () => {
      void studioClient.studio.requestAnalysis
        .mutate({ chapterId, manual: false })
        .catch(() => undefined);
    };
  }, [chapterId, studioClient]);

  const chapter = chapterQuery.data;

  useEffect(() => {
    if (!chapter || initializedRef.current) return;
    initializedRef.current = true;
    setInitialized(true);
    setContent(chapter.content);
    setTitle(chapter.title);
    setBaseVersion(chapter.version);
    setLastSavedAt(new Date(chapter.updatedAt));
    lastSavedContent.current = chapter.content;
    lastSnapshot.current = chapter.content;
    void hydrateLocalDraft(chapter.content, chapter.title, chapter.version, chapter.updatedAt);
  }, [chapter]);

  async function hydrateLocalDraft(
    serverContent: string,
    serverTitle: string,
    serverVersion: number,
    serverUpdatedAt: Date | string,
  ) {
    const [draft, pending] = await Promise.all([loadLocalDraft(chapterId), listPendingSaves()]);
    const pendingForChapter = pending.find((item) => item.chapterId === chapterId);
    const candidate = draft ?? (pendingForChapter
      ? {
          chapterId,
          title: pendingForChapter.title,
          content: pendingForChapter.content,
          baseVersion: pendingForChapter.baseVersion,
          savedAt: pendingForChapter.localUpdatedAt,
        }
      : null);
    if (!candidate) return;
    if (candidate.content === serverContent && candidate.title === serverTitle) {
      await clearLocalDraft(chapterId);
      await removePendingSave(chapterId);
      return;
    }
    const draftTime = new Date(candidate.savedAt).getTime();
    const serverTime = new Date(serverUpdatedAt).getTime();
    if (Number.isFinite(draftTime) && draftTime <= serverTime && candidate.baseVersion < serverVersion) {
      await clearLocalDraft(chapterId);
      await removePendingSave(chapterId);
      return;
    }
    setLocalDraftNotice({
      savedAt: candidate.savedAt,
      baseVersion: candidate.baseVersion,
      content: candidate.content,
      title: candidate.title,
    });
    setSaveState("dirty");
  }

  const persist = useCallback(
    async (
      reason: "autosave" | "manual",
      options?: { forceSnapshot?: boolean; overrideVersion?: number; nextContent?: string; nextTitle?: string },
    ): Promise<boolean> => {
      if (savingRef.current) return false;
      const currentContent = options?.nextContent ?? contentRef.current;
      const currentTitle = (options?.nextTitle ?? titleRef.current).trim() || "Chapitre sans titre";
      const version = options?.overrideVersion ?? baseVersionRef.current;
      savingRef.current = true;
      setSaveState("saving");

      await saveLocalDraft({
        chapterId,
        title: currentTitle,
        content: currentContent,
        baseVersion: version,
        savedAt: new Date().toISOString(),
      });

      if (!onlineRef.current) {
        await enqueuePendingSave({
          chapterId,
          title: currentTitle,
          content: currentContent,
          baseVersion: version,
          localUpdatedAt: new Date().toISOString(),
        });
        savingRef.current = false;
        setSaveState("offline");
        return false;
      }

      try {
        const result = await saveChapter.mutateAsync({
          chapterId,
          content: currentContent,
          title: currentTitle,
          baseVersion: version,
          clientMutationId: createMutationId(),
          localUpdatedAt: new Date().toISOString(),
          reason,
          forceSnapshot: options?.forceSnapshot ?? false,
        });
        const savedVersion = result.chapter.version;
        setBaseVersion(savedVersion);
        baseVersionRef.current = savedVersion;
        lastSavedContent.current = currentContent;
        setLastSavedAt(new Date());
        await clearLocalDraft(chapterId);
        await removePendingSave(chapterId);
        setSaveState(contentRef.current === currentContent ? "saved" : "dirty");
        if (reason === "manual") toast("Chapitre enregistré.", "success");
        void utils.stories.versions.invalidate({ chapterId });
        void utils.stories.dashboard.invalidate();
        void utils.stories.list.invalidate();
        return true;
      } catch (error) {
        if (isNetworkError(error)) {
          await enqueuePendingSave({
            chapterId,
            title: currentTitle,
            content: currentContent,
            baseVersion: version,
            localUpdatedAt: new Date().toISOString(),
          });
          setSaveState("offline");
          return false;
        }
        const details = conflictDetails(error);
        if (details) {
          setConflict(details);
          setSaveState("conflict");
          return false;
        }
        setSaveState("dirty");
        toast(errorMessage(error), "error");
        return false;
      } finally {
        savingRef.current = false;
      }
    },
    [chapterId, saveChapter, utils],
  );

  // Autosave : le délai laisse le temps de finir une phrase.
  useEffect(() => {
    if (!initialized || !chapter) return;
    if (content === lastSavedContent.current && title === chapter.title) return;
    if (conflict) return;
    setSaveState("dirty");
    const timer = setTimeout(() => {
      if (savingRef.current || conflictRef.current) return;
      if (contentRef.current === lastSavedContent.current) return;
      void persist("autosave");
    }, 1800);
    return () => clearTimeout(timer);
  }, [content, title, initialized, chapter, conflict, persist]);

  // Retour du réseau : on tente de vider la file locale.
  useEffect(() => {
    if (!online || !initialized || conflict) return;
    let cancelled = false;
    void (async () => {
      const pending = await listPendingSaves();
      const item = pending.find((save) => save.chapterId === chapterId);
      if (!item || cancelled) return;
      if (contentRef.current === lastSavedContent.current) {
        await removePendingSave(chapterId);
        return;
      }
      if (item.baseVersion === baseVersionRef.current) {
        await persist("autosave");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [online, initialized, conflict, chapterId, persist]);

  function applyContent(next: string) {
    if (next === content) return;
    if (lastSnapshot.current !== content) {
      past.current = [...past.current, content].slice(-HISTORY_LIMIT);
      future.current = [];
      setHistoryTick((value) => value + 1);
    }
    lastSnapshot.current = next;
    setContent(next);
  }

  function undo() {
    const previous = past.current.pop();
    if (previous === undefined) return;
    future.current = [content, ...future.current].slice(0, HISTORY_LIMIT);
    lastSnapshot.current = previous;
    setContent(previous);
    setHistoryTick((value) => value + 1);
  }

  function redo() {
    const next = future.current.shift();
    if (next === undefined) return;
    past.current = [...past.current, content].slice(-HISTORY_LIMIT);
    lastSnapshot.current = next;
    setContent(next);
    setHistoryTick((value) => value + 1);
  }

  function wrapSelection(marker: string) {
    const { start, end } = selection;
    const selected = content.slice(start, end);
    const next = `${content.slice(0, start)}${marker}${selected}${marker}${content.slice(end)}`;
    applyContent(next);
    const cursor = start + marker.length + selected.length + marker.length;
    setSelectionOverride(
      selected.length > 0
        ? { start: start + marker.length, end: start + marker.length + selected.length }
        : { start: cursor, end: cursor },
    );
  }

  function restoreLocalDraft() {
    if (!localDraftNotice) return;
    if (localDraftNotice.baseVersion !== baseVersionRef.current && chapter) {
      setConflict({
        code: "CHAPTER_CONFLICT",
        currentVersion: baseVersionRef.current,
        content: chapter.content,
        title: chapter.title,
        wordCount: chapter.wordCount,
        updatedAt: new Date(chapter.updatedAt).toISOString(),
        baseVersion: localDraftNotice.baseVersion,
      });
      setLocalDraftNotice(null);
      return;
    }
    applyContent(localDraftNotice.content);
    setTitle(localDraftNotice.title);
    setLocalDraftNotice(null);
    setSaveState("dirty");
  }

  async function discardLocalDraft() {
    setLocalDraftNotice(null);
    await clearLocalDraft(chapterId);
    await removePendingSave(chapterId);
  }

  async function keepLocalVersion() {
    if (!conflict) return;
    const localContent = contentRef.current;
    const localTitle = titleRef.current;
    setConflict(null);
    conflictRef.current = null;
    const saved = await persist("manual", {
      forceSnapshot: true,
      overrideVersion: conflict.currentVersion,
      nextContent: localContent,
      nextTitle: localTitle,
    });
    if (saved) toast("Votre version locale a été conservée comme nouvelle version.", "success");
  }

  async function keepServerVersion() {
    if (!conflict) return;
    applyContent(conflict.content);
    setTitle(conflict.title);
    setBaseVersion(conflict.currentVersion);
    baseVersionRef.current = conflict.currentVersion;
    lastSavedContent.current = conflict.content;
    lastSnapshot.current = conflict.content;
    setConflict(null);
    conflictRef.current = null;
    setSaveState("saved");
    await clearLocalDraft(chapterId);
    await removePendingSave(chapterId);
    toast("La version du serveur a été rechargée.", "info");
  }

  async function handleBack() {
    if (conflict) {
      router.back();
      return;
    }
    if (contentRef.current !== lastSavedContent.current) {
      await persist("manual");
    }
    router.back();
  }

  async function togglePublish() {
    if (!chapter) return;
    setPublishBusy(true);
    try {
      if (chapter.status === "published") {
        await unpublishChapter.mutateAsync({ chapterId });
        toast("Chapitre repassé en brouillon.", "success");
      } else {
        if (contentRef.current !== lastSavedContent.current) {
          const saved = await persist("manual", { forceSnapshot: true });
          if (!saved) {
            toast("Enregistrez le chapitre avant de le publier.", "error");
            return;
          }
        }
        await publishChapter.mutateAsync({ chapterId });
        toast("Chapitre publié.", "success");
      }
      await Promise.all([
        utils.stories.chapter.invalidate({ chapterId }),
        utils.stories.dashboard.invalidate(),
        utils.stories.list.invalidate(),
      ]);
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setPublishBusy(false);
    }
  }

  async function restore(versionId: string) {
    setRestoringId(versionId);
    try {
      const restored = await restoreVersion.mutateAsync({ versionId });
      applyContent(restored.content);
      setTitle(restored.title);
      setBaseVersion(restored.version);
      baseVersionRef.current = restored.version;
      setVersionsOpen(false);
      setSaveState("dirty");
      await Promise.all([
        utils.stories.versions.invalidate({ chapterId }),
        utils.stories.chapter.invalidate({ chapterId }),
        utils.stories.dashboard.invalidate(),
      ]);
      toast("Version restaurée. Elle sera enregistrée comme nouvelle version.", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setRestoringId(null);
    }
  }

  async function exportChapter(format: "md" | "txt") {
    const body =
      format === "md"
        ? `# ${title}\n\n${content}`
        : `${title.toUpperCase()}\n\n${content.replace(/\*\*|_/g, "")}`;
    const result = await shareTextFile({
      filename: `${title.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "chapitre"}.${format}`,
      mimeType: format === "md" ? "text/markdown" : "text/plain",
      content: body,
      dialogTitle: "Exporter le chapitre",
    });
    if (result === "unavailable") {
      toast("Le partage de fichier n'est pas disponible sur cet appareil.", "error");
    } else {
      toast("Chapitre exporté.", "success");
    }
  }

  const words = useMemo(() => countWords(content), [content]);
  const minutes = readingTimeMinutes(words);
  const canUndo = past.current.length > 0;
  const canRedo = future.current.length > 0;
  void historyTick;

  if (chapterQuery.isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Ouverture du chapitre…" />
      </Screen>
    );
  }

  if (chapterQuery.isError || !chapter) {
    return (
      <Screen>
        <View style={styles.errorHeader}>
          <IconButton icon="chevron-back" label="Retour" tone="plain" onPress={() => router.back()} />
        </View>
        <ErrorState
          message={errorMessage(chapterQuery.error)}
          onRetry={() => void chapterQuery.refetch()}
        />
      </Screen>
    );
  }

  const statusLabel =
    saveState === "saving"
      ? "Enregistrement…"
      : saveState === "offline"
        ? "Hors ligne · brouillon local"
        : saveState === "conflict"
          ? "Conflit à résoudre"
          : saveState === "dirty"
            ? "Modifications non enregistrées"
            : lastSavedAt
              ? `Enregistré ${relativeTime(lastSavedAt)}`
              : "Enregistré";

  const statusColor =
    saveState === "offline" || saveState === "conflict"
      ? theme.warning
      : saveState === "dirty"
        ? theme.textMuted
        : theme.success;

  return (
    <Screen scroll={false} padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.topBar}>
          <IconButton icon="chevron-back" label="Retour" tone="plain" onPress={() => void handleBack()} />
          {!focusMode ? (
            <View style={styles.topText}>
              <Text variant="caption" color={theme.textMuted} numberOfLines={1}>
                {chapter.story.title}
              </Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text variant="caption" color={statusColor} numberOfLines={1}>
                  {statusLabel}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.flex} />
          )}
          {!focusMode ? (
            <>
              <IconButton
                icon="arrow-undo-outline"
                label="Annuler"
                tone="plain"
                disabled={!canUndo}
                onPress={undo}
              />
              <IconButton
                icon="arrow-redo-outline"
                label="Rétablir"
                tone="plain"
                disabled={!canRedo}
                onPress={redo}
              />
            </>
          ) : null}
          <IconButton
            icon="library-outline"
            label="Studio : personnages, lieux, notes"
            tone="plain"
            onPress={() => setStudioOpen(true)}
          />
          <IconButton
            icon={focusMode ? "contract-outline" : "expand-outline"}
            label={focusMode ? "Quitter le mode focus" : "Mode focus"}
            tone="plain"
            active={focusMode}
            onPress={() => setFocusMode((value) => !value)}
          />
          <IconButton
            icon="ellipsis-horizontal"
            label="Options du chapitre"
            tone="plain"
            onPress={() => setMenuOpen(true)}
          />
        </View>

        {!focusMode ? (
          <View style={styles.titleBlock}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Titre du chapitre"
              placeholderTextColor={theme.textMuted}
              style={styles.titleInput}
              maxLength={160}
              accessibilityLabel="Titre du chapitre"
            />
            <View style={styles.metaRow}>
              <Badge
                tone={
                  chapter.status === "published"
                    ? "success"
                    : chapter.status === "archived"
                      ? "muted"
                      : "gold"
                }
              >
                {chapter.status === "published"
                  ? "Publié"
                  : chapter.status === "archived"
                    ? "Archivé"
                    : "Brouillon"}
              </Badge>
              <Text variant="caption" color={theme.textMuted}>
                {formatNumber(words)} mots · {minutes} min de lecture · v{baseVersion}
              </Text>
            </View>
          </View>
        ) : null}

        {localDraftNotice ? (
          <View style={styles.bannerWrap}>
            <InlineNotice tone="warning" title="Brouillon local retrouvé">
              Une version locale du {formatDate(localDraftNotice.savedAt)} diffère du serveur.
            </InlineNotice>
            <View style={styles.bannerActions}>
              <Button label="Restaurer" size="sm" onPress={restoreLocalDraft} />
              <Button label="Ignorer" size="sm" variant="ghost" onPress={() => void discardLocalDraft()} />
            </View>
          </View>
        ) : null}

        {!online ? (
          <View style={styles.bannerWrap}>
            <InlineNotice tone="info">
              Vous êtes hors ligne. La frappe est conservée sur cet appareil et sera synchronisée au
              retour du réseau.
            </InlineNotice>
          </View>
        ) : null}

        <TextInput
          value={content}
          onChangeText={applyContent}
          onSelectionChange={(event) => {
            setSelection(event.nativeEvent.selection);
            if (selectionOverride) setSelectionOverride(null);
          }}
          selection={selectionOverride ?? undefined}
          multiline
          scrollEnabled
          placeholder="La première phrase attend. Elle n'a pas besoin d'être parfaite."
          placeholderTextColor={theme.textMuted}
          style={[styles.editor, focusMode && styles.editorFocus]}
          textAlignVertical="top"
          accessibilityLabel="Texte du chapitre"
          autoCorrect
          spellCheck
        />

        {!focusMode ? (
          <View style={styles.toolbar}>
            <ToolbarButton icon="text" label="Gras" onPress={() => wrapSelection("**")} />
            <ToolbarButton icon="text-outline" label="Italique" onPress={() => wrapSelection("_")} />
            <View style={styles.toolbarRule} />
            <ToolbarButton
              icon="arrow-undo-outline"
              label="Annuler"
              onPress={undo}
              disabled={!canUndo}
            />
            <ToolbarButton
              icon="arrow-redo-outline"
              label="Rétablir"
              onPress={redo}
              disabled={!canRedo}
            />
            <View style={styles.flex} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enregistrer maintenant"
              onPress={() => void persist("manual", { forceSnapshot: true })}
              style={styles.saveButton}
            >
              <Ionicons name="checkmark" size={17} color={palette.nightDeep} />
              <Text variant="caption" color={palette.nightDeep}>
                Enregistrer
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.focusFooter}>
            <Text variant="caption" color={theme.textMuted}>
              {formatNumber(words)} mots · {minutes} min
            </Text>
            <Text variant="caption" color={theme.textMuted}>
              {statusLabel}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>

      <Sheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Chapitre"
        subtitle="Toutes les actions laissent une trace dans les versions."
      >
        <View style={styles.menuList}>
          <MenuRow
            icon={chapter.status === "published" ? "eye-off-outline" : "globe-outline"}
            title={chapter.status === "published" ? "Repasser en brouillon" : "Publier le chapitre"}
            subtitle={
              chapter.status === "published"
                ? "Le chapitre quitte la page publique."
                : "Visible seulement si l'histoire est publique ou non répertoriée."
            }
            onPress={() => {
              setMenuOpen(false);
              void togglePublish();
            }}
            busy={publishBusy}
          />
          <MenuRow
            icon="time-outline"
            title="Historique des versions"
            subtitle={`${versionsQuery.data?.length ?? 0} version(s) enregistrée(s)`}
            onPress={() => {
              setMenuOpen(false);
              setVersionsOpen(true);
            }}
          />
          <MenuRow
            icon="download-outline"
            title="Exporter en Markdown"
            onPress={() => {
              setMenuOpen(false);
              void exportChapter("md");
            }}
          />
          <MenuRow
            icon="document-outline"
            title="Exporter en texte brut"
            onPress={() => {
              setMenuOpen(false);
              void exportChapter("txt");
            }}
          />
          <MenuRow
            icon="book-outline"
            title="Tableau de bord du manuscrit"
            onPress={() => {
              setMenuOpen(false);
              router.push({ pathname: "/histoire/[id]", params: { id: chapter.storyId } });
            }}
          />
        </View>
        <Divider />
        <Text variant="caption" color={theme.textMuted}>
          La mise en forme utilise des marqueurs Markdown légers : **gras** et _italique_. Le texte
          reste lisible dans n'importe quel éditeur, et l'export ne dépend d'aucun format
          propriétaire.
        </Text>
      </Sheet>

      <Sheet
        visible={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        title="Versions du chapitre"
        subtitle="Une version est créée au plus toutes les 45 secondes, et à chaque restauration."
      >
        {versionsQuery.isLoading ? (
          <LoadingState label="Relecture de l'historique…" />
        ) : (versionsQuery.data?.length ?? 0) === 0 ? (
          <InlineNotice tone="info">Aucune version enregistrée pour l'instant.</InlineNotice>
        ) : (
          <View style={styles.versionList}>
            {versionsQuery.data?.map((version) => (
              <Card key={version.id} style={styles.versionCard}>
                <View style={styles.versionHeader}>
                  <View style={styles.flex}>
                    <Text variant="bodyStrong">Version {version.versionNumber}</Text>
                    <Text variant="caption" color={theme.textMuted}>
                      {formatDate(version.createdAt)} · {formatNumber(version.wordCount)} mots ·{" "}
                      {version.reason === "manual"
                        ? "manuelle"
                        : version.reason === "autosave"
                          ? "sauvegarde auto"
                          : version.reason === "ai_snapshot"
                            ? "avant analyse"
                            : version.reason}
                    </Text>
                  </View>
                  <Button
                    label="Restaurer"
                    size="sm"
                    variant="secondary"
                    loading={restoringId === version.id}
                    onPress={() => void restore(version.id)}
                  />
                </View>
                <Text variant="caption" color={theme.textMuted} numberOfLines={2}>
                  {version.title}
                </Text>
              </Card>
            ))}
          </View>
        )}
      </Sheet>

      <Sheet
        visible={Boolean(conflict)}
        onClose={() => setConflict(null)}
        title="Deux versions se rencontrent"
        subtitle="Le chapitre a été modifié ailleurs pendant votre écriture. Choisissez explicitement ce qui est conservé."
      >
        {conflict ? (
          <>
            <InlineNotice tone="warning" title="Aucune donnée n'a été écrasée">
              Votre texte local est encore intact. La version du serveur est la version{" "}
              {conflict.currentVersion}.
            </InlineNotice>
            <Card style={styles.conflictCard}>
              <Text variant="label" color={theme.gold}>
                Votre version locale
              </Text>
              <Text variant="bodyStrong">{title || "Sans titre"}</Text>
              <Text variant="caption" color={theme.textMuted}>
                {formatNumber(countWords(content))} mots
              </Text>
              <Text variant="caption" color={theme.textSecondary} numberOfLines={5}>
                {content.slice(0, 500) || "Texte vide"}
              </Text>
            </Card>
            <Card style={styles.conflictCard}>
              <Text variant="label" color={theme.gold}>
                Version du serveur · v{conflict.currentVersion}
              </Text>
              <Text variant="bodyStrong">{conflict.title}</Text>
              <Text variant="caption" color={theme.textMuted}>
                {formatNumber(conflict.wordCount)} mots · {relativeTime(conflict.updatedAt)}
              </Text>
              <Text variant="caption" color={theme.textSecondary} numberOfLines={5}>
                {conflict.content.slice(0, 500) || "Texte vide"}
              </Text>
            </Card>
            <Button
              label="Garder ma version locale"
              icon="create-outline"
              loading={saveState === "saving"}
              onPress={() => void keepLocalVersion()}
            />
            <Button
              label="Recharger la version du serveur"
              icon="cloud-download-outline"
              variant="secondary"
              onPress={() => void keepServerVersion()}
            />
            <Button
              label="Décider plus tard"
              variant="ghost"
              onPress={() => setConflict(null)}
            />
          </>
        ) : null}
      </Sheet>
      <StudioQuickPanel
        visible={studioOpen}
        onClose={() => setStudioOpen(false)}
        storyId={chapter.storyId}
      />
    </Screen>
  );
}

function ToolbarButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolButton,
        pressed && { opacity: 0.6 },
        disabled && { opacity: 0.3 },
      ]}
    >
      <Ionicons name={icon} size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
  busy,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle?: string;
  onPress: () => void;
  busy?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={busy ? undefined : onPress}
      style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={18} color={theme.gold} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? (
          <Text variant="caption" color={theme.textMuted}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  errorHeader: {
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 4,
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(197,164,106,0.18)",
  },
  topText: {
    flex: 1,
    paddingHorizontal: 4,
    gap: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  titleBlock: {
    paddingHorizontal: 20,
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    gap: 6,
  },
  titleInput: {
    fontFamily: typography.display,
    fontSize: 27,
    lineHeight: 34,
    color: theme.textPrimary,
    padding: 0,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  bannerWrap: {
    paddingHorizontal: 20,
    paddingBottom: spacing[2],
    gap: spacing[2],
  },
  bannerActions: {
    flexDirection: "row",
    gap: spacing[2],
  },
  editor: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
    color: theme.textPrimary,
    fontFamily: typography.literary,
    fontSize: 18,
    lineHeight: 31,
  },
  editorFocus: {
    fontSize: 19,
    lineHeight: 33,
    paddingTop: spacing[5],
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(197,164,106,0.22)",
    backgroundColor: "rgba(11,17,28,0.96)",
  },
  toolbarRule: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: "rgba(197,164,106,0.25)",
    marginHorizontal: 6,
  },
  toolButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: palette.gold,
    borderRadius: radii.pill,
    paddingHorizontal: 13,
    minHeight: 38,
  },
  focusFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  menuList: {
    gap: 2,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    minHeight: 54,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.2)",
    backgroundColor: "rgba(197,164,106,0.06)",
  },
  versionList: {
    gap: spacing[3],
  },
  versionCard: {
    gap: 6,
    padding: spacing[4],
  },
  versionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  conflictCard: {
    gap: 4,
  },
});
