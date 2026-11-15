import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GENRES, countWords, radii, spacing } from "@plume/shared";
import {
  Badge,
  Button,
  Card,
  Chip,
  Cover,
  Divider,
  EmptyState,
  ErrorState,
  InlineNotice,
  Input,
  ListRow,
  LoadingState,
  PageHeader,
  Screen,
  SectionHeader,
  Sheet,
  SimulationNotice,
  Stat,
  Text,
  type CoverMotif,
} from "@/components";
import { queryClient, trpc } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { shareTextFile } from "@/lib/export";
import { formatDate, formatNumber, relativeTime } from "@/lib/format";
import { toast } from "@/lib/toast";
import { palette, theme } from "@/theme";

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  ongoing: "En cours",
  completed: "Terminée",
  paused: "En pause",
};

const VISIBILITY_LABEL: Record<string, string> = {
  private: "Privé",
  unlisted: "Non répertorié",
  public: "Public",
};

export default function StoryDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const storyId = String(id ?? "");
  const router = useRouter();
  const utils = trpc.useUtils();

  const dashboard = trpc.stories.dashboard.useQuery({ storyId }, { enabled: Boolean(storyId) });

  const [editOpen, setEditOpen] = useState(false);
  const [chapterOpen, setChapterOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [status, setStatus] = useState("draft");
  const [visibility, setVisibility] = useState("private");
  const [chapterTitle, setChapterTitle] = useState("");

  const updateStory = trpc.stories.update.useMutation();
  const deleteStory = trpc.stories.delete.useMutation();
  const createChapter = trpc.stories.createChapter.useMutation();
  const publishChapter = trpc.stories.publishChapter.useMutation();
  const unpublishChapter = trpc.stories.unpublishChapter.useMutation();
  const archiveChapter = trpc.stories.archiveChapter.useMutation();
  const deleteChapter = trpc.stories.deleteChapter.useMutation();
  const duplicateChapter = trpc.stories.duplicateChapter.useMutation();
  const reorderChapters = trpc.stories.reorderChapters.useMutation();
  const exportStory = trpc.stories.export.useMutation();

  const data = dashboard.data;
  const story = data?.story;
  const chapters = useMemo(
    () => [...(data?.chapters ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [data?.chapters],
  );

  const refresh = async () => {
    await Promise.all([
      utils.stories.dashboard.invalidate({ storyId }),
      utils.stories.list.invalidate(),
    ]);
  };

  function openEdit() {
    if (!story) return;
    setTitle(story.title);
    setSubtitle(story.subtitle ?? "");
    setSynopsis(story.synopsis ?? "");
    setGenre(story.genre ?? null);
    setStatus(story.status);
    setVisibility(story.visibility);
    setFormError(null);
    setEditOpen(true);
  }

  async function saveMetadata() {
    setFormError(null);
    if (!title.trim()) {
      setFormError("Le titre ne peut pas être vide.");
      return;
    }
    try {
      await updateStory.mutateAsync({
        id: storyId,
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        synopsis: synopsis.trim() || null,
        genre: (genre as (typeof GENRES)[number] | null) ?? null,
        status: status as "draft" | "ongoing" | "completed" | "paused",
        visibility: visibility as "private" | "unlisted" | "public",
      });
      await refresh();
      setEditOpen(false);
      toast("Fiche du manuscrit mise à jour.", "success");
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  async function addChapter() {
    setFormError(null);
    try {
      const chapter = await createChapter.mutateAsync({
        storyId,
        title: chapterTitle.trim() || `Chapitre ${chapters.length + 1}`,
        content: "",
      });
      await refresh();
      setChapterOpen(false);
      setChapterTitle("");
      toast("Chapitre créé. La page est à vous.", "success");
      router.push({ pathname: "/chapitre/[id]", params: { id: chapter.id } });
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  async function exportAs(format: "md" | "txt") {
    try {
      const file = await exportStory.mutateAsync({ storyId, format });
      const result = await shareTextFile({
        filename: file.filename,
        mimeType: file.mimeType,
        content: file.content,
        dialogTitle: "Exporter le manuscrit",
      });
      if (result === "unavailable") {
        toast("Le partage de fichier n'est pas disponible sur cet appareil.", "error");
      } else {
        toast("Manuscrit exporté.", "success");
      }
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  async function move(chapterId: string, direction: -1 | 1) {
    const index = chapters.findIndex((chapter) => chapter.id === chapterId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= chapters.length) return;
    const next = [...chapters];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(target, 0, item);
    try {
      await reorderChapters.mutateAsync({
        storyId,
        chapterIds: next.map((chapter) => chapter.id),
      });
      await refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  async function runChapterAction(
    action: "publish" | "unpublish" | "archive" | "delete" | "duplicate",
    chapterId: string,
  ) {
    try {
      if (action === "publish") await publishChapter.mutateAsync({ chapterId });
      if (action === "unpublish") await unpublishChapter.mutateAsync({ chapterId });
      if (action === "archive") await archiveChapter.mutateAsync({ chapterId, archived: true });
      if (action === "delete") await deleteChapter.mutateAsync({ chapterId });
      if (action === "duplicate") await duplicateChapter.mutateAsync({ chapterId });
      await refresh();
      toast(
        action === "publish"
          ? "Chapitre publié."
          : action === "unpublish"
            ? "Chapitre repassé en brouillon."
            : action === "archive"
              ? "Chapitre archivé."
              : action === "delete"
                ? "Chapitre déplacé dans la corbeille."
                : "Chapitre dupliqué.",
        "success",
      );
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  async function confirmDeleteStory() {
    try {
      await deleteStory.mutateAsync({ id: storyId });
      queryClient.clear();
      toast("Manuscrit supprimé.", "success");
      router.replace("/ecrire");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  if (dashboard.isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Ouverture du tableau de bord…" />
      </Screen>
    );
  }

  if (dashboard.isError || !data || !story) {
    return (
      <Screen>
        <PageHeader back title="Manuscrit" />
        <ErrorState
          message={errorMessage(dashboard.error)}
          onRetry={() => void dashboard.refetch()}
        />
      </Screen>
    );
  }

  const nextChapter = chapters.find((chapter) => chapter.status === "draft") ?? chapters[0];

  return (
    <Screen refreshing={dashboard.isRefetching} onRefresh={() => void dashboard.refetch()}>
      <PageHeader
        back
        eyebrow="Tableau de bord"
        title={story.title}
        subtitle={story.subtitle ?? undefined}
        right={
          <Button label="Modifier" icon="pencil-outline" size="sm" variant="secondary" onPress={openEdit} />
        }
      />

      <Card accent style={styles.hero}>
        <View style={styles.heroTop}>
          <Cover
            title={story.title}
            motif={(story.coverMotif as CoverMotif) ?? "arch"}
            width={104}
            height={156}
            label={story.genre ?? undefined}
          />
          <View style={styles.heroBody}>
            <View style={styles.badgeRow}>
              <Badge
                tone={story.visibility === "private" ? "muted" : story.visibility === "public" ? "success" : "info"}
                icon={story.visibility === "private" ? "lock-closed-outline" : "globe-outline"}
              >
                {VISIBILITY_LABEL[story.visibility] ?? story.visibility}
              </Badge>
              <Badge tone={story.status === "completed" ? "success" : "gold"}>
                {STATUS_LABEL[story.status] ?? story.status}
              </Badge>
            </View>
            <Text variant="caption" color={theme.textMuted} numberOfLines={5}>
              {story.synopsis ?? "Aucun synopsis. La fiche peut rester vide : le texte suffit."}
            </Text>
            <Text variant="caption" color={theme.textMuted}>
              Modifié {relativeTime(story.updatedAt)}
            </Text>
            <View style={styles.heroActions}>
              <Button
                label={nextChapter ? "Écrire" : "Premier chapitre"}
                icon="create-outline"
                size="sm"
                onPress={() => {
                  if (nextChapter) {
                    router.push({ pathname: "/chapitre/[id]", params: { id: nextChapter.id } });
                  } else {
                    setChapterTitle("");
                    setChapterOpen(true);
                  }
                }}
              />
              <Button
                label="Coach"
                icon="chatbubbles-outline"
                size="sm"
                variant="secondary"
                onPress={() => router.push({ pathname: "/coach/[id]", params: { id: storyId } })}
              />
            </View>
          </View>
        </View>

        <Divider />

        <View style={styles.statsRow}>
          <Stat value={formatNumber(data.stats.wordCount)} label="mots" align="center" compact />
          <View style={styles.rule} />
          <Stat value={data.stats.chapterCount} label="chapitres" align="center" compact />
          <View style={styles.rule} />
          <Stat value={data.stats.publishedCount} label="publiés" align="center" compact />
          <View style={styles.rule} />
          <Stat value={formatNumber(data.stats.followers)} label="suiveurs" align="center" compact />
        </View>
      </Card>

      <SectionHeader
        title="Chapitres"
        eyebrow={`${chapters.length} au sommaire`}
        actionLabel="Nouveau chapitre"
        onAction={() => {
          setChapterTitle(`Chapitre ${chapters.length + 1}`);
          setFormError(null);
          setChapterOpen(true);
        }}
      />

      {chapters.length === 0 ? (
        <Card>
          <EmptyState
            icon="document-text-outline"
            title="Aucun chapitre"
            message="Créez un chapitre. Il restera privé, même si l'histoire devient publique, jusqu'à publication explicite."
            actionLabel="Créer le premier chapitre"
            onAction={() => {
              setChapterTitle("Chapitre 1");
              setChapterOpen(true);
            }}
          />
        </Card>
      ) : (
        <View style={styles.chapterList}>
          {chapters.map((chapter, index) => (
            <Card key={chapter.id} style={styles.chapterCard} padded={false}>
              <View style={styles.chapterTop}>
                <View style={styles.chapterNumber}>
                  <Text variant="label" color={theme.gold}>
                    {String(index + 1).padStart(2, "0")}
                  </Text>
                </View>
                <View style={styles.flex}>
                  <Text variant="bodyStrong" numberOfLines={2}>
                    {chapter.title}
                  </Text>
                  <Text variant="caption" color={theme.textMuted}>
                    {formatNumber(chapter.wordCount)} mots · v{chapter.version} ·{" "}
                    {relativeTime(chapter.updatedAt)}
                  </Text>
                </View>
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
              </View>

              <View style={styles.chapterActions}>
                <Button
                  label="Ouvrir"
                  icon="create-outline"
                  size="sm"
                  onPress={() =>
                    router.push({ pathname: "/chapitre/[id]", params: { id: chapter.id } })
                  }
                  style={styles.flex}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Monter le chapitre"
                  disabled={index === 0}
                  onPress={() => void move(chapter.id, -1)}
                  style={[styles.smallIcon, index === 0 && styles.disabled]}
                >
                  <Ionicons name="arrow-up" size={17} color={theme.textSecondary} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Descendre le chapitre"
                  disabled={index === chapters.length - 1}
                  onPress={() => void move(chapter.id, 1)}
                  style={[styles.smallIcon, index === chapters.length - 1 && styles.disabled]}
                >
                  <Ionicons name="arrow-down" size={17} color={theme.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.chapterMenu}>
                {chapter.status !== "published" ? (
                  <ChapterAction
                    icon="globe-outline"
                    label="Publier"
                    onPress={() => void runChapterAction("publish", chapter.id)}
                  />
                ) : (
                  <ChapterAction
                    icon="eye-off-outline"
                    label="Dépublier"
                    onPress={() => void runChapterAction("unpublish", chapter.id)}
                  />
                )}
                <ChapterAction
                  icon="copy-outline"
                  label="Dupliquer"
                  onPress={() => void runChapterAction("duplicate", chapter.id)}
                />
                {chapter.status !== "archived" ? (
                  <ChapterAction
                    icon="archive-outline"
                    label="Archiver"
                    onPress={() => void runChapterAction("archive", chapter.id)}
                  />
                ) : null}
                <ChapterAction
                  icon="trash-outline"
                  label="Supprimer"
                  danger
                  onPress={() => void runChapterAction("delete", chapter.id)}
                />
              </View>
            </Card>
          ))}
        </View>
      )}

      <SectionHeader title="Outils du manuscrit" eyebrow="Atelier" />
      <Card padded={false}>
        <View style={styles.toolsPad}>
          <ListRow
            icon="git-branch-outline"
            title="Bible narrative"
            subtitle={`${data.bible.characters} personnages · ${data.bible.locations} lieux · ${data.bible.plots} intrigues`}
            onPress={() => router.push({ pathname: "/bible/[id]", params: { id: storyId } })}
          />
          <ListRow
            icon="chatbubbles-outline"
            title="Coach pédagogique"
            subtitle="Diagnostics, citations vérifiées et conversations de méthode"
            onPress={() => router.push({ pathname: "/coach/[id]", params: { id: storyId } })}
          />
          <ListRow
            icon="download-outline"
            title="Exporter en Markdown"
            subtitle="Titre, synopsis et chapitres, dans l'ordre du sommaire"
            onPress={() => void exportAs("md")}
          />
          <ListRow
            icon="document-outline"
            title="Exporter en texte brut"
            subtitle="Sans marqueurs de mise en forme"
            onPress={() => void exportAs("txt")}
          />
          {story.visibility !== "private" ? (
            <ListRow
              icon="open-outline"
              title="Voir la page publique"
              subtitle="Ce que voit un lecteur du catalogue"
              onPress={() =>
                router.push({ pathname: "/histoire-publique/[id]", params: { id: storyId } })
              }
            />
          ) : null}
        </View>
      </Card>

      <View style={styles.noticeWrap}>
        <SimulationNotice compact />
      </View>

      <SectionHeader title="Zone sensible" eyebrow="Données" />
      <Card>
        <Text variant="caption" color={theme.textMuted}>
          La suppression retire le manuscrit de votre atelier et de toute page publique. Elle est
          réversible côté base pendant la phase de développement, mais aucun écran de restauration
          n'est encore exposé.
        </Text>
        <Button
          label="Supprimer ce manuscrit"
          icon="trash-outline"
          variant="danger"
          size="sm"
          onPress={() => setDeleteOpen(true)}
          style={styles.dangerButton}
        />
      </Card>

      <Sheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        title="Fiche du manuscrit"
        subtitle="Ces informations servent au catalogue et à votre propre mémoire du projet."
        footer={
          <Button
            label="Enregistrer"
            icon="checkmark"
            loading={updateStory.isPending}
            onPress={saveMetadata}
          />
        }
      >
        {formError ? <InlineNotice tone="danger">{formError}</InlineNotice> : null}
        <Input label="Titre" required value={title} onChangeText={setTitle} maxLength={120} />
        <Input
          label="Sous-titre"
          value={subtitle}
          onChangeText={setSubtitle}
          maxLength={160}
          placeholder="Une promesse, un seuil…"
        />
        <Input
          label="Synopsis"
          value={synopsis}
          onChangeText={setSynopsis}
          multiline
          maxLength={4000}
          hint={`${countWords(synopsis)} mots`}
        />
        <View style={styles.fieldGroup}>
          <Text variant="label" color={theme.textSecondary}>
            Genre
          </Text>
          <View style={styles.chips}>
            {GENRES.map((item) => (
              <Chip
                key={item}
                label={item}
                selected={genre === item}
                onPress={() => setGenre(genre === item ? null : item)}
              />
            ))}
          </View>
        </View>
        <View style={styles.fieldGroup}>
          <Text variant="label" color={theme.textSecondary}>
            État d'écriture
          </Text>
          <View style={styles.chips}>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={status === value}
                onPress={() => setStatus(value)}
              />
            ))}
          </View>
        </View>
        <View style={styles.fieldGroup}>
          <Text variant="label" color={theme.textSecondary}>
            Visibilité
          </Text>
          <View style={styles.chips}>
            {Object.entries(VISIBILITY_LABEL).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={visibility === value}
                onPress={() => setVisibility(value)}
              />
            ))}
          </View>
        </View>
        <InlineNotice tone="info">
          Un manuscrit privé n'apparaît jamais dans le catalogue, même si un chapitre a été publié
          puis repassé en brouillon. La visibilité publique ne publie pas les chapitres à votre
          place.
        </InlineNotice>
      </Sheet>

      <Sheet
        visible={chapterOpen}
        onClose={() => setChapterOpen(false)}
        title="Nouveau chapitre"
        subtitle="Un titre provisoire suffit. Vous pourrez le changer dans l'éditeur."
        footer={
          <Button
            label="Créer et écrire"
            icon="create-outline"
            loading={createChapter.isPending}
            onPress={addChapter}
          />
        }
      >
        {formError ? <InlineNotice tone="danger">{formError}</InlineNotice> : null}
        <Input
          label="Titre du chapitre"
          value={chapterTitle}
          onChangeText={setChapterTitle}
          maxLength={160}
          autoFocus
        />
        <InlineNotice tone="info">
          Le chapitre est créé en brouillon. Aucun lecteur ne peut y accéder avant publication.
        </InlineNotice>
      </Sheet>

      <Sheet
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Supprimer le manuscrit ?"
        subtitle="Cette action retire l'histoire de votre atelier et du catalogue."
        footer={
          <View style={styles.sheetActions}>
            <Button label="Annuler" variant="ghost" onPress={() => setDeleteOpen(false)} />
            <Button
              label="Supprimer"
              icon="trash-outline"
              variant="danger"
              loading={deleteStory.isPending}
              onPress={confirmDeleteStory}
              style={styles.flex}
            />
          </View>
        }
      >
        <InlineNotice tone="danger" title="Action irréversible dans l'interface">
          Les chapitres, versions et éléments de la bible seront retirés avec le manuscrit. Exportez
          d'abord si vous souhaitez conserver une copie.
        </InlineNotice>
        <Button
          label="Exporter en Markdown avant de supprimer"
          icon="download-outline"
          variant="secondary"
          size="sm"
          onPress={() => void exportAs("md")}
        />
      </Sheet>

      <Text variant="caption" color={theme.textMuted} align="center" style={styles.footerNote}>
        Créé le {formatDate(story.createdAt)} · {formatNumber(data.stats.readers)} lecteurs ont
        ouvert ce manuscrit
      </Text>
    </Screen>
  );
}

function ChapterAction({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.chapterAction, pressed && { opacity: 0.65 }]}
    >
      <Ionicons name={icon} size={15} color={danger ? theme.danger : theme.textSecondary} />
      <Text variant="caption" color={danger ? theme.danger : theme.textSecondary}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    gap: spacing[4],
  },
  heroTop: {
    flexDirection: "row",
    gap: spacing[4],
    alignItems: "flex-start",
  },
  heroBody: {
    flex: 1,
    gap: 7,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 3,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rule: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: "rgba(197,164,106,0.2)",
  },
  chapterList: {
    gap: spacing[3],
  },
  chapterCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  chapterTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
  },
  chapterNumber: {
    width: 30,
    paddingTop: 2,
  },
  chapterActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  smallIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.22)",
  },
  disabled: {
    opacity: 0.35,
  },
  chapterMenu: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(197,164,106,0.16)",
    paddingTop: spacing[3],
  },
  chapterAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 32,
  },
  toolsPad: {
    paddingHorizontal: spacing[4],
  },
  noticeWrap: {
    marginTop: spacing[4],
  },
  dangerButton: {
    marginTop: spacing[4],
    alignSelf: "flex-start",
  },
  fieldGroup: {
    gap: 8,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  sheetActions: {
    flexDirection: "row",
    gap: spacing[3],
  },
  footerNote: {
    marginTop: spacing[5],
    fontSize: 10,
  },
});
