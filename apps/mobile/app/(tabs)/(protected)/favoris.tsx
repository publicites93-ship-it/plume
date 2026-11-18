import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { spacing } from "@plume/shared";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  PageHeader,
  Screen,
  SectionHeader,
  Text,
} from "@/components";
import { trpc } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { relativeTime } from "@/lib/format";
import { toast } from "@/lib/toast";
import { theme } from "@/theme";

export default function BookmarksScreen() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const bookmarks = trpc.reading.bookmarks.useQuery();
  const removeBookmark = trpc.reading.removeBookmark.useMutation();

  async function remove(bookmarkId: string) {
    try {
      await removeBookmark.mutateAsync({ bookmarkId });
      await utils.reading.bookmarks.invalidate();
      toast("Signet retiré.", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  return (
    <Screen refreshing={bookmarks.isRefetching} onRefresh={() => void bookmarks.refetch()}>
      <PageHeader
        back
        eyebrow="Vos lectures"
        title="Signets"
        subtitle="Les passages que vous avez voulu garder. Le texte n'est pas recopié : le signet pointe vers le chapitre."
      />

      {bookmarks.isLoading ? (
        <LoadingState label="Retrouvaille de vos signets…" />
      ) : bookmarks.isError ? (
        <ErrorState
          message={errorMessage(bookmarks.error)}
          onRetry={() => void bookmarks.refetch()}
        />
      ) : (bookmarks.data?.length ?? 0) === 0 ? (
        <Card>
          <EmptyState
            icon="bookmark-outline"
            title="Aucun signet"
            message="Pendant une lecture, ouvrez les réglages puis « Poser un signet » pour garder un endroit précis."
            actionLabel="Explorer le catalogue"
            onAction={() => router.push("/decouvrir")}
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {bookmarks.data?.map((row) => {
            const position = Math.round((row.bookmark.position / 10_000) * 100);
            return (
              <Card key={row.bookmark.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.icon}>
                    <Text variant="label" color={theme.gold}>
                      {position}%
                    </Text>
                  </View>
                  <View style={styles.flex}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {row.storyTitle}
                    </Text>
                    <Text variant="caption" color={theme.gold} numberOfLines={1}>
                      {row.chapterTitle}
                    </Text>
                    <Text variant="caption" color={theme.textMuted}>
                      Posé {relativeTime(row.bookmark.createdAt)}
                    </Text>
                  </View>
                  <IconButton
                    icon="trash-outline"
                    label="Retirer le signet"
                    tone="danger"
                    onPress={() => void remove(row.bookmark.id)}
                  />
                </View>
                {row.bookmark.note ? (
                  <View style={styles.note}>
                    <Text variant="quote" color={theme.textSecondary}>
                      {row.bookmark.note}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.actions}>
                  <Badge tone="muted" icon="book-outline">
                    Reprendre ici
                  </Badge>
                  <View style={styles.flex} />
                  <Text
                    accessibilityRole="button"
                    accessibilityLabel={`Lire ${row.chapterTitle}`}
                    onPress={() =>
                      router.push({ pathname: "/lecture/[id]", params: { id: row.bookmark.chapterId } })
                    }
                    variant="caption"
                    color={theme.gold}
                  >
                    Ouvrir le chapitre
                  </Text>
                </View>
              </Card>
            );
          })}
        </View>
      )}

      <SectionHeader title="Une mémoire de lecture" eyebrow="Confidentialité" />
      <Card>
        <Text variant="caption" color={theme.textSecondary}>
          Vos signets sont privés. Ils ne contiennent pas de citation complète, seulement une
          position, une note personnelle et un lien vers le chapitre. Vous pouvez les supprimer
          individuellement à tout moment.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: {
    gap: spacing[3],
  },
  card: {
    gap: spacing[3],
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.3)",
    backgroundColor: "rgba(197,164,106,0.07)",
  },
  note: {
    borderLeftWidth: 2,
    borderLeftColor: "rgba(197,164,106,0.45)",
    paddingLeft: 12,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
