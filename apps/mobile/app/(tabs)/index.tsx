import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  SKILL_BY_ID,
  WORKSHOPS,
  WRITING_PROMPTS,
  radii,
  spacing,
  touchTarget,
} from "@plume/shared";
import {
  Badge,
  Button,
  Card,
  Cover,
  EmptyState,
  LoadingState,
  PageHeader,
  ProgressBar,
  Screen,
  SectionHeader,
  SimulationNotice,
  Stat,
  StoryRowCard,
  Text,
  type CoverMotif,
} from "@/components";
import { trpc } from "@/lib/api";
import { formatNumber, greeting, relativeTime } from "@/lib/format";
import { palette, theme } from "@/theme";

export default function HomeScreen() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery(undefined);
  const stories = trpc.stories.list.useQuery();
  const library = trpc.reading.library.useQuery();
  const progress = trpc.ai.progress.useQuery();
  const currentStory = stories.data?.[0];
  const dashboard = trpc.stories.dashboard.useQuery(
    { storyId: currentStory?.id ?? "" },
    { enabled: Boolean(currentStory?.id) },
  );

  const refresh = async () => {
    await Promise.all([
      utils.auth.me.invalidate(),
      utils.stories.list.invalidate(),
      utils.reading.library.invalidate(),
      utils.ai.progress.invalidate(),
    ]);
  };

  const refreshing =
    me.isRefetching || stories.isRefetching || library.isRefetching || progress.isRefetching;

  const dayIndex = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  }, []);

  const prompt = WRITING_PROMPTS[dayIndex % WRITING_PROMPTS.length]!;
  const promptSkill = SKILL_BY_ID[prompt.skillId];
  const workshop = WORKSHOPS[dayIndex % WORKSHOPS.length]!;

  const lastChapter = useMemo(() => {
    const chapters = dashboard.data?.chapters ?? [];
    return [...chapters].sort((a, b) => a.orderIndex - b.orderIndex).at(-1);
  }, [dashboard.data]);

  const topSkills = useMemo(
    () =>
      [...(progress.data?.skills ?? [])]
        .filter((skill) => skill.score !== null)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 3),
    [progress.data],
  );

  if (!me.data) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Ouverture de votre atelier…" />
      </Screen>
    );
  }

  const profile = me.data.profile;
  const plan = me.data.plan;
  const totalWords = stories.data?.reduce((sum, story) => sum + story.wordCount, 0) ?? 0;
  const currentWordCount = dashboard.data?.stats.wordCount ?? currentStory?.wordCount ?? 0;
  const reading = library.data ?? [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(new Date())}
        title={`${greeting()}, ${profile.pseudonym}`}
        subtitle="Votre atelier est ouvert. Le manuscrit attend sans vous presser."
        right={<Badge tone="gold">{plan.planName}</Badge>}
      />

      <Card style={styles.heroCard} padded={false} accent>
        <View style={styles.heroGlow} pointerEvents="none" />
        {currentStory ? (
          <View style={styles.heroContent}>
            <Cover
              title={currentStory.title}
              motif={(currentStory.coverMotif as CoverMotif) ?? "arch"}
              imageUrl={currentStory.coverAssetUrl}
              width={104}
              height={156}
              label={currentStory.genre ?? undefined}
            />
            <View style={styles.heroBody}>
              <Text variant="label" color={theme.gold}>
                Manuscrit en cours
              </Text>
              <Text variant="title" numberOfLines={2}>
                {currentStory.title}
              </Text>
              <Text variant="caption" color={theme.textMuted} numberOfLines={2}>
                {currentStory.synopsis ??
                  "Votre histoire est privée. Elle n'apparaîtra jamais dans le catalogue sans votre accord."}
              </Text>
              <View style={styles.heroStats}>
                <Stat value={formatNumber(currentWordCount)} label="mots" compact />
                <View style={styles.verticalRule} />
                <Stat value={dashboard.data?.stats.chapterCount ?? 0} label="chapitres" compact />
                <View style={styles.verticalRule} />
                <Stat
                  value={dashboard.data?.stats.publishedCount ?? 0}
                  label="publiés"
                  compact
                />
              </View>
              <View style={styles.heroActions}>
                <Button
                  label={lastChapter ? "Reprendre l'écriture" : "Commencer le premier chapitre"}
                  icon="create-outline"
                  size="sm"
                  onPress={() =>
                    lastChapter
                      ? router.push({ pathname: "/chapitre/[id]", params: { id: lastChapter.id } })
                      : router.push({ pathname: "/histoire/[id]", params: { id: currentStory.id } })
                  }
                />
                <Button
                  label="Tableau de bord"
                  variant="ghost"
                  size="sm"
                  onPress={() =>
                    router.push({ pathname: "/histoire/[id]", params: { id: currentStory.id } })
                  }
                />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.heroEmpty}>
            <Ionicons name="book-outline" size={28} color={theme.gold} />
            <Text variant="heading">La première page est encore blanche</Text>
            <Text variant="caption" color={theme.textMuted} align="center">
              Créez une histoire privée, puis laissez le coach vous poser les bonnes questions.
            </Text>
            <Button
              label="Commencer une histoire"
              icon="add"
              onPress={() => router.push("/ecrire")}
            />
          </View>
        )}
      </Card>

      <View style={styles.quickActions}>
        <QuickAction
          icon="create-outline"
          label="Écrire"
          onPress={() => router.push("/ecrire")}
        />
        <QuickAction
          icon="chatbubbles-outline"
          label="Coach"
          onPress={() =>
            currentStory
              ? router.push({ pathname: "/coach/[id]", params: { id: currentStory.id } })
              : router.push("/ecrire")
          }
        />
        <QuickAction
          icon="library-outline"
          label="Bibliothèque"
          onPress={() => router.push("/bibliotheque")}
        />
        <QuickAction
          icon="compass-outline"
          label="Découvrir"
          onPress={() => router.push("/decouvrir")}
        />
      </View>

      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard} padded>
          <Text variant="label" color={theme.textMuted}>
            Manuscrits
          </Text>
          <Text variant="title" color={theme.goldBright}>
            {formatNumber(stories.data?.length ?? 0)}
          </Text>
          <Text variant="caption" color={theme.textMuted}>
            {formatNumber(totalWords)} mots au total
          </Text>
        </Card>
        <Card style={styles.summaryCard} padded>
          <Text variant="label" color={theme.textMuted}>
            Enveloppe coach
          </Text>
          <Text variant="title" color={theme.goldBright}>
            {formatNumber(plan.creditsRemaining)}
          </Text>
          <ProgressBar
            value={plan.creditsLimit ? plan.creditsRemaining / plan.creditsLimit : 0}
            height={4}
          />
          <Text variant="caption" color={theme.textMuted}>
            crédits restants ce mois
          </Text>
        </Card>
      </View>

      <SectionHeader
        title="Reprendre la lecture"
        actionLabel={reading.length ? "Tout voir" : undefined}
        onAction={() => router.push("/bibliotheque")}
        eyebrow="Votre bibliothèque"
      />
      {reading.length === 0 ? (
        <Card>
          <EmptyState
            icon="bookmark-outline"
            title="Aucune lecture en cours"
            message="Suivez une histoire depuis Découvrir pour la retrouver ici, même après une pause."
            actionLabel="Explorer le catalogue"
            onAction={() => router.push("/decouvrir")}
          />
        </Card>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontal}
        >
          {reading.slice(0, 6).map((item) => (
            <View key={item.id} style={styles.libraryCard}>
              <StoryRowCard
                story={{
                  ...item,
                  authorName: item.authorName,
                }}
                progress={item.progress}
                compact
                onPress={() =>
                  item.currentChapterId
                    ? router.push({
                        pathname: "/lecture/[id]",
                        params: { id: item.currentChapterId },
                      })
                    : router.push({ pathname: "/histoire-publique/[id]", params: { id: item.id } })
                }
              />
            </View>
          ))}
        </ScrollView>
      )}

      <SectionHeader title="Votre progression" eyebrow="Compétences" actionLabel="Apprendre" onAction={() => router.push("/apprendre")} />
      {topSkills.length === 0 ? (
        <Card>
          <View style={styles.skillEmpty}>
            <View style={styles.skillEmptyIcon}>
              <Ionicons name="analytics-outline" size={22} color={theme.gold} />
            </View>
            <View style={styles.flex}>
              <Text variant="bodyStrong">Aucun diagnostic pour l'instant</Text>
              <Text variant="caption" color={theme.textMuted}>
                Demandez une analyse de chapitre pour obtenir des constats argumentés, appuyés sur
                des citations réelles de votre texte.
              </Text>
            </View>
          </View>
          <Button
            label="Ouvrir le coach"
            variant="secondary"
            size="sm"
            onPress={() =>
              currentStory
                ? router.push({ pathname: "/coach/[id]", params: { id: currentStory.id } })
                : router.push("/ecrire")
            }
            style={styles.skillButton}
          />
        </Card>
      ) : (
        <View style={styles.skills}>
          {topSkills.map((skill) => (
            <Card key={skill.id} style={styles.skillCard} padded>
              <View style={styles.skillHeader}>
                <Text variant="bodyStrong">{skill.name}</Text>
                <Badge tone="gold">{skill.level ?? "—"}</Badge>
              </View>
              <ProgressBar value={(skill.score ?? 0) / 100} height={5} />
              <Text variant="caption" color={theme.textMuted}>
                {skill.score ?? 0}/100 · {skill.assessmentCount} analyse
                {skill.assessmentCount > 1 ? "s" : ""}
              </Text>
            </Card>
          ))}
        </View>
      )}

      <SectionHeader title="Le mot du jour" eyebrow="Contrainte d'écriture" />
      <Card accent>
        <View style={styles.promptHeader}>
          <Badge tone="bordeaux">{promptSkill.name}</Badge>
          <Text variant="caption" color={theme.textMuted}>
            {prompt.minutes} min
          </Text>
        </View>
        <Text variant="literary" color={palette.parchment} style={styles.promptText}>
          {prompt.text}
        </Text>
        <Button
          label="Voir l'atelier lié"
          icon="arrow-forward"
          variant="secondary"
          size="sm"
          onPress={() =>
            router.push({ pathname: "/atelier/[slug]", params: { slug: promptSkill.workshopSlug } })
          }
        />
      </Card>

      <SectionHeader
        title="Atelier du jour"
        eyebrow="Apprendre"
        actionLabel="Tous les ateliers"
        onAction={() => router.push("/apprendre")}
      />
      <Card onPress={() => router.push({ pathname: "/atelier/[slug]", params: { slug: workshop.slug } })}>
        <View style={styles.workshopRow}>
          <View style={styles.workshopIcon}>
            <Ionicons name="school-outline" size={22} color={theme.goldBright} />
          </View>
          <View style={styles.flex}>
            <Text variant="heading">{workshop.title}</Text>
            <Text variant="caption" color={theme.textMuted} numberOfLines={2}>
              {workshop.subtitle}
            </Text>
            <Text variant="caption" color={theme.gold}>
              {workshop.exercises.length} exercices · {workshop.exercises.reduce((sum, exercise) => sum + exercise.durationMinutes, 0)} min
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.gold} />
        </View>
      </Card>

      {progress.data?.recentAnalyses.length ? (
        <>
          <SectionHeader title="Derniers diagnostics" eyebrow="Coach" />
          <Card padded={false}>
            {progress.data.recentAnalyses.slice(0, 3).map((analysis, index) => (
              <View
                key={analysis.id}
                style={[styles.analysisRow, index > 0 && styles.analysisBorder]}
              >
                <View style={styles.flex}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {SKILL_BY_ID[analysis.skill as keyof typeof SKILL_BY_ID]?.name ?? analysis.skill}
                  </Text>
                  <Text variant="caption" color={theme.textMuted} numberOfLines={1}>
                    {analysis.storyTitle} · {relativeTime(analysis.createdAt)}
                  </Text>
                </View>
                <Text variant="subheading" color={theme.goldBright}>
                  {analysis.score ?? "—"}
                </Text>
              </View>
            ))}
          </Card>
          <View style={styles.noticeWrap}>
            {me.data?.coach.isSimulation ? <SimulationNotice compact /> : null}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={20} color={theme.goldBright} />
      </View>
      <Text variant="caption" color={theme.textSecondary}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  heroCard: {
    backgroundColor: "rgba(36,52,75,0.55)",
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -70,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(197,164,106,0.10)",
  },
  heroContent: {
    flexDirection: "row",
    gap: spacing[4],
    padding: spacing[4],
    alignItems: "center",
  },
  heroBody: {
    flex: 1,
    gap: 6,
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
    marginBottom: 2,
  },
  verticalRule: {
    width: StyleSheet.hairlineWidth,
    height: 26,
    backgroundColor: "rgba(197,164,106,0.25)",
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  heroEmpty: {
    alignItems: "center",
    gap: spacing[3],
    padding: spacing[6],
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginTop: spacing[4],
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    minHeight: touchTarget.minimum,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.28)",
    backgroundColor: "rgba(28,40,59,0.8)",
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing[3],
    marginTop: spacing[4],
  },
  summaryCard: {
    flex: 1,
    gap: 3,
  },
  horizontal: {
    gap: spacing[3],
    paddingRight: 20,
    paddingVertical: 2,
  },
  libraryCard: {
    width: 284,
  },
  skills: {
    gap: spacing[3],
  },
  skillCard: {
    gap: 7,
  },
  skillHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  skillEmpty: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  skillEmptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.28)",
  },
  skillButton: {
    marginTop: spacing[4],
  },
  promptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing[3],
  },
  promptText: {
    marginBottom: spacing[4],
  },
  workshopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  workshopIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(197,164,106,0.08)",
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.22)",
  },
  analysisRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  analysisBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(197,164,106,0.16)",
  },
  noticeWrap: {
    marginTop: spacing[3],
  },
});
