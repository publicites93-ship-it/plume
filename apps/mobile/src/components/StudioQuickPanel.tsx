import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  CHARACTER_SECTIONS,
  LOCATION_SECTIONS,
  RELATION_KINDS,
  spacing,
  type StudioSection,
} from "@plume/shared";
import { trpc } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { toast } from "@/lib/toast";
import { theme } from "@/theme";
import { Button } from "./Button";
import { InlineNotice } from "./Feedback";
import { Input } from "./Input";
import { Badge, Chip } from "./Misc";
import { Sheet } from "./Sheet";
import { Text } from "./Text";

type Tab = "characters" | "locations" | "relations" | "plots" | "notes" | "muse";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "characters", label: "Personnages" },
  { id: "locations", label: "Lieux" },
  { id: "relations", label: "Relations" },
  { id: "plots", label: "Intrigues" },
  { id: "notes", label: "Notes" },
  { id: "muse", label: "Muse" },
];
const RELATION_LABEL = Object.fromEntries(RELATION_KINDS.map((kind) => [kind.id, kind.label]));

type Row = Record<string, unknown> & { id: string; name: string; sheet: Record<string, string> };

function filledFields(row: Row, sections: StudioSection[]) {
  return sections.flatMap((section) =>
    section.fields
      .map((field) => {
        const raw = field.column ? row[field.key] : row.sheet?.[field.key];
        const value = raw === null || raw === undefined ? "" : String(raw).trim();
        return value ? { key: field.key, label: field.label, value } : null;
      })
      .filter((item): item is { key: string; label: string; value: string } => Boolean(item)),
  );
}

/**
 * Accès rapide à l'univers de l'histoire pendant l'écriture : le panneau
 * s'ouvre par-dessus l'éditeur, qui reste en place avec son texte.
 */
