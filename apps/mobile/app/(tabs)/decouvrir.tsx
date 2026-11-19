import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GENRES, spacing } from "@plume/shared";
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
import { theme } from "@/theme";

/** Sélections proposées en tête de la liste, avant les genres. */
type SelectionKey = "trending" | "bestSellers" | "latest";
const SELECTIONS: Array<{
  key: SelectionKey;
  label: string;
  eyebrow: string;
  icon: "flame-outline" | "trophy-outline" | "sparkles-outline";
  empty: string;
}> = [
  {
    key: "trending",
    label: "Histoires du moment",
    eyebrow: "Cette semaine",
    icon: "flame-outline",
    empty: "Aucune histoire n'a encore été lue ou aimée cette semaine.",
  },
  {
    key: "bestSellers",
    label: "Best-sellers",
    eyebrow: "Les plus lues",
    icon: "trophy-outline",
    empty: "Aucune histoire publiée pour le moment.",
  },
  {
    key: "latest",
    label: "Nouveautés",
    eyebrow: "Derniers chapitres publiés",
    icon: "sparkles-outline",
    empty: "Aucune histoire publiée pour le moment.",
  },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [genre, setGenre] = useState<string | undefined>();
  // Une sélection OU un genre à la fois ; « Tous » vide les deux. Best-sellers par défaut.
  const [selection, setSelection] = useState<SelectionKey | undefined>("bestSellers");
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
  // Un genre seul affiche son propre carrousel ; la recherche et l'état
  // basculent sur la liste complète filtrée.
  const genreOnly = Boolean(genre) && !debounced && !status;
  const selectionOnly = Boolean(selection) && !genre && !debounced && !status;
  const discover = trpc.reading.discover.useQuery(undefined, { enabled: !filtering });
  // `bestSellers` n'existe que sur une API à jour : sinon, repli sur « Les plus aimées ».
  const selectionItems: Record<SelectionKey, StoryCardData[]> = {
    trending: discover.data?.trending ?? [],
    bestSellers: discover.data?.bestSellers ?? discover.data?.mostLoved ?? [],
    latest: discover.data?.latest ?? [],
  };
  const activeSelection = SELECTIONS.find((item) => item.key === selection);
  const rows: Array<{ key: string; title: string; eyebrow: string; items: StoryCardData[] }> = [
    { key: "trending", title: "Histoires du moment", eyebrow: "Cette semaine", items: discover.data?.trending ?? [] },
    { key: "bestSellers", title: "Best-sellers", eyebrow: "Les plus lues", items: selectionItems.bestSellers },
    { key: "forYou", title: "Selon vos goûts", eyebrow: "D'après vos favoris et lectures", items: discover.data?.forYou ?? [] },
    { key: "mostLoved", title: "Les plus aimées", eyebrow: "J'aime et favoris", items: discover.data?.mostLoved ?? [] },
    { key: "latest", title: "Nouveautés", eyebrow: "Derniers chapitres publiés", items: discover.data?.latest ?? [] },
    // Une rangée par catégorie, sous les sélections.
    ...(discover.data?.byGenre ?? []).map((row) => ({
      key: `genre-${row.genre}`,
      title: row.genre,
      eyebrow: "Catégorie",
      items: row.items as StoryCardData[],
    })),
  ];

  const items = catalog.data?.items ?? [];
  const hasMore = Boolean(catalog.data?.nextCursor);

  function resetFilters() {
    setSearch("");
    setDebounced("");
    setGenre(undefined);
    setSelection(undefined);
    setStatus(undefined);
  }

  function pickSelection(key: SelectionKey) {
    setSelection(key);
    setGenre(undefined);
    setStatus(undefined);
  }

  function pickGenre(item: string) {
    setGenre(item);
    setSelection(undefined);
    setStatus(undefined);
    setLimit(12);
  }

  function showAll() {
    setGenre(undefined);
    setSelection(undefined);
  }

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

      <View style={styles.filterBlock}>
        <Text variant="label" color={theme.textMuted}>
          Sélections et genres
        </Text>
        <View style={styles.chips}>
          <Chip label="Tous" selected={!genre && !selection} onPress={showAll} />
          {SELECTIONS.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              icon={item.icon}
              selected={!genre && selection === item.key}
              onPress={() => pickSelection(item.key)}
            />
          ))}
          {GENRES.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={genre === item}
              onPress={() => (genre === item ? showAll() : pickGenre(item))}
            />
          ))}
        </View>
      </View>

      {selectionOnly && activeSelection ? (
        <View style={styles.carousel}>
          <SectionHeader title={activeSelection.label} eyebrow={activeSelection.eyebrow} />
          {discover.isLoading ? (
            <LoadingState label={`Ouverture de « ${activeSelection.label} »…`} />
          ) : discover.isError ? (
            <ErrorState message={errorMessage(discover.error)} onRetry={() => void discover.refetch()} />
          ) : selectionItems[activeSelection.key].length === 0 ? (
            <EmptyState
              icon="albums-outline"
              title="Rien pour l'instant"
              message={activeSelection.empty}
              actionLabel="Voir toutes les histoires"
              onAction={showAll}
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              accessibilityLabel={activeSelection.label}
            >
              {selectionItems[activeSelection.key].map((story) => (
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
          )}
        </View>
      ) : genreOnly ? (
        <View style={styles.carousel}>
          <SectionHeader
            title={genre ?? ""}
            eyebrow={`Catégorie · ${items.length} histoire${items.length > 1 ? "s" : ""}`}
          />
          {catalog.isLoading ? (
            <LoadingState label={`Ouverture du carrousel ${genre ?? ""}…`} />
          ) : catalog.isError ? (
            <ErrorState message={errorMessage(catalog.error)} onRetry={() => void catalog.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              icon="albums-outline"
              title="Aucune histoire dans ce genre"
              message="Choisissez un autre genre ou revenez à toutes les histoires."
              actionLabel="Voir tous les genres"
              onAction={showAll}
            />
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContent}
                accessibilityLabel={`Histoires du genre ${genre ?? ""}`}
              >
                {items.map((story) => (
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
              {hasMore ? (
                <Button
                  label="Charger davantage d'histoires"
                  variant="secondary"
                  loading={catalog.isFetching}
                  onPress={() => setLimit((value) => value + 12)}
                  style={styles.genreMore}
                />
              ) : null}
            </>
          )}
        </View>
      ) : !filtering ? (
        rows
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
      ) : null}

      {!genreOnly && !selectionOnly ? (
        <>
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
              {debounced
                ? `Recherche « ${debounced} »`
                : filtering
                  ? "Sélection"
                  : "Toutes les histoires"}
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
              onAction={resetFilters}
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
                <Text
                  variant="caption"
                  color={theme.textMuted}
                  align="center"
                  style={styles.endNote}
                >
                  Vous avez atteint la fin de cette sélection.
                </Text>
              ) : null}
            </View>
          )}
        </>
      ) : null}

      <Card style={styles.disclaimer} accent>
        <View style={styles.disclaimerRow}>
          <Badge tone="gold" icon="shield-checkmark-outline">
            Confidentialité
          </Badge>
          <Text variant="caption" color={theme.textSecondary}>
            Un brouillon reste privé jusqu&apos;à ce que son auteur change sa visibilité et publie un
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
  genreMore: {
    marginTop: spacing[3],
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
