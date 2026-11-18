import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { EVENT_CERTAINTY, PLOT_KINDS, RELATION_KINDS, spacing } from "@plume/shared";
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
  Sheet,
  StudioAnalysis,
  Text,
} from "@/components";
import { trpc } from "@/lib/api";
import { errorDetails, errorMessage } from "@/lib/errors";
import { studioMediaSource } from "@/lib/covers";
import { relativeTime } from "@/lib/format";
import { toast } from "@/lib/toast";
import { theme } from "@/theme";

type SectionKey = "characters" | "locations" | "relations" | "plots" | "events" | "ideas";

const SECTION_OPTIONS: Array<{ value: SectionKey; label: string }> = [
  { value: "characters", label: "Personnages" },
  { value: "locations", label: "Lieux" },
  { value: "relations", label: "Relations" },
  { value: "plots", label: "Intrigues" },
  { value: "events", label: "Chronologie" },
  { value: "ideas", label: "Carnet" },
];

const RELATION_LABEL: Record<string, string> = Object.fromEntries(RELATION_KINDS.map((k) => [k.id, k.label]));
const PLOT_KIND_LABEL: Record<string, string> = Object.fromEntries(PLOT_KINDS.map((k) => [k.id, k.label]));
const CERTAINTY_LABEL: Record<string, string> = Object.fromEntries(EVENT_CERTAINTY.map((k) => [k.id, k.label]));

const PLOT_STATUS: Record<string, string> = {
  planned: "Prévue",
  active: "Active",
  resolved: "Résolue",
  abandoned: "Abandonnée",
};

const IDEA_KIND: Record<string, string> = {
  scene: "Scène",
  dialogue: "Dialogue",
  character: "Personnage",
  revelation: "Révélation",
  research: "Recherche",
  note: "Note",
};

const EMPTY_FIELDS: Record<SectionKey, Record<string, string>> = {
  characters: {
    name: "",
    role: "",
    summary: "",
    motivation: "",
    fear: "",
    secret: "",
    arc: "",
    notes: "",
  },
  locations: { name: "", description: "", atmosphere: "", history: "", notes: "" },
  relations: { fromCharacterId: "", toCharacterId: "", kind: "friend", description: "" },
  plots: { name: "", description: "", stakes: "", status: "planned", resolution: "", kind: "secondary" },
  events: {
    title: "",
    description: "",
    fictionalDate: "",
    narrativeOrder: "0",
    consequences: "",
    certainty: "confirmed",
  },
  ideas: { content: "", kind: "note" },
};

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function fieldsFor(section: SectionKey, item: unknown): Record<string, string> {
  if (!item) return { ...EMPTY_FIELDS[section] };
  const row = item as Record<string, unknown>;
  if (section === "characters") {
    return {
      name: text(row.name),
      role: text(row.role),
      summary: text(row.summary),
      motivation: text(row.motivation),
      fear: text(row.fear),
      secret: text(row.secret),
      arc: text(row.arc),
      notes: text(row.notes),
    };
  }
  if (section === "locations") {
    return {
      name: text(row.name),
      description: text(row.description),
      atmosphere: text(row.atmosphere),
      history: text(row.history),
      notes: text(row.notes),
    };
  }
  if (section === "plots") {
    return {
      name: text(row.name),
      description: text(row.description),
      stakes: text(row.stakes),
      status: text(row.status) || "planned",
      resolution: text(row.resolution),
      kind: text(row.kind) || "secondary",
    };
  }
  if (section === "relations") {
    return {
      fromCharacterId: text(row.fromCharacterId),
      toCharacterId: text(row.toCharacterId),
      kind: text(row.kind) || "friend",
      description: text(row.description),
    };
  }
  if (section === "events") {
    return {
      title: text(row.title),
      description: text(row.description),
      fictionalDate: text(row.fictionalDate),
      narrativeOrder: text(row.narrativeOrder) || "0",
      consequences: text(row.consequences),
      certainty: text(row.certainty) || "confirmed",
    };
  }
  return { content: text(row.content), kind: text(row.kind) || "note" };
}

