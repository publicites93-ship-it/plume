import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SKILLS, SKILL_BY_ID, countWords, spacing, type SkillId } from "@plume/shared";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  InlineNotice,
  Input,
  LoadingState,
  PageHeader,
  Screen,
  SectionHeader,
  Segmented,
  SimulationNotice,
  Text,
} from "@/components";
import { trpc } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { percent, relativeTime } from "@/lib/format";
import { toast } from "@/lib/toast";
import { theme } from "@/theme";

const STATUS_LABEL: Record<string, string> = {
  running: "En cours",
  completed: "Terminé",
  failed: "Échec",
};

export default function CoachScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const storyId = String(id ?? "");
  const router = useRouter();
  const utils = trpc.useUtils();

  const dashboard = trpc.stories.dashboard.useQuery({ storyId }, { enabled: Boolean(storyId) });
  const me = trpc.auth.me.useQuery(undefined);
  const analyses = trpc.ai.list.useQuery(
    { storyId, limit: 20 },
    { enabled: Boolean(storyId) },
  );
  const sessions = trpc.ai.sessions.useQuery({ storyId }, { enabled: Boolean(storyId) });

  const [chapterId, setChapterId] = useState<string | null>(null);
  const [skill, setSkill] = useState<SkillId>("characters");
  const [scope, setScope] = useState<"chapter" | "selection">("chapter");
  const [selection, setSelection] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);

  const activeSession = trpc.ai.session.useQuery(
    { sessionId: activeSessionId ?? "" },
    { enabled: Boolean(activeSessionId) },
  );

  const analyze = trpc.ai.analyzeChapter.useMutation();
  const analyzeAll = trpc.ai.analyzeStory.useMutation();
  const startSession = trpc.ai.startSession.useMutation();
  const send = trpc.ai.send.useMutation();

  const chapters = useMemo(
    () => [...(dashboard.data?.chapters ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [dashboard.data?.chapters],
  );
  const selectedChapterId = chapterId ?? chapters[0]?.id ?? "";
  const selectedChapter = chapters.find((chapter) => chapter.id === selectedChapterId);
  const selectedSkill = SKILL_BY_ID[skill];

  async function runAnalysis() {
    setFormError(null);
    if (!selectedChapterId) {
      setFormError("Créez un chapitre avant de lancer un diagnostic.");
      return;
    }
    if (scope === "selection" && countWords(selection) < 30) {
      setFormError(
        "Un extrait d'au moins 30 mots est nécessaire. Il doit reprendre exactement le texte enregistré du chapitre.",
      );
      return;
    }
    try {
      const result = await analyze.mutateAsync({
        storyId,
        chapterId: selectedChapterId,
        skill,
        scope,
        selection: scope === "selection" ? selection : undefined,
      });
      await Promise.all([
        utils.ai.list.invalidate({ storyId }),
        utils.ai.progress.invalidate(),
      ]);
      toast("Diagnostic prêt. Aucun texte n'a été modifié.", "success");
      router.push({ pathname: "/analyse/[id]", params: { id: result.id } });
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  async function runGlobalAnalysis() {
    setFormError(null);
    if (!selectedChapterId) {
      setFormError("Créez un chapitre avant de lancer une analyse globale.");
      return;
    }
    try {
      const result = await analyzeAll.mutateAsync({ storyId, chapterId: selectedChapterId });
      await Promise.all([
        utils.ai.list.invalidate({ storyId }),
        utils.ai.progress.invalidate(),
      ]);
      toast("Les sept compétences ont été analysées. Aucun texte n'a été modifié.", "success");
      const first = result.analyses[0];
      if (first) {
        router.push({ pathname: "/analyse/[id]", params: { id: first.id } });
      }
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  async function openNewSession() {
    setChatError(null);
    try {
      const created = await startSession.mutateAsync({ storyId });
      await utils.ai.sessions.invalidate({ storyId });
      setActiveSessionId(created.id);
    } catch (error) {
      setChatError(errorMessage(error));
    }
  }

  async function sendMessage() {
    if (!activeSessionId || !message.trim()) return;
    setChatError(null);
    try {
      await send.mutateAsync({ sessionId: activeSessionId, content: message.trim() });
      setMessage("");
      await Promise.all([
        utils.ai.session.invalidate({ sessionId: activeSessionId }),
        utils.ai.sessions.invalidate({ storyId }),
      ]);
    } catch (error) {
      setChatError(errorMessage(error));
    }
  }

  if (dashboard.isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Ouverture du coach…" />
      </Screen>
    );
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <Screen>
        <PageHeader back title="Coach" />
        <ErrorState
          message={errorMessage(dashboard.error)}
          onRetry={() => void dashboard.refetch()}
        />
      </Screen>
    );
  }

  const story = dashboard.data.story;

  return (
    <Screen
      refreshing={dashboard.isRefetching || analyses.isRefetching}
      onRefresh={() => {
        void dashboard.refetch();
        void analyses.refetch();
        void sessions.refetch();
      }}
    >
      <PageHeader
        back
        eyebrow="Coach pédagogique"
        title="Comprendre avant de corriger"
        subtitle={`${story.title} · le coach observe, cite et propose des exercices. Il ne réécrit jamais votre texte.`}
      />

      <Card accent style={styles.methodCard}>
        <View style={styles.methodRow}>
          <View style={styles.methodIcon}>
            <Ionicons name="compass-outline" size={22} color={theme.goldBright} />
          </View>
          <View style={styles.flex}>
            <Text variant="bodyStrong">Une analyse, pas un verdict</Text>
            <Text variant="caption" color={theme.textSecondary}>
              Chaque diagnostic part d'un passage réel. Une citation qui ne figure pas dans le
              manuscrit est retirée automatiquement.
            </Text>
          </View>
        </View>
        {me.data?.coach.isSimulation ? <SimulationNotice compact /> : null}
      </Card>

      <SectionHeader title="Lancer un diagnostic" eyebrow="Atelier" />

      {chapters.length === 0 ? (
        <Card>
          <EmptyState
            icon="document-text-outline"
            title="Aucun chapitre"
            message="Écrivez d'abord quelques lignes : le coach a besoin d'un texte réel pour observer votre écriture."
            actionLabel="Aller à l'atelier d'écriture"
            onAction={() => router.push("/ecrire")}
          />
        </Card>
      ) : (
        <Card style={styles.formCard}>
          {formError ? <InlineNotice tone="danger">{formError}</InlineNotice> : null}

          <View style={styles.fieldGroup}>
            <Text variant="label" color={theme.textSecondary}>
              Chapitre
            </Text>
            <View style={styles.chips}>
              {chapters.map((chapter) => (
                <Chip
                  key={chapter.id}
                  label={chapter.title}
                  selected={chapter.id === selectedChapterId}
                  onPress={() => {
                    setChapterId(chapter.id);
                    setSelection("");
                  }}
                />
              ))}
            </View>
            {selectedChapter ? (
              <Text variant="caption" color={theme.textMuted}>
                {selectedChapter.wordCount} mots enregistrés · version {selectedChapter.version}
              </Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text variant="label" color={theme.textSecondary}>
              Compétence à observer
            </Text>
            <View style={styles.chips}>
              {SKILLS.map((item) => (
                <Chip
                  key={item.id}
                  label={item.name}
                  selected={item.id === skill}
                  onPress={() => setSkill(item.id)}
                />
              ))}
            </View>
            <Text variant="caption" color={theme.textMuted}>
              {selectedSkill.tagline} — {selectedSkill.selfCheck}
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text variant="label" color={theme.textSecondary}>
              Portée
            </Text>
            <Segmented
              options={[
                { value: "chapter", label: "Chapitre entier" },
                { value: "selection", label: "Extrait précis" },
              ]}
              value={scope}
              onChange={setScope}
            />
          </View>

          {scope === "selection" ? (
            <Input
              label="Extrait à analyser"
              value={selection}
              onChangeText={setSelection}
              multiline
              maxLength={20_000}
              placeholder="Collez ici un passage exact du chapitre enregistré…"
              hint={`${countWords(selection)} mots · 30 minimum. L'extrait doit être identique au texte enregistré.`}
            />
          ) : null}

          <Button
            label={analyze.isPending ? "Lecture en cours…" : "Demander un diagnostic"}
            icon="sparkles-outline"
            loading={analyze.isPending}
            disabled={analyzeAll.isPending}
            onPress={runAnalysis}
            fullWidth
          />
          <Button
            label={
              analyzeAll.isPending
                ? "Analyse des sept compétences…"
                : "Analyser les sept compétences"
            }
            icon="layers-outline"
            variant="secondary"
            loading={analyzeAll.isPending}
            disabled={analyze.isPending}
            onPress={runGlobalAnalysis}
            fullWidth
          />
          <Text variant="caption" color={theme.textMuted}>
            L'analyse ne modifie ni le chapitre ni ses versions. Elle crée un instantané de lecture.
            L'analyse globale des sept compétences utilise un crédit d'analyse étendue.
          </Text>
        </Card>
      )}

      <SectionHeader
        title="Diagnostics récents"
        eyebrow={`${analyses.data?.length ?? 0} analyse${(analyses.data?.length ?? 0) > 1 ? "s" : ""}`}
      />
      {analyses.isLoading ? (
        <LoadingState label="Chargement des diagnostics…" />
      ) : analyses.isError ? (
        <ErrorState
          compact
          message={errorMessage(analyses.error)}
          onRetry={() => void analyses.refetch()}
        />
      ) : (analyses.data?.length ?? 0) === 0 ? (
        <Card>
          <EmptyState
            icon="search-outline"
            title="Aucun diagnostic"
            message="Lancez une première analyse : vous obtiendrez des constats précis, des citations vérifiées et un exercice à essayer."
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {analyses.data?.map((analysis) => {
            const analysisSkill = SKILL_BY_ID[analysis.skill as SkillId];
            return (
              <Card
                key={analysis.id}
                onPress={() =>
                  router.push({ pathname: "/analyse/[id]", params: { id: analysis.id } })
                }
                style={styles.analysisCard}
              >
                <View style={styles.analysisTop}>
                  <View style={styles.flex}>
                    <Text variant="bodyStrong">
                      {analysisSkill?.name ?? analysis.skill}
                    </Text>
                    <Text variant="caption" color={theme.textMuted} numberOfLines={1}>
                      {analysis.chapterTitle ?? "Chapitre supprimé"} ·{" "}
                      {relativeTime(analysis.createdAt)}
                    </Text>
                  </View>
                  <Badge
                    tone={
                      analysis.status === "completed"
                        ? "success"
                        : analysis.status === "failed"
                          ? "danger"
                          : "gold"
                    }
                  >
                    {STATUS_LABEL[analysis.status] ?? analysis.status}
                  </Badge>
                </View>
                {analysis.summary ? (
                  <Text variant="caption" color={theme.textSecondary} numberOfLines={2}>
                    {analysis.summary}
                  </Text>
                ) : null}
                <View style={styles.analysisMeta}>
                  <Text variant="caption" color={theme.gold}>
                    {analysis.score === null ? "Score non calculé" : `${analysis.score}/100`}
                  </Text>
                  <Text variant="caption" color={theme.textMuted}>
                    confiance {percent(analysis.confidence)}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
                </View>
              </Card>
            );
          })}
        </View>
      )}

      <SectionHeader title="Conversation de méthode" eyebrow="Coach" />
      <Card style={styles.chatCard}>
        <Text variant="caption" color={theme.textSecondary}>
          Le coach peut vous aider à formuler un problème, comparer deux intentions ou proposer une
          contrainte d'écriture. Il refuse explicitement de rédiger vos phrases à votre place.
        </Text>

        {chatError ? <InlineNotice tone="danger">{chatError}</InlineNotice> : null}

        {(sessions.data?.length ?? 0) === 0 ? (
          <View style={styles.chatEmpty}>
            <Text variant="bodyStrong">Aucune conversation</Text>
            <Text variant="caption" color={theme.textMuted}>
              Commencez par décrire ce qui vous bloque dans la scène en cours.
            </Text>
            <Button
              label="Commencer une conversation"
              icon="chatbubble-ellipses-outline"
              loading={startSession.isPending}
              onPress={openNewSession}
              style={styles.selfStart}
            />
          </View>
        ) : (
          <>
            <View style={styles.sessionRow}>
              <View style={styles.sessionChips}>
                {sessions.data?.map((item) => (
                  <Chip
                    key={item.id}
                    label={`Conversation · ${relativeTime(item.updatedAt)}`}
                    selected={item.id === activeSessionId}
                    onPress={() => {
                      setChatError(null);
                      setActiveSessionId(item.id);
                    }}
                  />
                ))}
              </View>
              <Button
                label="Nouvelle"
                icon="add"
                size="sm"
                variant="ghost"
                loading={startSession.isPending}
                onPress={openNewSession}
              />
            </View>

            {!activeSessionId ? (
              <InlineNotice tone="info">
                Choisissez une conversation ci-dessus pour reprendre le fil.
              </InlineNotice>
            ) : activeSession.isLoading ? (
              <LoadingState label="Ouverture de la conversation…" />
            ) : activeSession.isError ? (
              <ErrorState
                compact
                message={errorMessage(activeSession.error)}
                onRetry={() => void activeSession.refetch()}
              />
            ) : (
              <View style={styles.messages}>
                {(activeSession.data?.messages.length ?? 0) === 0 ? (
                  <Text variant="caption" color={theme.textMuted}>
                    La conversation est vide. Posez votre première question.
                  </Text>
                ) : (
                  activeSession.data?.messages.map((item) => (
                    <View
                      key={item.id}
                      style={[
                        styles.bubble,
                        item.role === "user" ? styles.userBubble : styles.coachBubble,
                      ]}
                    >
                      <Text variant="label" color={item.role === "user" ? theme.textMuted : theme.gold}>
                        {item.role === "user" ? "Vous" : "Coach"}
                      </Text>
                      <Text
                        variant="caption"
                        color={item.role === "user" ? theme.textPrimary : theme.textSecondary}
                      >
                        {item.content}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {activeSessionId ? (
              <View style={styles.composer}>
                <Input
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Décrivez ce qui vous bloque…"
                  multiline
                  maxLength={4000}
                  containerStyle={styles.flex}
                />
                <Button
                  label="Envoyer"
                  icon="send-outline"
                  loading={send.isPending}
                  disabled={!message.trim()}
                  onPress={sendMessage}
                />
              </View>
            ) : null}
          </>
        )}
      </Card>

      <InlineNotice tone="info" title="Ce que le coach ne fera pas">
        Il ne produit pas de paragraphes de remplacement, n'invente pas de citations et ne prétend
        pas connaître vos personnages hors du manuscrit. Si une demande de réécriture est détectée,
        il la refuse et propose une méthode de travail.
      </InlineNotice>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  methodCard: {
    gap: spacing[4],
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.35)",
    backgroundColor: "rgba(197,164,106,0.08)",
  },
  formCard: {
    gap: spacing[4],
  },
  fieldGroup: {
    gap: 8,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  list: {
    gap: spacing[3],
  },
  analysisCard: {
    gap: 9,
  },
  analysisTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  analysisMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(197,164,106,0.16)",
    paddingTop: 9,
  },
  chatCard: {
    gap: spacing[4],
  },
  chatEmpty: {
    gap: 8,
    paddingVertical: spacing[3],
  },
  selfStart: {
    alignSelf: "flex-start",
  },
  sessionRow: {
    gap: 10,
  },
  sessionChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  messages: {
    gap: 10,
  },
  bubble: {
    gap: 5,
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing[3],
    maxWidth: "94%",
  },
  userBubble: {
    alignSelf: "flex-end",
    borderColor: "rgba(197,164,106,0.35)",
    backgroundColor: "rgba(197,164,106,0.08)",
  },
  coachBubble: {
    alignSelf: "flex-start",
    borderColor: "rgba(143,163,192,0.28)",
    backgroundColor: "rgba(143,163,192,0.06)",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
});
