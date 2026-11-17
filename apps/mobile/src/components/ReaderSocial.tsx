import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  COMMENT_MAX_LENGTH,
  STORY_REACTIONS,
  radii,
  spacing,
  type StoryReactionKind,
} from "@plume/shared";
import { trpc } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { formatNumber, relativeTime } from "@/lib/format";
import { toast } from "@/lib/toast";
import { Button } from "./Button";
import { Input } from "./Input";
import { Text } from "./Text";

interface ReaderColors {
  text: string;
  textMuted: string;
  accent: string;
}

/** Compteurs publics partagés : lecteurs, J'aime, favoris. */
export function StoryCounters({
  storyId,
  colors,
}: {
  storyId: string;
  colors: ReaderColors;
}) {
  const stats = trpc.reading.stats.useQuery({ storyId }, { enabled: Boolean(storyId) });
  if (!stats.data) return null;
  const items = [
    { icon: "eye-outline" as const, value: stats.data.readers, label: "lecteurs" },
    { icon: "heart-outline" as const, value: stats.data.likes, label: "J'aime" },
    { icon: "star-outline" as const, value: stats.data.favorites, label: "favoris" },
  ];
  return (
    <View style={styles.counters} accessibilityRole="summary">
      {items.map((item) => (
        <View
          key={item.icon}
          style={styles.counter}
          accessible
          accessibilityLabel={`${item.value} ${item.label}`}
        >
          <Ionicons name={item.icon} size={15} color={colors.accent} />
          <Text variant="caption" color={colors.text}>
            {formatNumber(item.value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Bloc de fin de chapitre : réactions, J'aime, favoris et commentaires. */
export function ChapterEndSocial({
  storyId,
  chapterId,
  colors,
}: {
  storyId: string;
  chapterId: string;
  colors: ReaderColors;
}) {
  const utils = trpc.useUtils();
  const stats = trpc.reading.stats.useQuery({ storyId });
  const social = trpc.reading.chapterSocial.useQuery({ chapterId });
  const comments = trpc.reading.comments.useQuery({ chapterId });
  const toggleReaction = trpc.reading.toggleReaction.useMutation();
  const toggleLike = trpc.reading.toggleChapterLike.useMutation();
  const toggleFollow = trpc.reading.toggleFollow.useMutation();
  const addComment = trpc.reading.addComment.useMutation();
  const deleteComment = trpc.reading.deleteComment.useMutation();
  const [draft, setDraft] = useState("");

  async function react(kind: StoryReactionKind) {
    try {
      const next = await toggleReaction.mutateAsync({ storyId, kind });
      utils.reading.stats.setData({ storyId }, next);
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  async function like() {
    try {
      const next = await toggleLike.mutateAsync({ chapterId });
      utils.reading.chapterSocial.setData({ chapterId }, next);
      await utils.reading.stats.invalidate({ storyId });
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  async function favorite() {
    try {
      const result = await toggleFollow.mutateAsync({ storyId });
      await Promise.all([
        utils.reading.stats.invalidate({ storyId }),
        utils.reading.story.invalidate({ storyId }),
        utils.reading.library.invalidate(),
      ]);
      toast(
        result.following
          ? "Ajoutée à vos favoris (Profil › Mes favoris)."
          : "Retirée de vos favoris.",
        "success",
      );
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  async function send() {
    const body = draft.trim();
    if (!body) return;
    try {
      await addComment.mutateAsync({ chapterId, body });
      setDraft("");
      await Promise.all([
        utils.reading.comments.invalidate({ chapterId }),
        utils.reading.stats.invalidate({ storyId }),
      ]);
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  async function remove(commentId: string) {
    try {
      await deleteComment.mutateAsync({ commentId });
      await utils.reading.comments.invalidate({ chapterId });
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  const mine = new Set(stats.data?.mine ?? []);
  const liked = social.data?.liked ?? false;
  const isFavorite = stats.data?.favorite ?? false;

  return (
    <View style={styles.block}>
      <Text variant="label" color={colors.accent} align="center">
        Votre réaction
      </Text>
      <View style={styles.reactions}>
        {STORY_REACTIONS.map((reaction) => {
          const selected = mine.has(reaction.id);
          return (
            <Pressable
              key={reaction.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${reaction.label}, ${stats.data?.reactions[reaction.id] ?? 0}`}
              disabled={toggleReaction.isPending}
              onPress={() => void react(reaction.id)}
              style={[
                styles.reaction,
                { borderColor: colors.accent },
                selected && { backgroundColor: `${colors.accent}33` },
              ]}
            >
              <Text style={styles.emoji}>{reaction.emoji}</Text>
              <Text variant="caption" color={colors.text}>
                {reaction.label}
              </Text>
              <Text variant="caption" color={colors.textMuted}>
                {formatNumber(stats.data?.reactions[reaction.id] ?? 0)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Button
          label={`${liked ? "Aimé" : "J'aime"} · ${formatNumber(social.data?.likes ?? 0)}`}
          icon={liked ? "heart" : "heart-outline"}
          variant={liked ? "primary" : "secondary"}
          size="sm"
          loading={toggleLike.isPending}
          onPress={() => void like()}
        />
        <Button
          label={isFavorite ? "Dans mes favoris" : "Ajouter aux favoris"}
          icon={isFavorite ? "star" : "star-outline"}
          variant="secondary"
          size="sm"
          loading={toggleFollow.isPending}
          onPress={() => void favorite()}
        />
      </View>

      <Text variant="label" color={colors.accent} style={styles.commentTitle}>
        Commentaires · {formatNumber(comments.data?.length ?? 0)}
      </Text>
      <Input
        value={draft}
        onChangeText={setDraft}
        placeholder="Partagez votre ressenti avec l'auteur…"
        multiline
        maxLength={COMMENT_MAX_LENGTH}
        accessibilityLabel="Votre commentaire"
      />
      <Button
        label="Publier le commentaire"
        icon="send-outline"
        size="sm"
        disabled={!draft.trim()}
        loading={addComment.isPending}
        onPress={() => void send()}
        style={styles.selfEnd}
      />
      {comments.data?.length === 0 ? (
        <Text variant="caption" color={colors.textMuted}>
          Aucun commentaire pour l'instant. Soyez le premier à écrire à l'auteur.
        </Text>
      ) : null}
      {comments.data?.map((comment) => (
        <View key={comment.id} style={[styles.comment, { borderColor: `${colors.accent}44` }]}>
          <View style={styles.commentHead}>
            <Text variant="bodyStrong" color={colors.text} style={styles.flex} numberOfLines={1}>
              {comment.authorName}
            </Text>
            <Text variant="caption" color={colors.textMuted}>
              {relativeTime(comment.createdAt)}
            </Text>
            {comment.canDelete ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Supprimer ce commentaire"
                onPress={() => void remove(comment.id)}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <Text variant="body" color={colors.text}>
            {comment.body}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  counters: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing[4],
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  block: {
    gap: spacing[3],
    marginTop: spacing[6],
  },
  reactions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  reaction: {
    alignItems: "center",
    minWidth: 72,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    gap: 2,
  },
  emoji: {
    fontSize: 22,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  commentTitle: {
    marginTop: spacing[4],
  },
  selfEnd: {
    alignSelf: "flex-end",
  },
  comment: {
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing[3],
  },
  commentHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  flex: {
    flex: 1,
  },
});
