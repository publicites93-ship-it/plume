import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SKILL_BY_ID, spacing, type SkillId } from "@plume/shared";
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  InlineNotice,
  LoadingState,
  PageHeader,
  ProgressBar,
  Screen,
  SectionHeader,
  SimulationNotice,
  Stat,
  Text,
} from "@/components";
import { trpc } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { formatDate, percent } from "@/lib/format";
import { theme } from "@/theme";

const KIND_LABEL: Record<string, string> = {
  strength: "Force observée",
  improvement: "Axe de travail",
  question: "Question ouverte",
};

const KIND_TONE: Record<string, "success" | "gold" | "info"> = {
  strength: "success",
  improvement: "gold",
  question: "info",
};

const PRIORITY_LABEL: Record<string, string> = {
  low: "Priorité douce",
  medium: "Priorité moyenne",
  high: "Priorité haute",
};

const STATUS_LABEL: Record<string, string> = {
  running: "En cours",
  completed: "Terminé",
  failed: "Échec",
};

export default function AnalysisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const analysisId = String(id ?? "");
  const router = useRouter();

  const analysis = trpc.ai.get.useQuery(
    { analysisId },
    { enabled: Boolean(analysisId) },
  );

  if (analysis.isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Ouverture du diagnostic…" />
      </Screen>
    );
  }

  if (analysis.isError || !analysis.data) {
    return (
      <Screen>
        <PageHeader back title="Diagnostic" />
        <ErrorState
          message={errorMessage(analysis.error)}
          onRetry={() => void analysis.refetch()}
        />
      </Screen>
    );
  }

  const data = analysis.data;
  const skill = SKILL_BY_ID[data.skill as SkillId];
  const isSimulation = data.provider === "mock" || data.provider === "simulation";
  const findings = data.findings ?? [];
  const verifiedQuotes = findings.filter((finding) => Boolean(finding.quote)).length;

  return (
    <Screen refreshing={analysis.isRefetching} onRefresh={() => void analysis.refetch()}>
      <PageHeader
        back
        eyebrow="Diagnostic de lecture"
        title={skill?.name ?? data.skill}
        subtitle={`${data.storyTitle}${data.chapterTitle ? ` · ${data.chapterTitle}` : ""}`}
        right={
          <Badge tone={data.status === "completed" ? "success" : data.status === "failed" ? "danger" : "gold"}>
            {STATUS_LABEL[data.status] ?? data.status}
          </Badge>
        }
      />

      {isSimulation ? <SimulationNotice /> : null}

      <Card accent style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={styles.scoreWrap}>
            <Text variant="display" color={theme.goldBright}>
              {data.score ?? "—"}
            </Text>
            <Text variant="label" color={theme.textMuted}>
              repère / 100
            </Text>
          </View>
          <View style={styles.flex}>
            <Text variant="bodyStrong">
              {skill?.tagline ?? "Observation d'écriture"}
            </Text>
            <Text variant="caption" color={theme.textSecondary}>
              {data.summary ??
                "Ce diagnostic ne juge pas la valeur littéraire du texte : il décrit des effets observables et propose des pistes de travail."}
            </Text>
          </View>
        </View>
        <ProgressBar value={(data.score ?? 0) / 100} height={6} />
        <View style={styles.metaRow}>
          <Stat value={percent(data.confidence)} label="confiance" compact align="center" />
          <View style={styles.rule} />
          <Stat value={findings.length} label="constats" compact align="center" />
          <View style={styles.rule} />
          <Stat value={verifiedQuotes} label="citations vérifiées" compact align="center" />
        </View>
        <Text variant="caption" color={theme.textMuted}>
          {formatDate(data.createdAt)} · moteur {data.provider} / {data.model ?? "modèle inconnu"} ·
          méthode plume-rubric-v1
        </Text>
      </Card>

      {data.error ? (
        <InlineNotice tone="warning" title="Réserve sur ce diagnostic">
          {data.error}
        </InlineNotice>
      ) : null}

      <InlineNotice tone="info" title="Comment lire ces constats">
        Un constat décrit ce que le texte produit et avec quels moyens. Il ne remplace pas votre
        jugement d'autrice ou d'auteur. Une citation n'apparaît que si elle existe mot pour mot dans
        le chapitre enregistré.
      </InlineNotice>

      <SectionHeader title="Constats" eyebrow={`${findings.length} observation${findings.length > 1 ? "s" : ""}`} />

      {findings.length === 0 ? (
        <Card>
          <EmptyState
            icon="search-outline"
            title="Aucun constat détaillé"
            message="Le diagnostic ne contient pas encore de constat exploitable. Vous pouvez relancer l'analyse ou choisir une autre compétence."
            actionLabel="Retour au coach"
            onAction={() => router.back()}
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {findings.map((finding, index) => (
            <Card key={finding.id} style={styles.findingCard}>
              <View style={styles.findingTop}>
                <View style={styles.order}>
                  <Text variant="label" color={theme.gold}>
                    {String(index + 1).padStart(2, "0")}
                  </Text>
                </View>
                <View style={styles.flex}>
                  <View style={styles.badgeRow}>
                    <Badge tone={KIND_TONE[finding.kind] ?? "muted"}>
                      {KIND_LABEL[finding.kind] ?? finding.kind}
                    </Badge>
                    {finding.priority ? (
                      <Badge tone="muted">
                        {PRIORITY_LABEL[finding.priority] ?? finding.priority}
                      </Badge>
                    ) : null}
                  </View>
                  <Text variant="subheading">{finding.title}</Text>
                </View>
              </View>

              <Text variant="body" color={theme.textSecondary}>
                {finding.observation}
              </Text>

              {finding.quote ? (
                <View style={styles.quoteBlock}>
                  <Text variant="label" color={theme.gold}>
                    Passage cité
                  </Text>
                  <Text variant="quote" color={theme.textPrimary}>
                    « {finding.quote} »
                  </Text>
                </View>
              ) : (
                <Text variant="caption" color={theme.textMuted} style={styles.noQuote}>
                  Aucune citation vérifiée pour ce constat : le coach préfère ne pas inventer
                  d'extrait.
                </Text>
              )}

              {finding.explanation ? (
                <View style={styles.block}>
                  <Text variant="label" color={theme.textMuted}>
                    Pourquoi cela produit cet effet
                  </Text>
                  <Text variant="caption" color={theme.textSecondary}>
                    {finding.explanation}
                  </Text>
                </View>
              ) : null}

              {finding.impact ? (
                <View style={styles.block}>
                  <Text variant="label" color={theme.textMuted}>
                    Effet sur le lecteur
                  </Text>
                  <Text variant="caption" color={theme.textSecondary}>
                    {finding.impact}
                  </Text>
                </View>
              ) : null}

              {finding.recommendation ? (
                <View style={styles.recommendation}>
                  <Ionicons name="bulb-outline" size={16} color={theme.goldBright} />
                  <View style={styles.flex}>
                    <Text variant="bodyStrong" color={theme.goldBright}>
                      Piste de travail
                    </Text>
                    <Text variant="caption" color={theme.textSecondary}>
                      {finding.recommendation}
                    </Text>
                  </View>
                </View>
              ) : null}

              {finding.exercise ? (
                <View style={styles.exercise}>
                  <Text variant="label" color={theme.gold}>
                    Exercice proposé
                  </Text>
                  <Text variant="caption" color={theme.textSecondary}>
                    {finding.exercise}
                  </Text>
                  <Button
                    label="Ouvrir les ateliers"
                    icon="school-outline"
                    size="sm"
                    variant="ghost"
                    onPress={() => router.push("/apprendre")}
                    style={styles.exerciseButton}
                  />
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      )}

      <Divider ornament />

      <Card style={styles.footerCard}>
        <Text variant="bodyStrong">Et maintenant ?</Text>
        <Text variant="caption" color={theme.textSecondary}>
          Choisissez un seul constat, retravaillez votre texte vous-même, puis demandez un nouveau
          diagnostic. La comparaison des deux lectures montre ce que votre choix a changé.
        </Text>
        <View style={styles.footerActions}>
          {data.chapterId ? (
            <Button
              label="Retourner au chapitre"
              icon="create-outline"
              size="sm"
              onPress={() =>
                router.push({ pathname: "/chapitre/[id]", params: { id: data.chapterId ?? "" } })
              }
            />
          ) : null}
          <Button
            label="Retour au coach"
            icon="chatbubbles-outline"
            size="sm"
            variant="secondary"
            onPress={() => router.back()}
          />
        </View>
        <Text variant="caption" color={theme.textMuted} style={styles.legal}>
          Aucun texte n'a été modifié par cette analyse. Les scores sont des repères pédagogiques
          datés, pas une note littéraire définitive.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summaryCard: {
    gap: spacing[4],
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[4],
  },
  scoreWrap: {
    alignItems: "center",
    minWidth: 82,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rule: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: "rgba(197,164,106,0.2)",
  },
  list: {
    gap: spacing[3],
  },
  findingCard: {
    gap: spacing[3],
  },
  findingTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
  },
  order: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.28)",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  quoteBlock: {
    gap: 5,
    borderLeftWidth: 2,
    borderLeftColor: "rgba(197,164,106,0.5)",
    paddingLeft: spacing[3],
  },
  noQuote: {
    fontStyle: "italic",
  },
  block: {
    gap: 3,
  },
  recommendation: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    padding: spacing[3],
    borderRadius: 12,
    backgroundColor: "rgba(197,164,106,0.07)",
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.22)",
  },
  exercise: {
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(197,164,106,0.16)",
    paddingTop: spacing[3],
  },
  exerciseButton: {
    alignSelf: "flex-start",
    marginTop: 2,
  },
  footerCard: {
    gap: spacing[3],
  },
  footerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  legal: {
    fontSize: 10,
  },
});
