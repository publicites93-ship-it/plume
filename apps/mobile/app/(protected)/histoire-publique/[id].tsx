import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@plume/shared";
import {
  Badge,
  Button,
  Card,
  Cover,
  Divider,
  ErrorState,
  InlineNotice,
  Input,
  ListRow,
  LoadingState,
  PageHeader,
  Screen,
  SectionHeader,
  Sheet,
  Stat,
  StoryCounters,
  Text,
  type CoverMotif,
} from "@/components";
import { trpc } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { formatNumber, relativeTime } from "@/lib/format";
import { toast } from "@/lib/toast";
import { theme } from "@/theme";

export default function PublicStoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const storyId = String(id ?? "");
  const router = useRouter();
  const utils = trpc.useUtils();

  const storyQuery = trpc.reading.story.useQuery({ storyId }, { enabled: Boolean(storyId) });
  const lists = trpc.reading.lists.useQuery();
  const toggleFollow = trpc.reading.toggleFollow.useMutation();
  const addToList = trpc.reading.addToList.useMutation();
  const createList = trpc.reading.createList.useMutation();

  const [listOpen, setListOpen] = useState(false);
  const [newListOpen, setNewListOpen] = useState(false);
  const [listName, setListName] = useState("");

  const data = storyQuery.data;
  const story = data?.story;
  const chapters = data?.chapters ?? [];
  const progressChapter = data?.progress?.chapterId;
  const nextChapter =
    chapters.find((chapter) => chapter.id === progressChapter) ??
    chapters.find((chapter) => chapter.orderIndex > 0) ??
    chapters[0];

  async function follow() {
    try {
      await toggleFollow.mutateAsync({ storyId });
      await Promise.all([
        utils.reading.story.invalidate({ storyId }),
        utils.reading.library.invalidate(),
        utils.reading.stats.invalidate({ storyId }),
      ]);
      toast(data?.following ? "Histoire retirée de votre bibliothèque." : "Histoire ajoutée à votre bibliothèque.", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  async function addToExisting(listId: string) {
    try {
      await addToList.mutateAsync({ listId, storyId });
      setListOpen(false);
      await utils.reading.lists.invalidate();
      toast("Histoire ajoutée à la liste.", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  async function createAndAdd() {
    if (!listName.trim()) return;
    try {
      const list = await createList.mutateAsync({ name: listName.trim() });
      await addToList.mutateAsync({ listId: list.id, storyId });
      setListName("");
      setNewListOpen(false);
      setListOpen(false);
      await utils.reading.lists.invalidate();
      toast("Liste créée et histoire ajoutée.", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  if (storyQuery.isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Ouverture de l'histoire…" />
      </Screen>
    );
  }

  if (storyQuery.isError || !data || !story) {
    return (
      <Screen>
        <PageHeader back title="Histoire" />
        <ErrorState
          message={errorMessage(storyQuery.error)}
          onRetry={() => void storyQuery.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen
      refreshing={storyQuery.isRefetching}
      onRefresh={() => void storyQuery.refetch()}
    >
      <PageHeader
        back
        eyebrow={story.genre ?? "Catalogue"}
        title={story.title}
        subtitle={story.subtitle ?? undefined}
      />

      <Card style={styles.hero} padded={false}>
        <View style={styles.heroInner}>
          <Cover
            title={story.title}
            motif={(story.coverMotif as CoverMotif) ?? "arch"}
            width={118}
            height={176}
            label={story.genre ?? undefined}
          />
          <View style={styles.heroBody}>
            <View style={styles.badges}>
              <Badge tone={story.status === "completed" ? "success" : "gold"}>
                {story.status === "completed" ? "Terminée" : "En cours"}
              </Badge>
              {story.audience !== "all" ? (
                <Badge tone="bordeaux">{story.audience === "teen" ? "Adolescent" : "Adulte"}</Badge>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Voir le profil de ${data.authorName}`}
              onPress={() =>
                router.push({ pathname: "/auteur/[id]", params: { id: story.authorId } })
              }
              style={styles.authorRow}
            >
              <Ionicons name="person-outline" size={14} color={theme.gold} />
              <Text variant="caption" color={theme.gold}>
                {data.authorName}
              </Text>
            </Pressable>
            <Text variant="caption" color={theme.textMuted} numberOfLines={7}>
              {story.synopsis ?? "L'auteur n'a pas encore ajouté de synopsis."}
            </Text>
            <View style={styles.heroStats}>
              <Stat value={formatNumber(data.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0))} label="mots" compact />
              <Stat value={data.chapters.length} label="chapitres" compact />
              <Stat value={relativeTime(story.updatedAt)} label="mise à jour" compact />
            </View>
            <StoryCounters
              storyId={story.id}
              colors={{ text: theme.textPrimary, textMuted: theme.textMuted, accent: theme.gold }}
            />
          </View>
        </View>
        <Divider />
        <View style={styles.heroActions}>
          <Button
            label={data.following ? "Dans ma bibliothèque" : "Ajouter à ma bibliothèque"}
            icon={data.following ? "checkmark" : "add"}
            variant={data.following ? "secondary" : "primary"}
            size="sm"
            loading={toggleFollow.isPending}
            onPress={() => void follow()}
            style={styles.flex}
          />
          <Button
            label="Liste"
            icon="albums-outline"
            variant="ghost"
            size="sm"
            onPress={() => setListOpen(true)}
          />
        </View>
      </Card>

      <SectionHeader title="Sommaire" eyebrow={`${chapters.length} chapitres publiés`} />
      {chapters.length === 0 ? (
        <Card>
          <InlineNotice tone="info">
            Aucun chapitre n'est encore publié. Suivez l'histoire pour être prévenu de la suite.
          </InlineNotice>
        </Card>
      ) : (
        <Card padded={false}>
          <View style={styles.chapterPad}>
            {chapters.map((chapter, index) => {
              const isCurrent = chapter.id === progressChapter;
              return (
                <View
                  key={chapter.id}
                  style={[styles.chapterRow, index > 0 && styles.chapterBorder]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Lire ${chapter.title}`}
                    onPress={() =>
                      router.push({ pathname: "/lecture/[id]", params: { id: chapter.id } })
                    }
                    style={styles.chapterPress}
                  >
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
                        {formatNumber(chapter.wordCount)} mots
                        {chapter.publishedAt ? ` · ${relativeTime(chapter.publishedAt)}` : ""}
                      </Text>
                    </View>
                    {isCurrent ? <Badge tone="gold">Reprise</Badge> : null}
                    <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </Card>
      )}

      {nextChapter ? (
        <Button
          label={data.progress ? "Reprendre la lecture" : "Commencer la lecture"}
          icon="book-outline"
          onPress={() => router.push({ pathname: "/lecture/[id]", params: { id: nextChapter.id } })}
          style={styles.startButton}
        />
      ) : null}

      <SectionHeader title="Détails" eyebrow="Fiche de lecture" />
      <Card padded={false}>
        <View style={styles.detailPad}>
          <ListRow icon="pricetag-outline" title="Genre" rightText={story.genre ?? "Non précisé"} />
          <ListRow
            icon="layers-outline"
            title="Genres secondaires"
            rightText={story.secondaryGenres.length ? story.secondaryGenres.join(", ") : "—"}
          />
          <ListRow
            icon="alert-circle-outline"
            title="Avertissements"
            subtitle={
              story.contentWarnings.length
                ? story.contentWarnings.join(" · ")
                : "Aucun avertissement déclaré par l'auteur."
            }
          />
          <ListRow
            icon="calendar-outline"
            title="Dernière publication"
            rightText={story.publishedAt ? relativeTime(story.publishedAt) : "—"}
          />
        </View>
      </Card>

      <Card style={styles.ethics} accent>
        <Text variant="bodyStrong">Le texte appartient à son auteur</Text>
        <Text variant="caption" color={theme.textSecondary}>
          Plume n'affiche que les chapitres explicitement publiés. Un manuscrit privé reste
          inaccessible, même par lien. Les signets et la progression sont personnels.
        </Text>
      </Card>

      <Sheet
        visible={listOpen}
        onClose={() => setListOpen(false)}
        title="Ajouter à une liste"
        subtitle="Vos listes restent privées."
      >
        {(lists.data?.length ?? 0) === 0 ? (
          <InlineNotice tone="info">
            Vous n'avez encore aucune liste. Créez-en une pour classer vos envies de lecture.
          </InlineNotice>
        ) : (
          <View style={styles.listChoices}>
            {lists.data?.map((list) => (
              <ListRow
                key={list.id}
                icon="albums-outline"
                title={list.name}
                subtitle={`${list.storyIds.length} histoire${list.storyIds.length > 1 ? "s" : ""}`}
                onPress={() => void addToExisting(list.id)}
              />
            ))}
          </View>
        )}
        <Button
          label="Créer une nouvelle liste"
          icon="add"
          variant="secondary"
          onPress={() => {
            setListOpen(false);
            setNewListOpen(true);
          }}
        />
      </Sheet>

      <Sheet
        visible={newListOpen}
        onClose={() => setNewListOpen(false)}
        title="Nouvelle liste"
        subtitle="Un nom simple suffit : « À relire », « Nuits gothiques »…"
        footer={
          <Button
            label="Créer et ajouter"
            icon="add"
            loading={createList.isPending || addToList.isPending}
            onPress={() => void createAndAdd()}
          />
        }
      >
        <Input
          label="Nom de la liste"
          value={listName}
          onChangeText={setListName}
          maxLength={60}
          autoFocus
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    gap: 0,
  },
  heroInner: {
    flexDirection: "row",
    gap: spacing[4],
    padding: spacing[4],
    alignItems: "flex-start",
  },
  heroBody: {
    flex: 1,
    gap: 7,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 28,
  },
  heroStats: {
    flexDirection: "row",
    gap: spacing[4],
    marginTop: 2,
  },
  heroActions: {
    flexDirection: "row",
    gap: spacing[2],
    padding: spacing[4],
  },
  chapterPad: {
    paddingHorizontal: spacing[4],
  },
  chapterRow: {
    borderTopWidth: 0,
  },
  chapterBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(197,164,106,0.16)",
  },
  chapterPress: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    minHeight: 62,
    paddingVertical: 10,
  },
  chapterNumber: {
    width: 28,
  },
  startButton: {
    marginTop: spacing[4],
  },
  detailPad: {
    paddingHorizontal: spacing[4],
  },
  ethics: {
    marginTop: spacing[5],
    gap: 6,
  },
  listChoices: {
    gap: 0,
  },
});