export default function StoryBibleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const storyId = String(id ?? "");
  const router = useRouter();
  const utils = trpc.useUtils();

  const dashboard = trpc.stories.dashboard.useQuery({ storyId }, { enabled: Boolean(storyId) });
  const narrative = trpc.narrative.list.useQuery({ storyId }, { enabled: Boolean(storyId) });

  const [section, setSection] = useState<SectionKey>("characters");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({ ...EMPTY_FIELDS.characters });
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    section: SectionKey;
    id: string;
    label: string;
  } | null>(null);

  const createCharacter = trpc.narrative.createCharacter.useMutation();
  const updateCharacter = trpc.narrative.updateCharacter.useMutation();
  const deleteCharacter = trpc.narrative.deleteCharacter.useMutation();
  const createLocation = trpc.narrative.createLocation.useMutation();
  const updateLocation = trpc.narrative.updateLocation.useMutation();
  const deleteLocation = trpc.narrative.deleteLocation.useMutation();
  const createPlot = trpc.narrative.createPlot.useMutation();
  const updatePlot = trpc.narrative.updatePlot.useMutation();
  const deletePlot = trpc.narrative.deletePlot.useMutation();
  const createEvent = trpc.narrative.createEvent.useMutation();
  const updateEvent = trpc.narrative.updateEvent.useMutation();
  const deleteEvent = trpc.narrative.deleteEvent.useMutation();
  const createIdea = trpc.narrative.createIdea.useMutation();
  const updateIdea = trpc.narrative.updateIdea.useMutation();
  const deleteIdea = trpc.narrative.deleteIdea.useMutation();
  const createRelation = trpc.narrative.createRelation.useMutation();
  const updateRelation = trpc.narrative.updateRelation.useMutation();
  const deleteRelation = trpc.narrative.deleteRelation.useMutation();

  const saving =
    createCharacter.isPending ||
    updateCharacter.isPending ||
    createLocation.isPending ||
    updateLocation.isPending ||
    createPlot.isPending ||
    updatePlot.isPending ||
    createEvent.isPending ||
    updateEvent.isPending ||
    createIdea.isPending ||
    updateIdea.isPending ||
    createRelation.isPending ||
    updateRelation.isPending;

  const data = narrative.data;
  const counts = dashboard.data?.bible;

  const items = useMemo(() => {
    if (!data) return [];
    if (section === "characters") return data.characters;
    if (section === "locations") return data.locations;
    if (section === "plots") return data.plots;
    if (section === "events") return data.events;
    if (section === "relations") return data.relations;
    return data.ideas;
  }, [data, section]);

  function setField(key: string, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setEditingId(null);
    setFields({ ...EMPTY_FIELDS[section] });
    setFormError(null);
    setSheetOpen(true);
  }

  function openEdit(item: unknown) {
    const row = item as { id: string };
    setEditingId(row.id);
    setFields(fieldsFor(section, item));
    setFormError(null);
    setSheetOpen(true);
  }

  async function refresh() {
    await Promise.all([
      utils.narrative.list.invalidate({ storyId }),
      utils.stories.dashboard.invalidate({ storyId }),
    ]);
  }

  async function save() {
    setFormError(null);
    if (section === "relations") {
      if (!fields.fromCharacterId || !fields.toCharacterId) {
        setFormError("Choisissez les deux personnages reliés.");
        return;
      }
      if (fields.fromCharacterId === fields.toCharacterId) {
        setFormError("Une relation relie deux personnages différents.");
        return;
      }
    }
    const required =
      section === "relations"
        ? "ok"
        : section === "events"
          ? fields.title
          : section === "ideas"
            ? fields.content
            : fields.name;
    if (!required?.trim()) {
      setFormError(
        section === "ideas"
          ? "Écrivez l'idée avant de l'enregistrer."
          : "Le nom ou le titre ne peut pas être vide.",
      );
      return;
    }
    try {
      if (section === "characters") {
        const payload = {
          name: fields.name?.trim() ?? "",
          role: nullable(fields.role ?? ""),
          summary: nullable(fields.summary ?? ""),
          motivation: nullable(fields.motivation ?? ""),
          fear: nullable(fields.fear ?? ""),
          secret: nullable(fields.secret ?? ""),
          arc: nullable(fields.arc ?? ""),
          notes: nullable(fields.notes ?? ""),
        };
        if (editingId) {
          await updateCharacter.mutateAsync({ id: editingId, storyId, ...payload });
        } else {
          await createCharacter.mutateAsync({ storyId, ...payload });
        }
      } else if (section === "locations") {
        const payload = {
          name: fields.name?.trim() ?? "",
          description: nullable(fields.description ?? ""),
          atmosphere: nullable(fields.atmosphere ?? ""),
          history: nullable(fields.history ?? ""),
          notes: nullable(fields.notes ?? ""),
        };
        if (editingId) {
          await updateLocation.mutateAsync({ id: editingId, storyId, ...payload });
        } else {
          await createLocation.mutateAsync({ storyId, ...payload });
        }
      } else if (section === "plots") {
        const payload = {
          name: fields.name?.trim() ?? "",
          description: nullable(fields.description ?? ""),
          stakes: nullable(fields.stakes ?? ""),
          status: (fields.status || "planned") as
            | "planned"
            | "active"
            | "resolved"
            | "abandoned",
          resolution: nullable(fields.resolution ?? ""),
          kind: (fields.kind || "secondary") as "main" | "secondary",
        };
        if (editingId) {
          await updatePlot.mutateAsync({ id: editingId, storyId, ...payload });
        } else {
          await createPlot.mutateAsync({ storyId, ...payload });
        }
      } else if (section === "events") {
        const payload = {
          title: fields.title?.trim() ?? "",
          description: nullable(fields.description ?? ""),
          fictionalDate: nullable(fields.fictionalDate ?? ""),
          narrativeOrder: Number.parseInt(fields.narrativeOrder || "0", 10) || 0,
          consequences: nullable(fields.consequences ?? ""),
          certainty: (fields.certainty || "confirmed") as "confirmed" | "hypothesis" | "idea",
        };
        if (editingId) {
          await updateEvent.mutateAsync({ id: editingId, storyId, ...payload });
        } else {
          await createEvent.mutateAsync({ storyId, ...payload });
        }
      } else if (section === "relations") {
        const kind = (fields.kind || "friend") as (typeof RELATION_KINDS)[number]["id"];
        const description = nullable(fields.description ?? "");
        if (editingId) {
          await updateRelation.mutateAsync({ id: editingId, storyId, kind, description });
        } else {
          await createRelation.mutateAsync({
            storyId,
            fromCharacterId: fields.fromCharacterId!,
            toCharacterId: fields.toCharacterId!,
            kind,
            description,
          });
        }
      } else {
        const payload = {
          content: fields.content?.trim() ?? "",
          kind: (fields.kind || "note") as
            | "scene"
            | "dialogue"
            | "character"
            | "revelation"
            | "research"
            | "note",
        };
        if (editingId) {
          await updateIdea.mutateAsync({ id: editingId, storyId, ...payload });
        } else {
          await createIdea.mutateAsync({ storyId, ...payload });
        }
      }
      await refresh();
      setSheetOpen(false);
      toast("Studio mis à jour.", "success");
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.section === "characters") {
        await deleteCharacter.mutateAsync({ id: deleteTarget.id, storyId });
      } else if (deleteTarget.section === "locations") {
        await deleteLocation.mutateAsync({ id: deleteTarget.id, storyId });
      } else if (deleteTarget.section === "plots") {
        await deletePlot.mutateAsync({ id: deleteTarget.id, storyId });
      } else if (deleteTarget.section === "events") {
        await deleteEvent.mutateAsync({ id: deleteTarget.id, storyId });
      } else if (deleteTarget.section === "relations") {
        await deleteRelation.mutateAsync({ id: deleteTarget.id, storyId });
      } else if (deleteTarget.section === "ideas") {
        await deleteIdea.mutateAsync({ id: deleteTarget.id, storyId });
      }
      await refresh();
      setDeleteTarget(null);
      toast("Élément retiré du studio.", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  if (dashboard.isLoading || narrative.isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Ouverture du studio…" />
      </Screen>
    );
  }

  if (narrative.isError && errorDetails(narrative.error)?.code === "STUDIO_PROFILE_REQUIRED") {
    return (
      <Screen>
        <PageHeader back eyebrow="Studio d'écriture" title="Réservé aux auteurs" />
        <InlineNotice tone="info" title="Votre profil est « Lire »">
          Le Studio d'écriture est réservé aux profils « Écrire » et « Écrire et lire ». Vous pouvez
          changer de profil à tout moment dans les réglages ; vos lectures ne sont pas touchées.
        </InlineNotice>
        <Button
          label="Changer de profil"
          icon="settings-outline"
          onPress={() => router.push("/reglages")}
          style={styles.backButton}
        />
      </Screen>
    );
  }

  if (dashboard.isError || narrative.isError || !dashboard.data || !data) {
    return (
      <Screen>
        <PageHeader back title="Studio d'écriture" />
        <ErrorState
          message={errorMessage(dashboard.error ?? narrative.error)}
          onRetry={() => {
            void dashboard.refetch();
            void narrative.refetch();
          }}
        />
      </Screen>
    );
  }

  const story = dashboard.data.story;
  const totalItems =
    (counts?.characters ?? 0) +
    (counts?.locations ?? 0) +
    (counts?.plots ?? 0) +
    (counts?.events ?? 0) +
    (counts?.ideas ?? 0);

  return (
    <Screen
      refreshing={narrative.isRefetching}
      onRefresh={() => {
        void narrative.refetch();
        void dashboard.refetch();
      }}
    >
      <PageHeader
        back
        eyebrow="Studio d'écriture"
        title={story.title}
        subtitle="Personnages, lieux, relations, intrigues, chronologie et carnet : la mémoire privée de votre manuscrit."
        right={<Button label="Ajouter" icon="add" size="sm" onPress={openCreate} />}
      />

      <Card accent style={styles.intro}>
        <View style={styles.introRow}>
          <Ionicons name="git-branch-outline" size={22} color={theme.goldBright} />
          <Text variant="caption" color={theme.textSecondary} style={styles.flex}>
            {totalItems === 0
              ? "La bible est encore vide. Notez ce que vous savez déjà : un nom, un lieu, une promesse narrative."
              : `${totalItems} élément${totalItems > 1 ? "s" : ""} consigné${totalItems > 1 ? "s" : ""}. Cette mémoire reste privée et n'est jamais publiée avec les chapitres.`}
          </Text>
        </View>
        <Text variant="caption" color={theme.textMuted}>
          Tout reste privé, même quand l'histoire est publiée. Vous gardez la main sur chaque
          information : rien n'est modifié sans vous.
        </Text>
      </Card>

      <StudioAnalysis
        storyId={storyId}
        entityNames={
          new Map<string, string>([
            ...data.characters.map((item) => [item.id, item.name] as [string, string]),
            ...data.locations.map((item) => [item.id, item.name] as [string, string]),
          ])
        }
      />

      <Card style={styles.museCard}>
        <View style={styles.introRow}>
          <Ionicons name="sparkles-outline" size={20} color={theme.goldBright} />
          <View style={styles.flex}>
            <Text variant="bodyStrong">Muse</Text>
            <Text variant="caption" color={theme.textMuted}>
              Bientôt : des pistes et des questions pour débloquer une scène, à partir de vos fiches.
              Muse proposera des idées, jamais un texte à votre place.
            </Text>
          </View>
        </View>
      </Card>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectionTabs}
        style={styles.segmentedWrap}
      >
        {SECTION_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={section === option.value}
            onPress={() => {
              setSection(option.value);
              setEditingId(null);
            }}
          />
        ))}
      </ScrollView>

      <SectionHeader
        title={SECTION_OPTIONS.find((option) => option.value === section)?.label ?? "Bible"}
        eyebrow={`${items.length} entrée${items.length > 1 ? "s" : ""}`}
        actionLabel="Nouvelle entrée"
        onAction={openCreate}
      />

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon="book-outline"
            title="Rien ici pour l'instant"
            message={
              section === "characters"
                ? "Un personnage peut commencer par un désir et une peur. Le reste viendra en écrivant."
                : section === "locations"
                  ? "Décrivez un lieu par ce qu'il fait ressentir et par le détail que votre personnage remarquerait."
                  : section === "relations"
                    ? (data.characters.length < 2
                        ? "Ajoutez au moins deux personnages pour les relier."
                        : "Une relation dit ce qui lie deux personnages : famille, amitié, rivalité…")
                  : section === "plots"
                    ? "Une intrigue se définit par ce qui peut être perdu et par la décision qu'elle exige."
                    : section === "events"
                      ? "La chronologie garde la mémoire des causes : ce qui arrive, quand, et ce que cela change."
                      : "Une idée notée aujourd'hui peut devenir un motif, un indice ou une scène entière."
            }
            actionLabel="Ajouter une entrée"
            onAction={openCreate}
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {items.map((item) => {
            const row = item as Record<string, unknown>;
            const idValue = text(row.id);
            const characterName = (characterId: unknown) =>
              data.characters.find((character) => character.id === characterId)?.name ?? "Personnage";
            const titleValue =
              section === "relations"
                ? `${characterName(row.fromCharacterId)} ↔ ${characterName(row.toCharacterId)}`
                : section === "events"
                  ? text(row.title)
                  : section === "ideas"
                    ? text(row.content)
                    : text(row.name);
            const entityType = section === "characters" ? "character" : section === "locations" ? "location" : null;
            const portrait = entityType
              ? data.media.find((media) => media.entityType === entityType && media.entityId === idValue)
              : undefined;
            return (
              <Card key={idValue} style={styles.itemCard}>
                <View style={styles.itemTop}>
                  {entityType ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Ouvrir la fiche de ${titleValue}`}
                      onPress={() =>
                        router.push({
                          pathname: "/fiche/[id]",
                          params: { id: idValue, type: entityType, storyId },
                        })
                      }
                    >
                      {portrait ? (
                        <Image source={studioMediaSource(portrait.id)} style={styles.thumb} />
                      ) : (
                        <View style={[styles.thumb, styles.thumbEmpty]}>
                          <Ionicons
                            name={entityType === "character" ? "person-outline" : "location-outline"}
                            size={20}
                            color={theme.gold}
                          />
                        </View>
                      )}
                    </Pressable>
                  ) : null}
                  <View style={styles.flex}>
                    <Text variant="bodyStrong" numberOfLines={3}>
                      {titleValue}
                    </Text>
                    <Text variant="caption" color={theme.textMuted}>
                      Modifié {relativeTime(row.updatedAt as string | Date)}
                    </Text>
                  </View>
                  <View style={styles.itemBadges}>
                    {section === "characters" && row.role ? (
                      <Badge tone="bordeaux">{text(row.role)}</Badge>
                    ) : null}
                    {section === "relations" ? (
                      <Badge tone="bordeaux">{RELATION_LABEL[text(row.kind)] ?? text(row.kind)}</Badge>
                    ) : null}
                    {row.origin === "ai" || row.origin === "extracted" ? (
                      <Badge tone="info" icon="sparkles-outline">
                        Repéré par l'IA
                      </Badge>
                    ) : null}
                    {section === "plots" ? (
                      <Badge tone={row.kind === "main" ? "bordeaux" : "muted"}>
                        {row.kind === "main" ? "Principale" : "Secondaire"}
                      </Badge>
                    ) : null}
                    {section === "events" ? (
                      <Badge tone={row.certainty === "confirmed" ? "success" : "muted"}>
                        {CERTAINTY_LABEL[text(row.certainty)] ?? "Confirmé"}
                      </Badge>
                    ) : null}
                    {section === "plots" ? (
                      <Badge tone={row.status === "resolved" ? "success" : "gold"}>
                        {PLOT_STATUS[text(row.status)] ?? text(row.status)}
                      </Badge>
                    ) : null}
                    {section === "events" ? (
                      <Badge tone="info">
                        {row.fictionalDate ? text(row.fictionalDate) : `ordre ${text(row.narrativeOrder)}`}
                      </Badge>
                    ) : null}
                    {section === "ideas" ? (
                      <Badge tone="bordeaux">{IDEA_KIND[text(row.kind)] ?? text(row.kind)}</Badge>
                    ) : null}
                  </View>
                </View>

                {section === "characters" ? (
                  <View style={styles.detailList}>
                    {row.summary ? (
                      <Text variant="caption" color={theme.textSecondary}>
                        {text(row.summary)}
                      </Text>
                    ) : null}
                    {row.motivation ? (
                      <Text variant="caption" color={theme.textMuted}>
                        <Text variant="caption" color={theme.gold}>Désir · </Text>
                        {text(row.motivation)}
                      </Text>
                    ) : null}
                    {row.fear ? (
                      <Text variant="caption" color={theme.textMuted}>
                        <Text variant="caption" color={theme.gold}>Peur · </Text>
                        {text(row.fear)}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {section === "locations" ? (
                  <View style={styles.detailList}>
                    {row.description ? (
                      <Text variant="caption" color={theme.textSecondary}>
                        {text(row.description)}
                      </Text>
                    ) : null}
                    {row.atmosphere ? (
                      <Text variant="caption" color={theme.textMuted}>
                        <Text variant="caption" color={theme.gold}>Atmosphère · </Text>
                        {text(row.atmosphere)}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {section === "plots" ? (
                  <View style={styles.detailList}>
                    {row.description ? (
                      <Text variant="caption" color={theme.textSecondary}>
                        {text(row.description)}
                      </Text>
                    ) : null}
                    {row.stakes ? (
                      <Text variant="caption" color={theme.textMuted}>
                        <Text variant="caption" color={theme.gold}>Enjeu · </Text>
                        {text(row.stakes)}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {section === "events" ? (
                  <View style={styles.detailList}>
                    {row.description ? (
                      <Text variant="caption" color={theme.textSecondary}>
                        {text(row.description)}
                      </Text>
                    ) : null}
                    {row.consequences ? (
                      <Text variant="caption" color={theme.textMuted}>
                        <Text variant="caption" color={theme.gold}>Conséquences · </Text>
                        {text(row.consequences)}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {section === "relations" && row.description ? (
                  <Text variant="caption" color={theme.textSecondary}>
                    {text(row.description)}
                  </Text>
                ) : null}

                {(section === "relations" || section === "events") && row.sourceQuote ? (
                  <Text variant="caption" color={theme.textMuted} style={styles.sourceQuote}>
                    « {text(row.sourceQuote)} »
                  </Text>
                ) : null}

                {section === "ideas" ? (
                  <Text variant="caption" color={theme.textMuted}>
                    Note privée · {relativeTime(row.createdAt as string | Date)}
                  </Text>
                ) : null}

                <View style={styles.itemActions}>
                  {entityType ? (
                    <Button
                      label="Fiche complète"
                      icon="reader-outline"
                      size="sm"
                      onPress={() =>
                        router.push({
                          pathname: "/fiche/[id]",
                          params: { id: idValue, type: entityType, storyId },
                        })
                      }
                    />
                  ) : null}
                  <Button
                    label={entityType ? "Rapide" : "Modifier"}
                    icon="pencil-outline"
                    size="sm"
                    variant="secondary"
                    onPress={() => openEdit(item)}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Supprimer"
                    onPress={() => setDeleteTarget({ section, id: idValue, label: titleValue })}
                    style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.65 }]}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.danger} />
                    <Text variant="caption" color={theme.danger}>
                      Supprimer
                    </Text>
                  </Pressable>
                </View>
              </Card>
            );
          })}
        </View>
      )}

      <InlineNotice tone="info" title="Une mémoire, pas un carcan">
        La bible sert à retrouver vos décisions. Elle n'impose pas de remplir chaque champ : une
        fiche peut rester volontairement incomplète.
      </InlineNotice>

      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingId ? "Modifier l'entrée" : "Nouvelle entrée"}
        subtitle={`${SECTION_OPTIONS.find((option) => option.value === section)?.label ?? "Bible"} · ${story.title}`}
        footer={
          <Button
            label="Enregistrer"
            icon="checkmark"
            loading={saving}
            onPress={save}
            fullWidth
          />
        }
      >
        {formError ? <InlineNotice tone="danger">{formError}</InlineNotice> : null}

        {section === "characters" ? (
          <>
            <Input label="Nom" required value={fields.name ?? ""} onChangeText={(v) => setField("name", v)} maxLength={120} />
            <Input label="Rôle" value={fields.role ?? ""} onChangeText={(v) => setField("role", v)} maxLength={120} placeholder="Protagoniste, témoin, antagoniste…" />
            <Input label="Résumé" value={fields.summary ?? ""} onChangeText={(v) => setField("summary", v)} multiline maxLength={4000} />
            <Input label="Désir principal" value={fields.motivation ?? ""} onChangeText={(v) => setField("motivation", v)} multiline maxLength={2000} />
            <Input label="Peur" value={fields.fear ?? ""} onChangeText={(v) => setField("fear", v)} multiline maxLength={2000} />
            <Input label="Secret" value={fields.secret ?? ""} onChangeText={(v) => setField("secret", v)} multiline maxLength={2000} />
            <Input label="Arc" value={fields.arc ?? ""} onChangeText={(v) => setField("arc", v)} multiline maxLength={2000} />
            <Input label="Notes" value={fields.notes ?? ""} onChangeText={(v) => setField("notes", v)} multiline maxLength={8000} />
          </>
        ) : null}

        {section === "locations" ? (
          <>
            <Input label="Nom" required value={fields.name ?? ""} onChangeText={(v) => setField("name", v)} maxLength={120} />
            <Input label="Description" value={fields.description ?? ""} onChangeText={(v) => setField("description", v)} multiline maxLength={8000} />
            <Input label="Atmosphère" value={fields.atmosphere ?? ""} onChangeText={(v) => setField("atmosphere", v)} multiline maxLength={2000} />
            <Input label="Histoire du lieu" value={fields.history ?? ""} onChangeText={(v) => setField("history", v)} multiline maxLength={4000} />
            <Input label="Notes" value={fields.notes ?? ""} onChangeText={(v) => setField("notes", v)} multiline maxLength={4000} />
          </>
        ) : null}

        {section === "plots" ? (
          <>
            <Input label="Nom de l'intrigue" required value={fields.name ?? ""} onChangeText={(v) => setField("name", v)} maxLength={160} />
            <Input label="Description" value={fields.description ?? ""} onChangeText={(v) => setField("description", v)} multiline maxLength={8000} />
            <Input label="Enjeu" value={fields.stakes ?? ""} onChangeText={(v) => setField("stakes", v)} multiline maxLength={2000} />
            <View style={styles.fieldGroup}>
              <Text variant="label" color={theme.textSecondary}>
                État
              </Text>
              <View style={styles.chips}>
                {Object.entries(PLOT_STATUS).map(([value, label]) => (
                  <Chip
                    key={value}
                    label={label}
                    selected={(fields.status || "planned") === value}
                    onPress={() => setField("status", value)}
                  />
                ))}
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text variant="label" color={theme.textSecondary}>
                Type
              </Text>
              <View style={styles.chips}>
                {PLOT_KINDS.map((kind) => (
                  <Chip
                    key={kind.id}
                    label={PLOT_KIND_LABEL[kind.id] ?? kind.label}
                    selected={(fields.kind || "secondary") === kind.id}
                    onPress={() => setField("kind", kind.id)}
                  />
                ))}
              </View>
            </View>
            <Input label="Résolution" value={fields.resolution ?? ""} onChangeText={(v) => setField("resolution", v)} multiline maxLength={2000} />
          </>
        ) : null}

        {section === "events" ? (
          <>
            <Input label="Titre de l'événement" required value={fields.title ?? ""} onChangeText={(v) => setField("title", v)} maxLength={160} />
            <Input label="Description" value={fields.description ?? ""} onChangeText={(v) => setField("description", v)} multiline maxLength={4000} />
            <Input label="Date fictive" value={fields.fictionalDate ?? ""} onChangeText={(v) => setField("fictionalDate", v)} maxLength={80} placeholder="Troisième lune, hiver 1842…" />
            <Input label="Ordre narratif" value={fields.narrativeOrder ?? "0"} onChangeText={(v) => setField("narrativeOrder", v)} keyboardType="number-pad" hint="Un nombre plus petit apparaît plus tôt dans la chronologie." />
            <Input label="Conséquences" value={fields.consequences ?? ""} onChangeText={(v) => setField("consequences", v)} multiline maxLength={2000} />
            <View style={styles.fieldGroup}>
              <Text variant="label" color={theme.textSecondary}>
                Certitude
              </Text>
              <View style={styles.chips}>
                {EVENT_CERTAINTY.map((item) => (
                  <Chip
                    key={item.id}
                    label={item.label}
                    selected={(fields.certainty || "confirmed") === item.id}
                    onPress={() => setField("certainty", item.id)}
                  />
                ))}
              </View>
            </View>
          </>
        ) : null}

        {section === "relations" ? (
          <>
            {(["fromCharacterId", "toCharacterId"] as const).map((key, index) => (
              <View key={key} style={styles.fieldGroup}>
                <Text variant="label" color={theme.textSecondary}>
                  {index === 0 ? "Premier personnage" : "Second personnage"}
                </Text>
                <View style={styles.chips}>
                  {data.characters.map((character) => (
                    <Chip
                      key={character.id}
                      label={character.name}
                      selected={fields[key] === character.id}
                      onPress={() => (editingId ? undefined : setField(key, character.id))}
                    />
                  ))}
                </View>
              </View>
            ))}
            <View style={styles.fieldGroup}>
              <Text variant="label" color={theme.textSecondary}>
                Nature du lien
              </Text>
              <View style={styles.chips}>
                {RELATION_KINDS.map((kind) => (
                  <Chip
                    key={kind.id}
                    label={kind.label}
                    selected={(fields.kind || "friend") === kind.id}
                    onPress={() => setField("kind", kind.id)}
                  />
                ))}
              </View>
            </View>
            <Input
              label="Description"
              value={fields.description ?? ""}
              onChangeText={(v) => setField("description", v)}
              multiline
              maxLength={2000}
              placeholder="Ce qui les unit, ce qui les oppose…"
            />
          </>
        ) : null}

        {section === "ideas" ? (
          <>
            <Input label="Idée" required value={fields.content ?? ""} onChangeText={(v) => setField("content", v)} multiline maxLength={4000} />
            <View style={styles.fieldGroup}>
              <Text variant="label" color={theme.textSecondary}>
                Type
              </Text>
              <View style={styles.chips}>
                {Object.entries(IDEA_KIND).map(([value, label]) => (
                  <Chip
                    key={value}
                    label={label}
                    selected={(fields.kind || "note") === value}
                    onPress={() => setField("kind", value)}
                  />
                ))}
              </View>
            </View>
            <InlineNotice tone="info">
              Une idée reste une note privée. Elle peut être modifiée sans toucher aux chapitres.
            </InlineNotice>
          </>
        ) : null}
      </Sheet>

      <Sheet
        visible={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer cette entrée ?"
        subtitle={deleteTarget?.label}
        footer={
          <View style={styles.sheetActions}>
            <Button label="Annuler" variant="ghost" onPress={() => setDeleteTarget(null)} />
            <Button label="Supprimer" icon="trash-outline" variant="danger" onPress={confirmDelete} style={styles.flex} />
          </View>
        }
      >
        <InlineNotice tone="danger">
          L'entrée sera retirée du studio. Les chapitres déjà écrits ne sont pas modifiés.
        </InlineNotice>
      </Sheet>

      <Button
        label="Retour au manuscrit"
        variant="ghost"
        size="sm"
        onPress={() => router.push({ pathname: "/histoire/[id]", params: { id: storyId } })}
        style={styles.backButton}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intro: {
    gap: spacing[3],
  },
  introRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },
  segmentedWrap: {
    marginTop: spacing[5],
    flexGrow: 0,
  },
  sectionTabs: {
    gap: 7,
    paddingRight: spacing[4],
  },
  sourceQuote: {
    fontStyle: "italic",
  },
  museCard: {
    marginTop: spacing[3],
  },
  thumb: {
    width: 48,
    height: 64,
    borderRadius: 8,
  },
  thumbEmpty: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.3)",
  },
  list: {
    gap: spacing[3],
  },
  itemCard: {
    gap: spacing[3],
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  itemBadges: {
    alignItems: "flex-end",
    gap: 5,
    maxWidth: "42%",
  },
  detailList: {
    gap: 5,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(197,164,106,0.16)",
    paddingTop: spacing[3],
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 36,
  },
  fieldGroup: {
    gap: 8,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  sheetActions: {
    flexDirection: "row",
    gap: spacing[3],
  },
  backButton: {
    marginTop: spacing[5],
    alignSelf: "flex-start",
  },
});
