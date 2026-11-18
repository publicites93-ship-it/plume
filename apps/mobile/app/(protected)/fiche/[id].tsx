import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  CHARACTER_SECTIONS,
  LOCATION_SECTIONS,
  RELATION_KINDS,
  STUDIO_MEDIA_MAX_PER_ENTITY,
  spacing,
  type StudioSection,
} from "@plume/shared";
import {
  Badge,
  Button,
  Card,
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
import { pickStudioImage, studioMediaSource } from "@/lib/covers";
import { errorMessage } from "@/lib/errors";
import { toast } from "@/lib/toast";
import { theme } from "@/theme";

type EntityType = "character" | "location";
type Row = Record<string, unknown> & {
  id: string;
  name: string;
  sheet?: Record<string, string>;
  sources?: Record<string, { origin: string; chapterTitle?: string; quote?: string }>;
};

const KIND_LABEL = Object.fromEntries(RELATION_KINDS.map((kind) => [kind.id, kind.label]));

function valueOf(row: Row, key: string, column?: boolean): string {
  const raw = column ? row[key] : row.sheet?.[key];
  return raw === null || raw === undefined ? "" : String(raw);
}

/**
 * Fiche d'un personnage ou d'un lieu. Les champs vides restent vides : rien
 * n'est inventé. Toutes les informations sont modifiables par l'auteur.
 */
export default function StudioSheetScreen() {
  const params = useLocalSearchParams<{ id: string; type?: string; storyId?: string }>();
  const entityId = String(params.id ?? "");
  const storyId = String(params.storyId ?? "");
  const type: EntityType = params.type === "location" ? "location" : "character";
  const sections: StudioSection[] = type === "character" ? CHARACTER_SECTIONS : LOCATION_SECTIONS;

  const utils = trpc.useUtils();
  const narrative = trpc.narrative.list.useQuery({ storyId }, { enabled: Boolean(storyId) });
  const updateCharacter = trpc.narrative.updateCharacter.useMutation();
  const updateLocation = trpc.narrative.updateLocation.useMutation();
  const addMedia = trpc.narrative.addMedia.useMutation();
  const removeMedia = trpc.narrative.removeMedia.useMutation();

  const row = useMemo(() => {
    const list = (type === "character" ? narrative.data?.characters : narrative.data?.locations) ?? [];
    return (list as unknown as Row[]).find((item) => item.id === entityId) ?? null;
  }, [narrative.data, type, entityId]);

  const media = useMemo(
    () => (narrative.data?.media ?? []).filter((item) => item.entityType === type && item.entityId === entityId),
    [narrative.data, type, entityId],
  );

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [aliases, setAliases] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});

  function resetForm(source: Row) {
    setName(source.name);
    setAliases(Array.isArray(source.aliases) ? (source.aliases as string[]).join(", ") : "");
    const next: Record<string, string> = {};
    for (const section of sections) for (const field of section.fields) next[field.key] = valueOf(source, field.key, field.column);
    setValues(next);
  }

  useEffect(() => {
    if (row && !editing) resetForm(row);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row]);

  async function refresh() {
    await utils.narrative.list.invalidate({ storyId });
  }

  async function save() {
    if (!row) return;
    if (!name.trim()) {
      toast("Le nom ne peut pas être vide.", "error");
      return;
    }
    const columns: Record<string, string | null> = {};
    const sheet: Record<string, string> = {};
    for (const section of sections) {
      for (const field of section.fields) {
        const value = (values[field.key] ?? "").trim();
        if (field.column) columns[field.key] = value || null;
        else if (value) sheet[field.key] = value;
      }
    }
    try {
      if (type === "character") {
        await updateCharacter.mutateAsync({
          id: row.id,
          storyId,
          name: name.trim(),
          aliases: aliases
            .split(",")
            .map((alias) => alias.trim())
            .filter(Boolean)
            .slice(0, 12),
          sheet,
          ...columns,
        });
      } else {
        await updateLocation.mutateAsync({ id: row.id, storyId, name: name.trim(), sheet, ...columns });
      }
      await refresh();
      setEditing(false);
      toast("Fiche enregistrée.", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  async function addImage() {
    try {
      const picked = await pickStudioImage();
      if (!picked) return;
      await addMedia.mutateAsync({ storyId, entityType: type, entityId, imageBase64: picked.base64 });
      await refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  async function deleteImage(mediaId: string) {
    try {
      await removeMedia.mutateAsync({ id: mediaId, storyId });
      await refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  if (narrative.isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Ouverture de la fiche…" />
      </Screen>
    );
  }
  if (narrative.isError || !row) {
    return (
      <Screen>
        <PageHeader back title="Fiche" />
        <ErrorState
          message={narrative.isError ? errorMessage(narrative.error) : "Cette fiche n'existe plus."}
          onRetry={() => void narrative.refetch()}
        />
      </Screen>
    );
  }

  const characterNames = new Map(
    ((narrative.data?.characters ?? []) as unknown as Row[]).map((item) => [item.id, item.name]),
  );
  const relations =
    type === "character"
      ? (narrative.data?.relations ?? []).filter(
          (relation) => relation.fromCharacterId === entityId || relation.toCharacterId === entityId,
        )
      : [];
  const saving = updateCharacter.isPending || updateLocation.isPending;

  return (
    <Screen refreshing={narrative.isRefetching} onRefresh={() => void narrative.refetch()}>
      <PageHeader
        back
        eyebrow={type === "character" ? "Fiche personnage" : "Fiche lieu"}
        title={row.name}
        subtitle={
          type === "character" && Array.isArray(row.aliases) && (row.aliases as string[]).length
            ? `Aussi appelé : ${(row.aliases as string[]).join(", ")}`
            : undefined
        }
        right={
          editing ? undefined : (
            <Button label="Modifier" icon="pencil-outline" size="sm" variant="secondary" onPress={() => setEditing(true)} />
          )
        }
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
        {media.map((item) => (
          <View key={item.id} style={styles.imageWrap}>
            <Image source={studioMediaSource(item.id)} style={styles.image} resizeMode="cover" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retirer cette image"
              onPress={() => void deleteImage(item.id)}
              style={styles.imageRemove}
              hitSlop={8}
            >
              <Ionicons name="close" size={14} color={theme.textPrimary} />
            </Pressable>
          </View>
        ))}
        {media.length < STUDIO_MEDIA_MAX_PER_ENTITY ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={type === "character" ? "Ajouter un portrait" : "Ajouter une image"}
            onPress={() => void addImage()}
            style={[styles.image, styles.addImage]}
          >
            <Ionicons name={addMedia.isPending ? "hourglass-outline" : "image-outline"} size={24} color={theme.gold} />
            <Text variant="caption" color={theme.textMuted} align="center">
              {type === "character" ? "Portrait" : "Image"}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {editing ? (
        <Card style={styles.card}>
          <Input label="Nom" required value={name} onChangeText={setName} maxLength={120} />
          {type === "character" ? (
            <Input
              label="Autres noms et surnoms"
              value={aliases}
              onChangeText={setAliases}
              placeholder="Séparés par des virgules"
              hint="Ils aideront à reconnaître le personnage quand il est désigné autrement."
            />
          ) : null}
        </Card>
      ) : null}

      {sections.map((section) => {
        const filled = section.fields.filter((field) => valueOf(row, field.key, field.column));
        if (!editing && filled.length === 0) return null;
        return (
          <View key={section.id}>
            <SectionHeader title={section.title} />
            <Card style={styles.card}>
              {editing
                ? section.fields.map((field) => (
                    <Input
                      key={field.key}
                      label={field.label}
                      value={values[field.key] ?? ""}
                      onChangeText={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
                      placeholder={field.placeholder}
                      multiline={field.multiline}
                      maxLength={4000}
                    />
                  ))
                : filled.map((field) => (
                    <View key={field.key} style={styles.field}>
                      <Text variant="label" color={theme.gold}>
                        {field.label}
                      </Text>
                      <Text variant="body" color={theme.textSecondary}>
                        {valueOf(row, field.key, field.column)}
                      </Text>
                      {row.sources?.[field.key]?.origin === "ai" ? (
                        <Text variant="caption" color={theme.textMuted} style={styles.source}>
                          Repéré par l'IA
                          {row.sources[field.key]?.chapterTitle ? ` dans « ${row.sources[field.key]?.chapterTitle} »` : ""}
                          {row.sources[field.key]?.quote ? ` : « ${row.sources[field.key]?.quote} »` : ""}
                        </Text>
                      ) : null}
                    </View>
                  ))}
            </Card>
          </View>
        );
      })}

      {!editing && sections.every((section) => section.fields.every((field) => !valueOf(row, field.key, field.column))) ? (
        <InlineNotice tone="info" title="Fiche encore vide">
          Remplissez seulement ce que vous savez déjà : un champ inconnu reste vide, rien n'est
          inventé. L'analyse automatique complète aussi la fiche à partir de vos chapitres, citation
          à l'appui.
        </InlineNotice>
      ) : null}

      {type === "character" && !editing ? (
        <View>
          <SectionHeader title="Relations" eyebrow={`${relations.length}`} />
          <Card style={styles.card}>
            {relations.length === 0 ? (
              <Text variant="caption" color={theme.textMuted}>
                Aucune relation. Ajoutez-en depuis l'onglet Relations du studio.
              </Text>
            ) : (
              relations.map((relation) => {
                const otherId = relation.fromCharacterId === entityId ? relation.toCharacterId : relation.fromCharacterId;
                return (
                  <View key={relation.id} style={styles.relationRow}>
                    <Badge tone="bordeaux">{KIND_LABEL[relation.kind] ?? relation.kind}</Badge>
                    <View style={styles.flex}>
                      <Text variant="bodyStrong">{characterNames.get(otherId) ?? "Personnage"}</Text>
                      {relation.description ? (
                        <Text variant="caption" color={theme.textMuted}>
                          {relation.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </Card>
        </View>
      ) : null}

      {editing ? (
        <View style={styles.actions}>
          <Button
            label="Annuler"
            variant="ghost"
            onPress={() => {
              resetForm(row);
              setEditing(false);
            }}
          />
          <Button label="Enregistrer la fiche" icon="checkmark" loading={saving} onPress={() => void save()} style={styles.flex} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gallery: {
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  imageWrap: {
    position: "relative",
  },
  image: {
    width: 120,
    height: 160,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.3)",
  },
  addImage: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderStyle: "dashed",
  },
  imageRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(5,9,15,0.7)",
  },
  card: {
    gap: spacing[3],
  },
  field: {
    gap: 3,
  },
  source: {
    fontStyle: "italic",
  },
  relationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  actions: {
    flexDirection: "row",
    gap: spacing[3],
    marginTop: spacing[5],
  },
});
