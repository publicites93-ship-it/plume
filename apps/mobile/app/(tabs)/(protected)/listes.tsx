import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@plume/shared";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  InlineNotice,
  Input,
  LoadingState,
  PageHeader,
  Screen,
  Sheet,
  StoryRowCard,
  Text,
} from "@/components";
import { trpc } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { relativeTime } from "@/lib/format";
import { toast } from "@/lib/toast";
import { theme } from "@/theme";

export default function ListsScreen() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const lists = trpc.reading.lists.useQuery();
  const library = trpc.reading.library.useQuery();
  const catalog = trpc.reading.catalog.useQuery({ limit: 50, cursor: 0 });
  const createList = trpc.reading.createList.useMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const storyById = useMemo(() => {
    const map = new Map<string, NonNullable<typeof catalog.data>["items"][number]>();
    for (const story of catalog.data?.items ?? []) map.set(story.id, story);
    return map;
  }, [catalog.data]);

  const libraryById = useMemo(() => {
    const map = new Map<string, NonNullable<typeof library.data>[number]>();
    for (const story of library.data ?? []) map.set(story.id, story);
    return map;
  }, [library.data]);

  async function create() {
    if (!name.trim()) return;
    try {
      await createList.mutateAsync({ name: name.trim() });
      setName("");
      setCreateOpen(false);
      await utils.reading.lists.invalidate();
      toast("Liste créée.", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  return (
    <Screen refreshing={lists.isRefetching} onRefresh={() => void lists.refetch()}>
      <PageHeader
        back
        eyebrow="Vos lectures"
        title="Listes de lecture"
        subtitle="Des étagères privées pour vos envies, vos relectures et vos nuits à venir."
        right={
          <Button label="Nouvelle" icon="add" size="sm" onPress={() => setCreateOpen(true)} />
        }
      />

      {lists.isLoading ? (
        <LoadingState label="Ouverture de vos étagères…" />
      ) : lists.isError ? (
        <ErrorState message={errorMessage(lists.error)} onRetry={() => void lists.refetch()} />
      ) : (lists.data?.length ?? 0) === 0 ? (
        <Card>
          <EmptyState
            icon="albums-outline"
            title="Aucune liste"
            message="Créez une liste, puis ajoutez-y des histoires depuis leur page publique."
            actionLabel="Créer une liste"
            onAction={() => setCreateOpen(true)}
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {lists.data?.map((list) => {
            const open = expanded === list.id;
            const stories = list.storyIds
              .map((storyId) => storyById.get(storyId) ?? libraryById.get(storyId))
              .filter(Boolean);
            return (
              <Card key={list.id} style={styles.listCard} padded={false}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ouvrir la liste ${list.name}`}
                  accessibilityState={{ expanded: open }}
                  onPress={() => setExpanded(open ? null : list.id)}
                  style={styles.listHeader}
                >
                  <View style={styles.listIcon}>
                    <Ionicons name="albums-outline" size={19} color={theme.goldBright} />
                  </View>
                  <View style={styles.flex}>
                    <Text variant="heading">{list.name}</Text>
                    <Text variant="caption" color={theme.textMuted}>
                      {list.storyIds.length} histoire{list.storyIds.length > 1 ? "s" : ""} · créée{" "}
                      {relativeTime(list.createdAt)}
                    </Text>
                  </View>
                  <Ionicons
                    name={open ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={theme.textMuted}
                  />
                </Pressable>
                {open ? (
                  <View style={styles.listBody}>
                    {stories.length === 0 ? (
                      <InlineNotice tone="info">
                        Les histoires de cette liste ne sont plus accessibles publiquement, ou aucune
                        histoire n'y a encore été ajoutée.
                      </InlineNotice>
                    ) : (
                      stories.map((story) =>
                        story ? (
                          <StoryRowCard
                            key={story.id}
                            story={story}
                            compact
                            progress={libraryById.get(story.id)?.progress}
                            onPress={() =>
                              router.push({
                                pathname: "/histoire-publique/[id]",
                                params: { id: story.id },
                              })
                            }
                          />
                        ) : null,
                      )
                    )}
                    <Button
                      label="Ajouter depuis le catalogue"
                      icon="compass-outline"
                      variant="ghost"
                      size="sm"
                      onPress={() => router.push("/decouvrir")}
                    />
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}

      <Card style={styles.note} accent>
        <View style={styles.noteRow}>
          <Badge tone="gold" icon="lock-closed-outline">
            Privé
          </Badge>
          <Text variant="caption" color={theme.textSecondary} style={styles.flex}>
            Vos listes ne sont visibles par personne. Elles ne modifient pas la visibilité des
            histoires et ne notifient pas leurs auteurs.
          </Text>
        </View>
      </Card>

      <Sheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouvelle liste"
        subtitle="Une étagère, un nom, une intention."
        footer={
          <Button
            label="Créer la liste"
            icon="add"
            loading={createList.isPending}
            onPress={() => void create()}
          />
        }
      >
        <Input
          label="Nom"
          value={name}
          onChangeText={setName}
          maxLength={60}
          autoFocus
          placeholder="Nuits gothiques, À relire, Recherches…"
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: {
    gap: spacing[3],
  },
  listCard: {
    gap: 0,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    padding: spacing[4],
    minHeight: 76,
  },
  listIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.26)",
    backgroundColor: "rgba(197,164,106,0.07)",
  },
  listBody: {
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(197,164,106,0.16)",
    paddingTop: spacing[4],
  },
  note: {
    marginTop: spacing[6],
  },
  noteRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
});
