import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GENRES, PLANS, countWords, radii, spacing } from "@plume/shared";
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
  ProgressBar,
  Screen,
  SectionHeader,
  Sheet,
  StoryRowCard,
  Text,
} from "@/components";
import { queryClient, trpc } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { formatNumber } from "@/lib/format";
import { toast } from "@/lib/toast";
import { palette, theme } from "@/theme";

export default function WriteScreen() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery(undefined);
  const stories = trpc.stories.list.useQuery();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);

  const createStory = trpc.stories.create.useMutation();

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"private" | "unlisted" | "public">("private");
  const [formError, setFormError] = useState<string | null>(null);

  const plan = me.data?.plan;
  const items = stories.data ?? [];

  async function submit() {
    setFormError(null);
    if (title.trim().length < 1) {
      setFormError("Donnez un titre, même provisoire, à votre histoire.");
      return;
    }
    try {
      const story = await createStory.mutateAsync({
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        synopsis: synopsis.trim() || null,
        genre: genre ?? null,
        visibility,
        status: "draft",
        language: "fr",
        audience: "all",
      });
      await queryClient.invalidateQueries();
      setSheetOpen(false);
      setTitle("");
      setSubtitle("");
      setSynopsis("");
      setGenre(null);
      setVisibility("private");
      toast("Histoire créée. Votre manuscrit est privé par défaut.", "success");
      router.push({ pathname: "/histoire/[id]", params: { id: story.id } });
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  if (!me.data) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Préparation de la page blanche…" />
      </Screen>
    );
  }

  const planDefinition = PLANS[plan!.plan];
  const chapterRatio = plan!.chaptersPerWeekLimit
    ? plan!.chaptersThisWeek / plan!.chaptersPerWeekLimit
    : 0;

  return (
    <Screen refreshing={stories.isRefetching} onRefresh={() => void utils.stories.list.invalidate()}>
      <PageHeader
        eyebrow="Votre atelier"
        title="Écrire"
        subtitle="Un espace privé pour vos manuscrits, vos chapitres et leurs versions."
        right={
          <Button
            label="Nouvelle"
            icon="add"
            size="sm"
            onPress={() => setSheetOpen(true)}
            accessibilityHint="Créer une nouvelle histoire"
          />
        }
      />

      <Card accent style={styles.planCard}>
        <View style={styles.planHeader}>
          <View style={styles.flex}>
            <Text variant="label" color={theme.gold}>
              Formule {planDefinition.name}
            </Text>
            <Text variant="heading">
              {plan!.activeStories}/{plan!.activeStoriesLimit} histoire
              {plan!.activeStoriesLimit > 1 ? "s" : ""} active
              {plan!.activeStoriesLimit > 1 ? "s" : ""}
            </Text>
          </View>
          <Badge tone="gold">{planDefinition.priceLabel}</Badge>
        </View>
        <View style={styles.quotaRow}>
          <View style={styles.flex}>
            <View style={styles.quotaLabelRow}>
              <Text variant="caption" color={theme.textSecondary}>
                Chapitres cette semaine
              </Text>
              <Text variant="caption" color={theme.gold}>
                {plan!.chaptersThisWeek}/{plan!.chaptersPerWeekLimit}
              </Text>
            </View>
            <ProgressBar value={chapterRatio} height={4} />
          </View>
          <View style={styles.flex}>
            <View style={styles.quotaLabelRow}>
              <Text variant="caption" color={theme.textSecondary}>
                Coach IA
              </Text>
              <Text variant="caption" color={theme.gold}>
                {formatNumber(plan!.creditsRemaining)} crédits restants
              </Text>
            </View>
            <ProgressBar
              value={plan!.creditsLimit ? plan!.creditsRemaining / plan!.creditsLimit : 0}
              height={4}
            />
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Comparer les formules"
          onPress={() => setPlansOpen(true)}
          style={styles.planLink}
        >
          <Text variant="caption" color={theme.gold}>
            Comparer les formules
          </Text>
          <Ionicons name="chevron-forward" size={13} color={theme.gold} />
        </Pressable>
      </Card>

      <SectionHeader
        title="Mes manuscrits"
        eyebrow={`${items.length} projet${items.length > 1 ? "s" : ""}`}
        actionLabel={items.length ? "Nouvelle histoire" : undefined}
        onAction={() => setSheetOpen(true)}
      />

      {stories.isLoading ? (
        <LoadingState label="Classement des manuscrits…" />
      ) : stories.isError ? (
        <ErrorState message={errorMessage(stories.error)} onRetry={() => void stories.refetch()} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon="create-outline"
            title="Votre première page"
            message="Créez une histoire privée. Vous pourrez changer sa visibilité plus tard, chapitre par chapitre."
            actionLabel="Commencer une histoire"
            onAction={() => setSheetOpen(true)}
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {items.map((story) => (
            <View key={story.id} style={styles.storyWrap}>
              <StoryRowCard
                story={story}
                onPress={() =>
                  router.push({ pathname: "/histoire/[id]", params: { id: story.id } })
                }
              />
              <View style={styles.storyMeta}>
                <Badge
                  tone={story.visibility === "private" ? "muted" : story.visibility === "public" ? "success" : "info"}
                  icon={story.visibility === "private" ? "lock-closed-outline" : "globe-outline"}
                >
                  {story.visibility === "private"
                    ? "Privé"
                    : story.visibility === "public"
                      ? "Public"
                      : "Non répertorié"}
                </Badge>
                <Text variant="caption" color={theme.textMuted}>
                  {story.publishedCount} chapitre{story.publishedCount > 1 ? "s" : ""} publié
                  {story.publishedCount > 1 ? "s" : ""} · modifié le{" "}
                  {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
                    new Date(story.updatedAt),
                  )}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <SectionHeader title="La règle de la maison" eyebrow="Méthode" />
      <Card>
        <View style={styles.ruleRow}>
          <View style={styles.ruleIcon}>
            <Ionicons name="create-outline" size={22} color={theme.goldBright} />
          </View>
          <View style={styles.flex}>
            <Text variant="bodyStrong">Le coach ne tient jamais la plume</Text>
            <Text variant="caption" color={theme.textMuted}>
              Il ne réécrit pas vos phrases et n'invente pas de citations. Il nomme ce qui produit
              un effet, pose des questions et propose des exercices. Chaque diagnostic est daté et
              accompagné d'un niveau de confiance.
            </Text>
          </View>
        </View>
        <Button
          label="Voir les ateliers d'écriture"
          variant="secondary"
          size="sm"
          onPress={() => router.push("/apprendre")}
          style={styles.ruleButton}
        />
      </Card>

      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Nouvelle histoire"
        subtitle="Quelques repères suffisent. Tout pourra être modifié dans le tableau de bord."
        footer={
          <View style={styles.sheetFooter}>
            <Button label="Annuler" variant="ghost" onPress={() => setSheetOpen(false)} />
            <Button
              label="Créer le manuscrit"
              icon="create-outline"
              loading={createStory.isPending}
              onPress={submit}
              style={styles.flex}
            />
          </View>
        }
      >
        {formError ? <InlineNotice tone="danger">{formError}</InlineNotice> : null}
        <Input
          label="Titre"
          required
          value={title}
          onChangeText={setTitle}
          placeholder="Le titre de votre histoire"
          maxLength={120}
        />
        <Input
          label="Sous-titre"
          value={subtitle}
          onChangeText={setSubtitle}
          placeholder="Une précision, une promesse…"
          maxLength={160}
        />
        <Input
          label="Synopsis"
          value={synopsis}
          onChangeText={setSynopsis}
          placeholder="Quelques lignes pour vous souvenir de l'intention du récit."
          multiline
          maxLength={4000}
          hint={`${countWords(synopsis)} mots`}
        />
        <View style={styles.fieldGroup}>
          <Text variant="label" color={theme.textSecondary}>
            Genre principal
          </Text>
          <View style={styles.chips}>
            {GENRES.map((item) => (
              <Chip
                key={item}
                label={item}
                selected={genre === item}
                onPress={() => setGenre(genre === item ? null : item)}
              />
            ))}
          </View>
        </View>
        <View style={styles.fieldGroup}>
          <Text variant="label" color={theme.textSecondary}>
            Visibilité initiale
          </Text>
          <View style={styles.visibilityRow}>
            {(
              [
                ["private", "Privé", "Vous seul"],
                ["unlisted", "Non répertorié", "Lien seulement"],
                ["public", "Public", "Catalogue"],
              ] as const
            ).map(([value, label, hint]) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected: visibility === value }}
                accessibilityLabel={label}
                onPress={() => setVisibility(value)}
                style={[styles.visibility, visibility === value && styles.visibilitySelected]}
              >
                <Text
                  variant="caption"
                  color={visibility === value ? theme.goldBright : theme.textSecondary}
                >
                  {label}
                </Text>
                <Text variant="caption" color={theme.textMuted} style={styles.visibilityHint}>
                  {hint}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <InlineNotice tone="info">
          Par défaut, votre histoire est privée : elle n'apparaît ni dans la recherche ni dans le
          catalogue, et aucun chapitre ne peut être publié avant un changement explicite de
          visibilité.
        </InlineNotice>
      </Sheet>

      <Sheet
        visible={plansOpen}
        onClose={() => setPlansOpen(false)}
        title="Formules Plume"
        subtitle="Les limites sont appliquées côté serveur. Chaque formule précise ses crédits coach et ses fonctions d'écriture."
      >
        {Object.values(PLANS).map((definition) => (
          <Card
            key={definition.id}
            accent={definition.id === plan!.plan}
            style={styles.planOption}
          >
            <View style={styles.planOptionHeader}>
              <View style={styles.flex}>
                <Text variant="heading">{definition.name}</Text>
                <Text variant="caption" color={theme.gold}>
                  {definition.priceLabel}
                </Text>
              </View>
              {definition.id === plan!.plan ? <Badge tone="gold">Actuelle</Badge> : null}
            </View>
            <View style={styles.featureList}>
              {definition.features.map((feature) => (
                <View key={feature} style={styles.featureRow}>
                  <Ionicons name="checkmark" size={14} color={theme.gold} />
                  <Text variant="caption" color={theme.textSecondary} style={styles.flex}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        ))}
        <InlineNotice tone="warning">
          Le paiement et la facturation ne sont pas branchés. Cette page présente les enveloppes
          prévues ; elle ne permet aucun achat.
        </InlineNotice>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  planCard: {
    gap: spacing[3],
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  quotaRow: {
    flexDirection: "row",
    gap: spacing[4],
  },
  quotaLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 5,
  },
  planLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: 32,
    alignSelf: "flex-start",
  },
  list: {
    gap: spacing[4],
  },
  storyWrap: {
    gap: 8,
  },
  storyMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    flexWrap: "wrap",
  },
  ruleRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  ruleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.3)",
    backgroundColor: "rgba(197,164,106,0.06)",
  },
  ruleButton: {
    marginTop: spacing[4],
  },
  sheetFooter: {
    flexDirection: "row",
    gap: spacing[3],
  },
  fieldGroup: {
    gap: 8,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  visibilityRow: {
    flexDirection: "row",
    gap: 7,
  },
  visibility: {
    flex: 1,
    gap: 2,
    padding: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.2)",
    backgroundColor: "rgba(11,17,28,0.4)",
    minHeight: 62,
    justifyContent: "center",
  },
  visibilitySelected: {
    borderColor: "rgba(197,164,106,0.75)",
    backgroundColor: "rgba(197,164,106,0.08)",
  },
  visibilityHint: {
    fontSize: 10,
  },
  planOption: {
    gap: spacing[3],
  },
  planOptionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  featureList: {
    gap: 6,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
});
