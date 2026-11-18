import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CHARACTER_SECTIONS, LOCATION_SECTIONS, spacing } from "@plume/shared";
import { trpc } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { relativeTime } from "@/lib/format";
import { toast } from "@/lib/toast";
import { theme } from "@/theme";
import { Button } from "./Button";
import { Card } from "./Card";
import { InlineNotice } from "./Feedback";
import { Badge, SectionHeader } from "./Misc";
import { Text } from "./Text";

const FIELD_LABEL: Record<string, string> = Object.fromEntries(
  [...CHARACTER_SECTIONS, ...LOCATION_SECTIONS].flatMap((section) =>
    section.fields.map((field) => [field.key, field.label]),
  ),
);

const STATUS_LABEL: Record<string, string> = {
  never: "Jamais analysé",
  running: "Analyse en cours…",
  done: "Analysé",
  failed: "Échec",
  idle: "En attente",
};

const REQUEST_MESSAGE: Record<string, string> = {
  queued: "Analyse lancée. Les fiches se mettent à jour dans quelques secondes.",
  running: "Ce chapitre est déjà en cours d'analyse.",
  up_to_date: "Ce chapitre est déjà à jour.",
  deferred: "Analyse récente : réessayez dans quelques minutes.",
  too_short: "Chapitre trop court pour être analysé (30 mots minimum).",
};

/**
 * Analyse automatique et propositions de l'IA. Les informations extraites ont
 * toujours une citation du chapitre ; celles qui contredisent l'auteur
 * attendent sa décision.
 */
export function StudioAnalysis({
  storyId,
  entityNames,
}: {
  storyId: string;
  entityNames: Map<string, string>;
}) {
  const utils = trpc.useUtils();
  const overview = trpc.studio.overview.useQuery(
    { storyId },
    {
      refetchInterval: (query) =>
        query.state.data?.chapters.some((chapter) => chapter.status === "running") ? 3_000 : false,
    },
  );
  const proposals = trpc.studio.proposals.useQuery({ storyId });
  const request = trpc.studio.requestAnalysis.useMutation();
  const decide = trpc.studio.decide.useMutation();

  const running = overview.data?.chapters.some((chapter) => chapter.status === "running") ?? false;

  async function refreshAll() {
    await Promise.all([
      utils.studio.overview.invalidate({ storyId }),
      utils.studio.proposals.invalidate({ storyId }),
      utils.narrative.list.invalidate({ storyId }),
    ]);
  }

  async function analyze(chapterId: string) {
    try {
      const result = await request.mutateAsync({ chapterId, manual: true });
      if (result.status === "quota") {
        toast(`Quota d'analyses atteint ce mois-ci (${result.used}/${result.limit}).`, "error");
      } else {
        toast(REQUEST_MESSAGE[result.status] ?? "Demande enregistrée.", result.status === "queued" ? "success" : "info");
      }
      await refreshAll();
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  async function analyzeChanged() {
    const pending = (overview.data?.chapters ?? []).filter((chapter) => !chapter.upToDate && chapter.status !== "running");
    const remaining = overview.data?.quota.chapterAnalyses.remaining ?? 0;
    if (pending.length === 0) {
      toast("Tous les chapitres sont déjà à jour.", "info");
      return;
    }
    for (const chapter of pending.slice(0, remaining)) {
      await request.mutateAsync({ chapterId: chapter.id, manual: true }).catch(() => undefined);
    }
    if (pending.length > remaining) {
      toast(`Quota atteint : ${pending.length - remaining} chapitre(s) non analysé(s) ce mois-ci.`, "info");
    }
    await refreshAll();
  }

  async function onDecide(id: string, decision: "accept" | "reject") {
    try {
      await decide.mutateAsync({ id, storyId, decision });
      await refreshAll();
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  // Les fiches et propositions sont relues au moment où une analyse se termine.
  const wasRunning = useRef(false);
  useEffect(() => {
    if (wasRunning.current && !running) {
      void utils.narrative.list.invalidate({ storyId });
      void utils.studio.proposals.invalidate({ storyId });
    }
    wasRunning.current = running;
  }, [running, storyId, utils]);

  const quota = overview.data?.quota.chapterAnalyses;
  const pendingProposals = proposals.data ?? [];

  return (
    <View>
      <SectionHeader
        title="Analyse automatique"
        eyebrow={quota ? `${quota.used}/${quota.limit} analyses ce mois-ci` : undefined}
      />
      <Card style={styles.card}>
        {overview.data?.simulation ? (
          <InlineNotice tone="warning" title="Mode simulation">
            Le fournisseur d'IA n'est pas configuré : l'analyse repère seulement les noms propres.
          </InlineNotice>
        ) : null}
        <Text variant="caption" color={theme.textMuted}>
          À la sortie de l'éditeur, Plume relit le chapitre et complète les fiches : personnages, lieux,
          relations et événements, chaque fois avec la citation du texte. Rien de ce que vous avez écrit
          n'est remplacé sans votre accord.
        </Text>
        {(overview.data?.chapters ?? []).map((chapter) => (
          <View key={chapter.id} style={styles.chapterRow}>
            <View style={styles.flex}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {chapter.title}
              </Text>
              <Text variant="caption" color={chapter.status === "failed" ? theme.danger : theme.textMuted}>
                {chapter.upToDate
                  ? `À jour · ${chapter.analyzedAt ? relativeTime(chapter.analyzedAt) : ""}`
                  : chapter.status === "done"
                    ? "Modifié depuis la dernière analyse"
                    : (STATUS_LABEL[chapter.status] ?? chapter.status)}
              </Text>
            </View>
            {chapter.status === "running" ? (
              <Ionicons name="hourglass-outline" size={18} color={theme.gold} />
            ) : chapter.upToDate ? (
              <Ionicons name="checkmark-circle" size={18} color={theme.success} />
            ) : (
              <Button label="Analyser" size="sm" variant="secondary" onPress={() => void analyze(chapter.id)} />
            )}
          </View>
        ))}
        {(overview.data?.chapters.length ?? 0) > 1 ? (
          <Button
            label="Analyser tous les chapitres modifiés"
            icon="sparkles-outline"
            size="sm"
            loading={request.isPending}
            disabled={running}
            onPress={() => void analyzeChanged()}
          />
        ) : null}
      </Card>

      {pendingProposals.length > 0 ? (
        <>
          <SectionHeader title="À valider" eyebrow={`${pendingProposals.length} proposition(s)`} />
          {pendingProposals.map((proposal) => (
            <Card key={proposal.id} style={styles.card}>
              <View style={styles.proposalHead}>
                <Badge tone="gold">{entityNames.get(proposal.entityId) ?? "Fiche"}</Badge>
                <Text variant="label" color={theme.textSecondary}>
                  {FIELD_LABEL[proposal.field] ?? proposal.field}
                </Text>
              </View>
              <Text variant="caption" color={theme.textMuted}>
                Actuellement : {proposal.currentValue}
              </Text>
              <Text variant="body">Le texte indique : {proposal.proposedValue}</Text>
              {proposal.sourceQuote ? (
                <Text variant="caption" color={theme.textMuted} style={styles.quote}>
                  « {proposal.sourceQuote} »
                </Text>
              ) : null}
              <View style={styles.actions}>
                <Button label="Garder le mien" size="sm" variant="ghost" onPress={() => void onDecide(proposal.id, "reject")} />
                <Button label="Remplacer" size="sm" icon="checkmark" onPress={() => void onDecide(proposal.id, "accept")} />
              </View>
            </Card>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  chapterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(197,164,106,0.16)",
  },
  proposalHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  quote: {
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});
