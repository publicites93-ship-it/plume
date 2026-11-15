import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SKILL_BY_ID, countWords, spacing } from "@plume/shared";
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  InlineNotice,
  Input,
  LoadingState,
  PageHeader,
  Screen,
  SectionHeader,
  Text,
} from "@/components";
import { trpc } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { toast } from "@/lib/toast";
import { theme } from "@/theme";

export default function WorkshopScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const workshopSlug = String(slug ?? "");
  const router = useRouter();

  const workshopQuery = trpc.learning.workshop.useQuery(
    { slug: workshopSlug },
    { enabled: Boolean(workshopSlug) },
  );
  const saveAttempt = trpc.learning.saveExerciseAttempt.useMutation();

  const [openExerciseId, setOpenExerciseId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, "started" | "completed">>({});

  async function saveExercise(exerciseId: string, status: "started" | "completed") {
    const content = drafts[exerciseId] ?? "";
    if (status === "completed" && countWords(content) < 10) {
      toast("Écrivez au moins quelques lignes avant de marquer l'exercice terminé.", "error");
      return;
    }
    try {
      await saveAttempt.mutateAsync({ exerciseId, content, status });
      setSaved((current) => ({ ...current, [exerciseId]: status }));
      toast(
        status === "completed"
          ? "Exercice marqué terminé. Votre texte reste dans l'historique."
          : "Brouillon d'exercice enregistré.",
        "success",
      );
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  if (workshopQuery.isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Ouverture de l'atelier…" />
      </Screen>
    );
  }

  if (workshopQuery.isError || !workshopQuery.data) {
    return (
      <Screen>
        <PageHeader back title="Atelier" />
        <ErrorState
          message={errorMessage(workshopQuery.error)}
          onRetry={() => void workshopQuery.refetch()}
        />
      </Screen>
    );
  }

  const workshop = workshopQuery.data;
  const skill = SKILL_BY_ID[workshop.skillId];
  const totalMinutes = workshop.exercises.reduce(
    (sum, exercise) => sum + exercise.durationMinutes,
    0,
  );

  return (
    <Screen refreshing={workshopQuery.isRefetching} onRefresh={() => void workshopQuery.refetch()}>
      <PageHeader
        back
        eyebrow={`Atelier · ${skill.name}`}
        title={workshop.title}
        subtitle={workshop.subtitle}
      />

      <Card accent style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.skillSeal}>
            <Ionicons name="school-outline" size={24} color={theme.goldBright} />
          </View>
          <View style={styles.flex}>
            <Text variant="bodyStrong">{skill.tagline}</Text>
            <Text variant="caption" color={theme.textMuted}>
              {workshop.exercises.length} exercices · {totalMinutes} min · théorie, exemples et
              critères d'auto-évaluation
            </Text>
          </View>
        </View>
        <Text variant="literary" color={theme.textSecondary}>
          {workshop.introduction}
        </Text>
        <InlineNotice tone="info" title="Question de contrôle">
          {skill.selfCheck}
        </InlineNotice>
      </Card>

      <SectionHeader title="Comprendre" eyebrow="Théorie" />
      <View style={styles.list}>
        {workshop.theory.map((section) => (
          <Card key={section.title} style={styles.theoryCard}>
            <Text variant="heading">{section.title}</Text>
            <Text variant="body" color={theme.textSecondary}>
              {section.body}
            </Text>
          </Card>
        ))}
      </View>

      <SectionHeader title="Voir à l'œuvre" eyebrow="Exemples" />
      <View style={styles.list}>
        {workshop.examples.map((example) => (
          <Card key={example.title} style={styles.exampleCard}>
            <Text variant="label" color={theme.gold}>
              {example.title}
            </Text>
            <Text variant="quote" color={theme.textPrimary}>
              « {example.text} »
            </Text>
            <Divider />
            <Text variant="caption" color={theme.textSecondary}>
              {example.commentary}
            </Text>
          </Card>
        ))}
      </View>

      <SectionHeader title="Pièges fréquents" eyebrow="Attention" />
      <View style={styles.list}>
        {workshop.commonMistakes.map((mistake) => (
          <Card key={mistake.mistake} style={styles.mistakeCard}>
            <View style={styles.mistakeRow}>
              <Ionicons name="alert-circle-outline" size={18} color={theme.warning} />
              <Text variant="bodyStrong" style={styles.flex}>
                {mistake.mistake}
              </Text>
            </View>
            <Text variant="caption" color={theme.textMuted}>
              <Text variant="caption" color={theme.gold}>Pourquoi · </Text>
              {mistake.why}
            </Text>
            <Text variant="caption" color={theme.textSecondary}>
              <Text variant="caption" color={theme.gold}>Piste · </Text>
              {mistake.fix}
            </Text>
          </Card>
        ))}
      </View>

      <SectionHeader
        title="À vous d'écrire"
        eyebrow={`${workshop.exercises.length} exercices`}
      />
      {workshop.exercises.length === 0 ? (
        <Card>
          <EmptyState
            icon="create-outline"
            title="Aucun exercice"
            message="Cet atelier n'a pas encore d'exercice publié."
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {workshop.exercises.map((exercise, index) => {
            const open = openExerciseId === exercise.id;
            const draft = drafts[exercise.id] ?? "";
            const status = saved[exercise.id];
            return (
              <Card key={exercise.id} style={styles.exerciseCard}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${open ? "Replier" : "Déplier"} l'exercice ${exercise.title}`}
                  onPress={() => setOpenExerciseId(open ? null : exercise.id)}
                  style={styles.exerciseHeader}
                >
                  <View style={styles.exerciseNumber}>
                    <Text variant="label" color={theme.gold}>
                      {String(index + 1).padStart(2, "0")}
                    </Text>
                  </View>
                  <View style={styles.flex}>
                    <View style={styles.exerciseTitleRow}>
                      <Text variant="bodyStrong" style={styles.flex}>
                        {exercise.title}
                      </Text>
                      {status ? (
                        <Badge tone={status === "completed" ? "success" : "gold"}>
                          {status === "completed" ? "Terminé" : "En cours"}
                        </Badge>
                      ) : null}
                    </View>
                    <Text variant="caption" color={theme.textMuted}>
                      {exercise.durationMinutes} min · {exercise.objective}
                    </Text>
                  </View>
                  <Ionicons
                    name={open ? "chevron-up" : "chevron-down"}
                    size={17}
                    color={theme.textMuted}
                  />
                </Pressable>

                {open ? (
                  <View style={styles.exerciseBody}>
                    <Text variant="caption" color={theme.textSecondary}>
                      {exercise.instructions}
                    </Text>
                    <View style={styles.criteria}>
                      <Text variant="label" color={theme.gold}>
                        Critères d'auto-évaluation
                      </Text>
                      {exercise.criteria.map((criterion) => (
                        <View key={criterion} style={styles.criterionRow}>
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={15}
                            color={theme.gold}
                          />
                          <Text variant="caption" color={theme.textSecondary} style={styles.flex}>
                            {criterion}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <InlineNotice tone="info" title="Après l'exercice">
                      {exercise.observe}
                    </InlineNotice>
                    <Input
                      label="Votre essai"
                      value={draft}
                      onChangeText={(value) =>
                        setDrafts((current) => ({ ...current, [exercise.id]: value }))
                      }
                      multiline
                      maxLength={20_000}
                      placeholder="Écrivez ici. Personne d'autre que vous ne lit cet essai."
                      hint={`${countWords(draft)} mots`}
                    />
                    <View style={styles.exerciseActions}>
                      <Button
                        label="Enregistrer le brouillon"
                        icon="bookmark-outline"
                        size="sm"
                        variant="secondary"
                        loading={saveAttempt.isPending}
                        disabled={!draft.trim()}
                        onPress={() => void saveExercise(exercise.id, "started")}
                      />
                      <Button
                        label="Marquer terminé"
                        icon="checkmark"
                        size="sm"
                        loading={saveAttempt.isPending}
                        disabled={!draft.trim()}
                        onPress={() => void saveExercise(exercise.id, "completed")}
                      />
                    </View>
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}

      <SectionHeader title="Appliquer à votre manuscrit" eyebrow="Transfert" />
      <Card style={styles.transferCard}>
        <Text variant="literary" color={theme.textSecondary}>
          {workshop.manuscriptPrompt}
        </Text>
        <View style={styles.transferActions}>
          <Button
            label="Retourner à l'écriture"
            icon="create-outline"
            size="sm"
            onPress={() => router.push("/ecrire")}
          />
          <Button
            label="Voir ma progression"
            icon="analytics-outline"
            size="sm"
            variant="ghost"
            onPress={() => router.push("/apprendre")}
          />
        </View>
        <Text variant="caption" color={theme.textMuted}>
          Les essais d'atelier sont privés et distincts de vos chapitres. Ils ne sont jamais publiés
          ni utilisés comme texte du manuscrit.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    gap: spacing[4],
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  skillSeal: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.35)",
    backgroundColor: "rgba(197,164,106,0.08)",
  },
  list: {
    gap: spacing[3],
  },
  theoryCard: {
    gap: 8,
  },
  exampleCard: {
    gap: spacing[3],
  },
  mistakeCard: {
    gap: 7,
  },
  mistakeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  exerciseCard: {
    padding: 0,
    gap: 0,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    padding: spacing[4],
  },
  exerciseNumber: {
    width: 30,
    paddingTop: 2,
  },
  exerciseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exerciseBody: {
    gap: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(197,164,106,0.18)",
    padding: spacing[4],
  },
  criteria: {
    gap: 7,
  },
  criterionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  exerciseActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  transferCard: {
    gap: spacing[3],
  },
  transferActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
