import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { spacing } from "@plume/shared";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Screen,
  Segmented,
  Stat,
  StoryRowCard,
  Text,
} from "@/components";
import { trpc } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { formatNumber } from "@/lib/format";
import { theme } from "@/theme";

type Filter = "all" | "reading" | "finished";

export default function LibraryScreen() {
  const router = useRouter();
  const library = trpc.reading.library.useQuery();
  const [filter, setFilter] = useState<Filter>("all");

  const items = useMemo(() => {
    const rows = library.data ?? [];
    if (filter === "reading") return rows.filter((item) => (item.progress ?? 0) < 0.98);
    if (filter === "finished") return rows.filter((item) => (item.progress ?? 0) >= 0.98);
    return rows;
  }, [library.data, filter]);

  const finished = (library.data ?? []).filter((item) => (item.progress ?? 0) >= 0.98).length;
  const inProgress = (library.data ?? []).length - finished;

  return (
    <Screen
      refreshing={library.isRefetching}
      onRefresh={() => void library.refetch()}
    >
      <PageHeader
        back
        eyebrow="Vos favoris"
        title="Ma bibliothèque"
        subtitle="Les histoires ajoutées en favoris (étoile en fin de chapitre ou sur la fiche), avec la reprise exacte de votre lecture."
        right={
          <Button
            label="Découvrir"
            icon="compass-outline"
            size="sm"
            variant="secondary"
            onPress={() => router.push("/decouvrir")}
          />
        }
      />

      <Card style={styles.summary}>
        <View style={styles.summaryRow}>
          <Stat value={library.data?.length ?? 0} label="histoires suivies" compact />
          <View style={styles.rule} />
          <Stat value={inProgress} label="en cours" compact />
          <View style={styles.rule} />
          <Stat value={finished} label="terminées" compact />
        </View>
      </Card>

      <View style={styles.filter}>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Tout" },
            { value: "reading", label: "En cours" },
            { value: "finished", label: "Terminées" },
          ]}
        />
      </View>

      {library.isLoading ? (
        <LoadingState label="Classement de vos lectures…" />
      ) : library.isError ? (
        <ErrorState message={errorMessage(library.error)} onRetry={() => void library.refetch()} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon="library-outline"
            title={filter === "all" ? "Votre bibliothèque est vide" : "Aucune histoire dans ce filtre"}
            message={
              filter === "all"
                ? "Suivez une histoire depuis Découvrir : elle apparaîtra ici avec votre progression."
                : "Changez de filtre ou poursuivez une lecture pour la retrouver ici."
            }
            actionLabel="Explorer le catalogue"
            onAction={() => router.push("/decouvrir")}
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <View key={item.id} style={styles.item}>
              <StoryRowCard
                story={item}
                progress={item.progress}
                onPress={() =>
                  item.currentChapterId
                    ? router.push({ pathname: "/lecture/[id]", params: { id: item.currentChapterId } })
                    : router.push({ pathname: "/histoire-publique/[id]", params: { id: item.id } })
                }
              />
              <View style={styles.itemMeta}>
                <Badge tone={(item.progress ?? 0) >= 0.98 ? "success" : "gold"}>
                  {(item.progress ?? 0) >= 0.98
                    ? "Terminée"
                    : item.progress
                      ? `${Math.round(item.progress * 100)} % lu`
                      : "Pas commencée"}
                </Badge>
                <Text variant="caption" color={theme.textMuted} style={styles.flex}>
                  {item.authorName}
                </Text>
                <Button
                  label={(item.progress ?? 0) >= 0.98 ? "Relire" : "Reprendre"}
                  size="sm"
                  variant="ghost"
                  onPress={() =>
                    item.currentChapterId
                      ? router.push({ pathname: "/lecture/[id]", params: { id: item.currentChapterId } })
                      : router.push({ pathname: "/histoire-publique/[id]", params: { id: item.id } })
                  }
                />
              </View>
            </View>
          ))}
        </View>
      )}

      <Card style={styles.note} accent>
        <Text variant="bodyStrong">Votre progression vous appartient</Text>
        <Text variant="caption" color={theme.textSecondary}>
          La position de lecture et les signets sont privés. Un auteur ne voit pas qui lit son
          histoire, seulement le nombre agrégé de lecteurs sur son tableau de bord.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: {
    gap: spacing[3],
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rule: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: "rgba(197,164,106,0.2)",
  },
  filter: {
    marginTop: spacing[4],
    marginBottom: spacing[4],
  },
  list: {
    gap: spacing[5],
  },
  item: {
    gap: 8,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  note: {
    marginTop: spacing[6],
    gap: 6,
  },
});