export function StudioQuickPanel({
  visible,
  onClose,
  storyId,
}: {
  visible: boolean;
  onClose: () => void;
  storyId: string;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const narrative = trpc.narrative.list.useQuery({ storyId }, { enabled: visible && Boolean(storyId) });
  const createIdea = trpc.narrative.createIdea.useMutation();
  const [tab, setTab] = useState<Tab>("characters");
  const [openId, setOpenId] = useState<string | null>(null);
  const [idea, setIdea] = useState("");

  const data = narrative.data;
  const characters = (data?.characters ?? []) as unknown as Row[];
  const locations = (data?.locations ?? []) as unknown as Row[];
  const names = new Map(characters.map((character) => [character.id, character.name]));

  function openFiche(id: string, type: "character" | "location") {
    onClose();
    router.push({ pathname: "/fiche/[id]", params: { id, type, storyId } });
  }

  async function addIdea() {
    if (!idea.trim()) return;
    try {
      await createIdea.mutateAsync({ storyId, content: idea.trim(), kind: "note" });
      setIdea("");
      await utils.narrative.list.invalidate({ storyId });
      toast("Note ajoutée au carnet.", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  function entityList(rows: Row[], type: "character" | "location") {
    if (rows.length === 0) {
      return (
        <Text variant="caption" color={theme.textMuted}>
          {type === "character"
            ? "Aucun personnage pour l'instant. Ils apparaîtront après l'analyse de vos chapitres, ou ajoutez-les depuis le Studio."
            : "Aucun lieu pour l'instant."}
        </Text>
      );
    }
    const sections = type === "character" ? CHARACTER_SECTIONS : LOCATION_SECTIONS;
    return rows.map((row) => {
      const open = openId === row.id;
      const fields = open ? filledFields(row, sections) : [];
      return (
        <View key={row.id} style={styles.item}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            onPress={() => setOpenId(open ? null : row.id)}
            style={styles.itemHead}
          >
            <Ionicons name={type === "character" ? "person-outline" : "location-outline"} size={16} color={theme.gold} />
            <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>
              {row.name}
            </Text>
            {row.role ? <Badge tone="bordeaux">{String(row.role)}</Badge> : null}
            <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={theme.textMuted} />
          </Pressable>
          {open ? (
            <View style={styles.details}>
              {fields.length === 0 ? (
                <Text variant="caption" color={theme.textMuted}>
                  Fiche encore vide.
                </Text>
              ) : (
                fields.map((field) => (
                  <Text key={field.key} variant="caption" color={theme.textSecondary}>
                    <Text variant="caption" color={theme.gold}>
                      {field.label} ·{" "}
                    </Text>
                    {field.value}
                  </Text>
                ))
              )}
              <Button
                label="Ouvrir la fiche"
                icon="reader-outline"
                size="sm"
                variant="secondary"
                onPress={() => openFiche(row.id, type)}
                style={styles.selfStart}
              />
            </View>
          ) : null}
        </View>
      );
    });
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Studio" subtitle="Votre univers, sans quitter le chapitre.">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((item) => (
          <Chip
            key={item.id}
            label={item.label}
            selected={tab === item.id}
            onPress={() => {
              setTab(item.id);
              setOpenId(null);
            }}
          />
        ))}
      </ScrollView>

      {narrative.isLoading ? (
        <Text variant="caption" color={theme.textMuted}>
          Chargement…
        </Text>
      ) : narrative.isError ? (
        <InlineNotice tone="danger">{errorMessage(narrative.error)}</InlineNotice>
      ) : tab === "characters" ? (
        entityList(characters, "character")
      ) : tab === "locations" ? (
        entityList(locations, "location")
      ) : tab === "relations" ? (
        (data?.relations ?? []).length === 0 ? (
          <Text variant="caption" color={theme.textMuted}>
            Aucune relation.
          </Text>
        ) : (
          (data?.relations ?? []).map((relation) => (
            <View key={relation.id} style={styles.item}>
              <Text variant="bodyStrong">
                {names.get(relation.fromCharacterId) ?? "?"} ↔ {names.get(relation.toCharacterId) ?? "?"}
              </Text>
              <Text variant="caption" color={theme.textMuted}>
                {RELATION_LABEL[relation.kind] ?? relation.kind}
                {relation.description ? ` · ${relation.description}` : ""}
              </Text>
            </View>
          ))
        )
      ) : tab === "plots" ? (
        (data?.plots ?? []).length === 0 ? (
          <Text variant="caption" color={theme.textMuted}>
            Aucune intrigue.
          </Text>
        ) : (
          (data?.plots ?? []).map((plot) => (
            <View key={plot.id} style={styles.item}>
              <View style={styles.itemHead}>
                <Text variant="bodyStrong" style={styles.flex}>
                  {plot.name}
                </Text>
                <Badge tone={plot.kind === "main" ? "bordeaux" : "muted"}>
                  {plot.kind === "main" ? "Principale" : "Secondaire"}
                </Badge>
              </View>
              {plot.stakes ? (
                <Text variant="caption" color={theme.textSecondary}>
                  Enjeu · {plot.stakes}
                </Text>
              ) : null}
            </View>
          ))
        )
      ) : tab === "notes" ? (
        <View style={styles.notes}>
          <Input
            value={idea}
            onChangeText={setIdea}
            placeholder="Une idée qui vous traverse…"
            multiline
            maxLength={4000}
            accessibilityLabel="Nouvelle note"
          />
          <Button
            label="Ajouter au carnet"
            icon="add"
            size="sm"
            disabled={!idea.trim()}
            loading={createIdea.isPending}
            onPress={() => void addIdea()}
            style={styles.selfStart}
          />
          {(data?.ideas ?? []).slice(0, 20).map((note) => (
            <View key={note.id} style={styles.item}>
              <Text variant="caption" color={theme.textSecondary}>
                {note.content}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <InlineNotice tone="info" title="Muse arrive bientôt">
          Muse proposera des pistes et des questions à partir de vos fiches pour débloquer une scène,
          jamais un texte à votre place.
        </InlineNotice>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: {
    gap: 7,
    paddingBottom: spacing[3],
  },
  item: {
    gap: 4,
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(197,164,106,0.16)",
  },
  itemHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  details: {
    gap: 5,
    paddingLeft: 24,
    paddingTop: 4,
  },
  notes: {
    gap: spacing[3],
  },
  selfStart: {
    alignSelf: "flex-start",
  },
});
