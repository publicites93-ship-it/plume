import { StyleSheet, View } from "react-native";
import { radii, spacing } from "@plume/shared";
import { Card } from "./Card";
import { Cover, type CoverMotif } from "./Cover";
import { Text } from "./Text";
import { Badge } from "./Misc";
import { formatNumber } from "@/lib/format";
import { theme } from "@/theme";

export interface StoryCardData {
  id: string;
  title: string;
  genre?: string | null;
  synopsis?: string | null;
  excerpt?: string | null;
  authorName?: string | null;
  wordCount?: number | null;
  chapterCount?: number | null;
  status?: string | null;
  visibility?: string | null;
  coverMotif?: string | null;
  coverAssetUrl?: string | null;
  subtitle?: string | null;
}

const motifs: CoverMotif[] = ["arch", "rose", "quill", "moon", "castle", "owl"];

function toMotif(value?: string | null): CoverMotif {
  return motifs.includes(value as CoverMotif) ? (value as CoverMotif) : "arch";
}

export function StoryRowCard({
  story,
  onPress,
  progress,
  compact = false,
}: {
  story: StoryCardData;
  onPress?: () => void;
  progress?: number | null;
  compact?: boolean;
}) {
  return (
    <Card onPress={onPress} padded={false} accessibilityLabel={`Ouvrir ${story.title}`}>
      <View style={styles.row}>
        <Cover
          title={story.title}
          motif={toMotif(story.coverMotif)}
          imageUrl={story.coverAssetUrl}
          width={compact ? 76 : 92}
          height={compact ? 114 : 138}
          label={story.authorName ?? story.genre ?? undefined}
          compact={compact}
        />
        <View style={styles.rowBody}>
          <View style={styles.badges}>
            {story.genre ? <Badge tone="bordeaux">{story.genre}</Badge> : null}
            {story.status ? (
              <Badge
                tone={
                  story.status === "completed"
                    ? "success"
                    : story.status === "draft"
                      ? "muted"
                      : "gold"
                }
              >
                {story.status === "completed"
                  ? "Terminée"
                  : story.status === "draft"
                    ? "Brouillon"
                    : story.status === "paused"
                      ? "En pause"
                      : "En cours"}
              </Badge>
            ) : null}
          </View>
          <Text variant="heading" numberOfLines={2}>
            {story.title}
          </Text>
          {story.authorName ? (
            <Text variant="caption" color={theme.gold}>
              {story.authorName}
            </Text>
          ) : null}
          <Text variant="caption" color={theme.textMuted} numberOfLines={compact ? 2 : 3}>
            {story.excerpt ?? story.synopsis ?? story.subtitle ?? "Un manuscrit en attente de vos mots."}
          </Text>
          <View style={styles.metaRow}>
            <Text variant="caption" color={theme.textSecondary}>
              {formatNumber(story.wordCount ?? 0)} mots
            </Text>
            <View style={styles.dot} />
            <Text variant="caption" color={theme.textSecondary}>
              {story.chapterCount ?? 0} chapitre{(story.chapterCount ?? 0) > 1 ? "s" : ""}
            </Text>
          </View>
          {progress !== null && progress !== undefined ? (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
              </View>
              <Text variant="caption" color={theme.textMuted}>
                {Math.round(progress * 100)} %
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

export function StoryTile({
  story,
  onPress,
  width = 148,
}: {
  story: StoryCardData;
  onPress?: () => void;
  width?: number;
}) {
  return (
    <Card
      onPress={onPress}
      padded={false}
      style={{ width }}
      accessibilityLabel={`Découvrir ${story.title}`}
    >
      <Cover
        title={story.title}
        motif={toMotif(story.coverMotif)}
          imageUrl={story.coverAssetUrl}
        width={width}
        height={width * 1.45}
        label={story.authorName ?? undefined}
      />
      <View style={styles.tileBody}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {story.title}
        </Text>
        <Text variant="caption" color={theme.textMuted} numberOfLines={1}>
          {story.authorName ?? story.genre ?? "Plume"}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  rowBody: {
    flex: 1,
    padding: spacing[4],
    gap: 5,
    justifyContent: "center",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 3,
  },
  dot: {
    width: 2.5,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: theme.gold,
    opacity: 0.6,
  },
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(197,164,106,0.16)",
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.gold,
  },
  tileBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(197,164,106,0.18)",
  },
});

export const storyCardRadii = radii.md;
