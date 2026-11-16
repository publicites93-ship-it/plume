import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  SKILLS,
  SKILL_BY_ID,
  SKILL_LEVELS,
  WORKSHOPS,
  type SkillLevel,
} from "@plume/shared";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  PageHeader,
  ProgressBar,
  Screen,
  SectionHeader,
  SimulationNotice,
  Text,
} from "@/components";
import { trpc } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { palette, theme } from "@/theme";

export default function LearnScreen() {
  const router = useRouter();
  const progress = trpc.ai.progress.useQuery();
  const learning = trpc.learning.skills.useQuery();
  const me = trpc.auth.me.useQuery(undefined);

  const skills = progress.data?.skills ?? SKILLS.map((skill) => ({
    ...skill,
    score: null,
    previousScore: null,
    level: null,
    confidence: null,
    assessmentCount: 0,
    lastAssessedAt: null,
  }));

  const summary = useMemo(() => {
    const scored = skills.filter((skill) => skill.score !== null);
    const average = scored.length
      ? Math.round(scored.reduce((sum, skill) => sum + (skill.score ?? 0), 0) / scored.length)
      : null;
    const strongest = [...scored].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
    return { average, strongest, scored: scored.length };
  }, [skills]);

  if (progress.isLoading && learning.isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Ouverture des ateliers…" />
      </Screen>
    );
  }

  if (progress.isError) {
    return (
      <Screen>
        <PageHeader eyebrow="La méthode" title="Apprendre" />
        <ErrorState
          message={errorMessage(progress.error)}
          onRetry={() => void progress.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen
      refreshing={progress.isRefetching}
      onRefresh={() => {
        void progress.refetch();
        void learning.refetch();
      }}
    >
      <PageHeader
        eyebrow="La méthode Plume"
        title="Apprendre"
        subtitle="Sept compétences, des ateliers concrets et un coach qui explique avant de conseiller."
      />

      <Card accent style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={styles.flex}>
            <Text variant="label" color={theme.gold}>
              Votre carte de compétences
            </Text>
            <Text variant="title">
              {summary.average === null ? "À construire" : `${summary.average}/100`}
            </Text>
            <Text variant="caption" color={theme.textMuted}>
              {summary.scored === 0
                ? "Aucun diagnostic encore. Chaque analyse crée un point de repère, jamais une note définitive."
                : `${summary.scored} compétence${summary.scored > 1 ? "s" : ""} évaluée${
                    summary.scored > 1 ? "s" : ""
                  } · ${progress.data?.totalAssessments ?? 0} observations cumulées`}
            </Text>
          </View>
          <View style={styles.summarySeal}>
            <Ionicons name="school-outline" size={26} color={theme.goldBright} />
          </View>
        </View>
        {summary.strongest ? (
          <View style={styles.strongestRow}>
            <Badge tone="gold" icon="sparkles-outline">
              Point fort actuel
            </Badge>
            <Text variant="caption" color={theme.textSecondary} style={styles.flex}>
              {summary.strongest.name} · {summary.strongest.score}/100
            </Text>
          </View>
        ) : null}
      </Card>

      <SectionHeader title="Les sept compétences" eyebrow="Progression" />
      <View style={styles.skillList}>
        {skills.map((skill, index) => {
          const level = skill.level as SkillLevel | null;
          const levelInfo = level ? SKILL_LEVELS[level] : null;
          return (
            <Card
              key={skill.id}
              onPress={() =>
                router.push({ pathname: "/atelier/[slug]", params: { slug: skill.workshopSlug } })
              }
              style={styles.skillCard}
            >
              <View style={styles.skillTop}>
                <View style={styles.order}>
                  <Text variant="label" color={theme.gold}>
                    {String(index + 1).padStart(2, "0")}
                  </Text>
                </View>
                <View style={styles.flex}>
                  <Text variant="heading">{skill.name}</Text>
                  <Text variant="caption" color={theme.textMuted} numberOfLines={2}>
                    {skill.tagline}
                  </Text>
                </View>
                {skill.score !== null ? (
                  <Text variant="title" color={theme.goldBright}>
                    {skill.score}
                  </Text>
                ) : (
                  <Badge tone="muted">Non évalué</Badge>
                )}
              </View>
              <ProgressBar value={(skill.score ?? 0) / 100} height={4} />
              <View style={styles.skillBottom}>
                <Text variant="caption" color={theme.textSecondary}>
                  {levelInfo ? levelInfo.label : "Commencez par un atelier"}
                </Text>
                <View style={styles.openRow}>
                  <Text variant="caption" color={theme.gold}>
                    Atelier
                  </Text>
                  <Ionicons name="arrow-forward" size={13} color={theme.gold} />
                </View>
              </View>
            </Card>
          );
        })}
      </View>

      <SectionHeader
        title="Tous les ateliers"
        eyebrow={`${WORKSHOPS.length} parcours`}
        actionLabel={`${WORKSHOPS.reduce((sum, workshop) => sum + workshop.exercises.length, 0)} exercices`}
      />
      <View style={styles.workshopList}>
        {WORKSHOPS.map((workshop) => {
          const skill = SKILL_BY_ID[workshop.skillId];
          const minutes = workshop.exercises.reduce(
            (sum, exercise) => sum + exercise.durationMinutes,
            0,
          );
          return (
            <Card
              key={workshop.slug}
              onPress={() =>
                router.push({ pathname: "/atelier/[slug]", params: { slug: workshop.slug } })
              }
            >
              <View style={styles.workshopTop}>
                <View style={styles.workshopIcon}>
                  <Ionicons name="book-outline" size={20} color={theme.goldBright} />
                </View>
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{workshop.title}</Text>
                  <Text variant="caption" color={theme.textMuted} numberOfLines={2}>
                    {workshop.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </View>
              <View style={styles.workshopMeta}>
                <Badge tone="bordeaux">{skill.name}</Badge>
                <Text variant="caption" color={theme.textMuted}>
                  {workshop.exercises.length} exercices · {minutes} min
                </Text>
              </View>
            </Card>
          );
        })}
      </View>

      <SectionHeader title="Comment le coach travaille" eyebrow="Transparence" />
      <Card>
        <Text variant="literary" color={theme.textSecondary}>
          « Un diagnostic ne dit pas si votre texte est bon. Il montre ce que votre texte fait au
          lecteur, avec quels moyens, et ce que vous pourriez essayer ensuite. »
        </Text>
        <View style={styles.methodList}>
          {[
            "Aucune réécriture : le coach ne produit pas de phrases à votre place.",
            "Aucune citation inventée : chaque extrait est vérifié dans le manuscrit.",
            "Aucune note définitive : les scores situent une compétence à un moment donné.",
          ].map((item) => (
            <View key={item} style={styles.methodRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color={theme.gold} />
              <Text variant="caption" color={theme.textSecondary} style={styles.flex}>
                {item}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.methodNotice}>
          {me.data?.coach.isSimulation ? <SimulationNotice /> : null}
        </View>
        <Button
          label="Voir la méthode complète"
          variant="ghost"
          size="sm"
          onPress={() => router.push("/reglages")}
          style={styles.methodButton}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summaryCard: {
    gap: 14,
  },
  summaryTop: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  summarySeal: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.4)",
    backgroundColor: "rgba(197,164,106,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  strongestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(197,164,106,0.18)",
    paddingTop: 12,
  },
  skillList: {
    gap: 10,
  },
  skillCard: {
    gap: 10,
  },
  skillTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },
  order: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  skillBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  openRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  workshopList: {
    gap: 10,
  },
  workshopTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },
  workshopIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(197,164,106,0.07)",
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.24)",
  },
  workshopMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  methodList: {
    gap: 8,
    marginTop: 14,
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  methodNotice: {
    marginTop: 14,
  },
  methodButton: {
    marginTop: 12,
    alignSelf: "flex-start",
  },
});
