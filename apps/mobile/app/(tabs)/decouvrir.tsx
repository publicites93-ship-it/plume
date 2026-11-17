import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GENRES, radii, spacing } from "@plume/shared";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  PageHeader,
  Screen,
  SectionHeader,
  StoryRowCard,
  StoryTile,
  Text,
  type StoryCardData,
} from "@/components";
import { trpc } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { palette, theme } from "@/theme";

export default function DiscoverScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [genre, setGenre] = useState<string | undefined>();
  const [status, setStatus] = useState<"ongoing" | "completed" | undefined>();
  const [limit, setLimit] = useState(12);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search.trim());
      setLimit(12);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const catalog = trpc.reading.catalog.useQuery({
    query: debounced || undefined,
    genre,
    status,
    limit,
    cursor: 0,
  });

  const filtering = Boolean(debounced || genre || status);
  const discover = trpc.reading.discover.useQuery(undefined, { enabled: !filtering });
  const rows: Array<{ key: string; title: string; eyebrow: string; items: StoryCardData[] }> = [
    { key: "trending", title: "Histoires du moment", eyebrow: "Cette semaine", items: discover.data?.trending ?? [] },
    { key: "forYou", title: "Selon vos goûts", eyebrow: "D'après vos favoris et lectures", items: discover.data?.forYou ?? [] },
    { key: "mostLoved", title: "Les plus aimées", eyebrow: "J'aime et favoris", items: discover.data?.mostLoved ?? [] },
    { key: "latest", title: "Nouveautés", eyebrow: "Derniers chapitres publiés", items: discover.data?.latest ?? [] },
  ];

  const items = catalog.data?.items ?? [];
  const hasMore = Boolean(catalog.data?.nextCursor);

  return (
    <Screen
      refreshing={catalog.isRefetching || discover.isRefetching}
      onRefresh={() => {
        void catalog.refetch();
        if (!filtering) void discover.refetch();
      }}
    >
      <PageHeader
        eyebrow="La bibliothèque"
        title="Découvrir"
        subtitle="Des histoires publiées par la communauté. Les manuscrits privés n'y figurent jamais."
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ma bibliothèque"
            onPress={() => router.push("/bibliotheque")}
            style={styles.libraryButton}
          >
            <Ionicons name="bookmarks-outline" size={20} color={theme.gold} />
          </Pressable>
        }
      />

      <Input
        value={search}
        onChangeText={setSearch}
        placeholder="Titre, auteur, genre…"
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Rechercher dans le catalogue"
        right={<Ionicons name="search" size={18} color={theme.textMuted} />}
      />

      {!filtering
        ? rows
            .filter((row) => row.items.length > 0)
            .map((row) => (
              <View key={row.key} style={styles.carousel}>
                <SectionHeader title={row.title} eyebrow={row.eyebrow} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselContent}
                  accessibilityLabel={row.title}
                >
                  {row.items.map((story) => (
                    <StoryTile
                      key={story.id}
                      story={story}
                      width={132}
                      onPress={() =>
                        router.push({ pathname: "/histoire-publique/[id]", params: { id: story.id } })
                      }
                    />
                  ))}
                </ScrollView>
              </View>
            ))
        : null}

      <View style={styles.filterBlock}>
        <Text variant="label" color={theme.textMuted}>
          Genres
        </Text>
        <View style={styles.chips}>
          <Chip label="Tous" selected={!genre} onPress={() => setGenre(undefined)} />
          {GENRES.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={genre === item}
              onPress={() => setGenre(genre === item ? undefined : item)}
            />
          ))}
        </View>
      </View>

      <View style={styles.statusRow}>
        <Chip
          label="Tous les états"
          selected={!status}
          onPress={() => setStatus(undefined)}
        />
        <Chip
          label="En cours"
          selected={status === "ongoing"}
          onPress={() => setStatus(status === "ongoing" ? undefined : "ongoing")}
        />
        <Chip
          label="Terminées"
          selected={status === "completed"}
          onPress={() => setStatus(status === "completed" ? undefined : "completed")}
        />
      </View>

      <View style={styles.resultHeader}>
        <Text variant="label" color={theme.gold}>
          {debounced ? `Recherche « ${debounced} »` : filtering ? "Sélection" : "Toutes les histoires"}
        </Text>
        <Text variant="caption" color={theme.textMuted}>
          {items.length} histoire{items.length > 1 ? "s" : ""}
        </Text>
      </View>

      {catalog.isLoading ? (
        <LoadingState label="Feuilletage du catalogue…" />
      ) : catalog.isError ? (
        <ErrorState message={errorMessage(catalog.error)} onRetry={() => void catalog.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="Aucune histoire ne répond"
          message="Essayez un autre genre ou un titre plus large. Les histoires doivent être publiées pour apparaître ici."
          actionLabel="Réinitialiser les filtres"
          onAction={() => {
            setSearch("");
            setDebounced("");
            setGenre(undefined);
            setStatus(undefined);
          }}
        />
      ) : (
        <View style={styles.list}>
          {items.map((story) => (
            <StoryRowCard
              key={story.id}
              story={story}
              onPress={() =>
                router.push({ pathname: "/histoire-publique/[id]", params: { id: story.id } })
              }
            />
          ))}
          {hasMore ? (
            <Button
              label="Charger davantage d'histoires"
              variant="secondary"
              loading={catalog.isFetching}
              onPress={() => setLimit((value) => value + 12)}
            />
          ) : items.length > 4 ? (
            <Text variant="caption" color={theme.textMuted} align="center" style={styles.endNote}>
              Vous avez atteint la fin de cette sélection.
            </Text>
          ) : null}
        </View>
      )}

      <Card style={styles.disclaimer} accent>
        <View style={styles.disclaimerRow}>
          <Badge tone="gold" icon="shield-checkmark-outline">
            Confidentialité
          </Badge>
          <Text variant="caption" color={theme.textSecondary}>
            Un brouillon reste privé jusqu'à ce que son auteur change sa visibilité et publie un
            chapitre. La recherche ne peut jamais révéler un manuscrit privé.
          </Text>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  carousel: {
    marginTop: spacing[4],
  },
  carouselContent: {
    gap: spacing[3],
    paddingRight: spacing[4],
  },
  libraryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBlock: {
    gap: 8,
    marginTop: spacing[4],
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: spacing[3],
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing[6],
    marginBottom: spacing[3],
  },
  list: {
    gap: spacing[3],
  },
  endNote: {
    paddingVertical: spacing[3],
  },
  disclaimer: {
    marginTop: spacing[6],
    borderColor: "rgba(197,164,106,0.24)",
  },
  disclaimerRow: {
    gap: 8,
  },
});
