import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { spacing } from "@plume/shared";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Screen,
  SectionHeader,
  Stat,
  StoryRowCard,
  Text,
} from "@/components";
import { trpc } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { formatNumber } from "@/lib/format";
import { toast } from "@/lib/toast";
import { theme } from "@/theme";

export default function AuthorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const authorId = String(id ?? "");
  const router = useRouter();
  const utils = trpc.useUtils();

  const authorQuery = trpc.reading.author.useQuery({ authorId }, { enabled: Boolean(authorId) });
  const toggleFollow = trpc.reading.toggleAuthorFollow.useMutation();

  async function follow() {
    try {
      await toggleFollow.mutateAsync({ authorId });
      await utils.reading.author.invalidate({ authorId });
      toast(authorQuery.data?.isFollowing ? "Vous ne suivez plus cet auteur." : "Vous suivez cet auteur.", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  if (authorQuery.isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Ouverture du profil d'auteur…" />
      </Screen>
    );
  }

  if (authorQuery.isError || !authorQuery.data) {
    return (
      <Screen>
        <PageHeader back title="Auteur" />
        <ErrorState
          message={errorMessage(authorQuery.error)}
          onRetry={() => void authorQuery.refetch()}
        />
      </Screen>
    );
  }

  const { author, stories, stats, isFollowing } = authorQuery.data;

  return (
    <Screen
      refreshing={authorQuery.isRefetching}
      onRefresh={() => void authorQuery.refetch()}
    >
      <PageHeader back eyebrow="Voix de Plume" title={author.pseudonym} />

      <Card style={styles.identity} accent>
        <View style={styles.identityTop}>
          <Avatar name={author.pseudonym} motif={author.avatarMotif} size={76} />
          <View style={styles.flex}>
            <Text variant="heading">{author.pseudonym}</Text>
            <Text variant="caption" color={theme.textMuted} numberOfLines={5}>
              {author.bio || "Cet auteur n'a pas encore écrit de biographie."}
            </Text>
            <View style={styles.badges}>
              <Badge tone="gold" icon="book-outline">
                {`${stories.length} histoire${stories.length > 1 ? "s" : ""}`}
              </Badge>
              <Badge tone="muted" icon="people-outline">
                {`${formatNumber(stats.followers)} abonné${stats.followers > 1 ? "s" : ""}`}
              </Badge>
            </View>
          </View>
        </View>
        <View style={styles.statsRow}>
          <Stat value={stories.length} label="publications" align="center" compact />
          <View style={styles.rule} />
          <Stat value={formatNumber(stats.followers)} label="abonnés" align="center" compact />
          <View style={styles.rule} />
          <Stat
            value={stories.filter((story) => story.status === "completed").length}
            label="terminées"
            align="center"
            compact
          />
        </View>
        <Button
          label={isFollowing ? "Se désabonner" : "Suivre cet auteur"}
          icon={isFollowing ? "checkmark" : "person-add-outline"}
          variant={isFollowing ? "secondary" : "primary"}
          loading={toggleFollow.isPending}
          onPress={() => void follow()}
        />
      </Card>

      <SectionHeader title="Histoires publiées" eyebrow={`${stories.length} au catalogue`} />
      {stories.length === 0 ? (
        <Card>
          <EmptyState
            icon="book-outline"
            title="Aucune publication"
            message="Cet auteur n'a pas encore rendu d'histoire publique. Les manuscrits privés restent invisibles."
            actionLabel="Explorer le catalogue"
            onAction={() => router.push("/decouvrir")}
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {stories.map((story) => (
            <StoryRowCard
              key={story.id}
              story={{ ...story, authorName: author.pseudonym }}
              onPress={() =>
                router.push({ pathname: "/histoire-publique/[id]", params: { id: story.id } })
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  identity: {
    gap: spacing[4],
  },
  identityTop: {
    flexDirection: "row",
    gap: spacing[4],
    alignItems: "flex-start",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 7,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(197,164,106,0.18)",
    paddingTop: spacing[3],
  },
  rule: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: "rgba(197,164,106,0.2)",
  },
  list: {
    gap: spacing[4],
  },
});
