import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fontScaleOptions, spacing } from "@plume/shared";
import {
  Badge,
  Button,
  Card,
  InlineNotice,
  Input,
  ListRow,
  LoadingState,
  PageHeader,
  Screen,
  SectionHeader,
  Sheet,
  Text,
} from "@/components";
import { queryClient, trpc } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { shareTextFile } from "@/lib/export";
import { toast } from "@/lib/toast";
import { useUiStore } from "@/lib/ui";
import { getReadingTheme, palette, theme } from "@/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery(undefined);
  const updatePreferences = trpc.auth.updatePreferences.useMutation();
  const changePassword = trpc.auth.changePassword.useMutation();
  const exportData = trpc.auth.exportData.useMutation();
  const deleteAccount = trpc.auth.deleteAccount.useMutation();
  const clearSession = useAuthStore((state) => state.clearSession);

  const fontScale = useUiStore((state) => state.fontScale);
  const setFontScale = useUiStore((state) => state.setFontScale);
  const readingTheme = useUiStore((state) => state.readingTheme);
  const setReadingTheme = useUiStore((state) => state.setReadingTheme);
  const writingTheme = useUiStore((state) => state.writingTheme);
  const setWritingTheme = useUiStore((state) => state.setWritingTheme);
  const reduceMotion = useUiStore((state) => state.reduceMotion);
  const setReduceMotion = useUiStore((state) => state.setReduceMotion);
  const applyRemote = useUiStore((state) => state.applyRemote);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!me.data) return;
    applyRemote({
      fontScale: me.data.preferences.fontScale,
      readingTheme: me.data.preferences.readingTheme,
      writingTheme: me.data.preferences.writingTheme,
      reduceMotion: me.data.preferences.reduceMotion,
    });
  }, [me.data, applyRemote]);

  async function syncPreference(input: {
    fontScale?: number;
    readingTheme?: "night" | "sepia" | "ivory";
    writingTheme?: "night" | "sepia" | "ivory";
    reduceMotion?: boolean;
    notifications?: Partial<{
      newChapters: boolean;
      comments: boolean;
      coaching: boolean;
      progress: boolean;
    }>;
  }) {
    try {
      const updated = await updatePreferences.mutateAsync(input);
      utils.auth.me.setData(undefined, updated);
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  async function submitPassword() {
    setFormError(null);
    if (newPassword !== confirmPassword) {
      setFormError("Les deux nouveaux mots de passe ne correspondent pas.");
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast("Mot de passe modifié. Vos autres sessions ont été révoquées.", "success");
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  async function exportAccount() {
    try {
      const data = await exportData.mutateAsync();
      const result = await shareTextFile({
        filename: `plume-export-${new Date().toISOString().slice(0, 10)}.json`,
        mimeType: "application/json",
        content: JSON.stringify(data, null, 2),
        dialogTitle: "Exporter mes données Plume",
      });
      if (result === "unavailable") {
        toast("Le partage de fichier n'est pas disponible sur cet appareil.", "error");
      } else {
        toast("Export préparé.", "success");
      }
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  async function confirmDelete() {
    setFormError(null);
    if (deleteConfirmation !== "SUPPRIMER") {
      setFormError("Écrivez SUPPRIMER en majuscules pour confirmer.");
      return;
    }
    try {
      await deleteAccount.mutateAsync({ password: deletePassword, confirmation: "SUPPRIMER" });
      await clearSession();
      queryClient.clear();
      toast("Compte supprimé. Vos données ont été effacées.", "success");
      router.replace("/bienvenue");
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  if (!me.data) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Ouverture des réglages…" />
      </Screen>
    );
  }

  const preferences = me.data.preferences;
  const notifications = preferences.notifications;

  return (
    <Screen>
      <PageHeader
        back
        eyebrow="Votre espace"
        title="Réglages"
        subtitle="Confort de lecture, écriture, notifications et données personnelles."
      />

      <SectionHeader title="Taille du texte" eyebrow="Accessibilité" />
      <Card style={styles.card}>
        <Text variant="caption" color={theme.textMuted}>
          La préférence s'applique à toute l'application. Les titres suivent de façon atténuée.
        </Text>
        <View style={styles.scaleRow}>
          {fontScaleOptions.map((option) => {
            const selected = Math.abs(fontScale - option) < 0.01;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`Taille ${Math.round(option * 100)} pour cent`}
                onPress={() => {
                  setFontScale(option);
                  void syncPreference({ fontScale: option });
                }}
                style={[styles.scaleOption, selected && styles.scaleSelected]}
              >
                <Text
                  variant="caption"
                  color={selected ? palette.nightDeep : theme.textSecondary}
                >
                  {Math.round(option * 100)} %
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <SectionHeader title="Ambiances" eyebrow="Lecture et écriture" />
      <Card style={styles.card}>
        <Text variant="label" color={theme.textSecondary}>
          Thème de lecture
        </Text>
        <View style={styles.themeRow}>
          {(["night", "sepia", "ivory"] as const).map((themeId) => {
            const option = getReadingTheme(themeId);
            const selected = readingTheme === themeId;
            return (
              <Pressable
                key={themeId}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`Thème de lecture ${option.label}`}
                onPress={() => {
                  setReadingTheme(themeId);
                  void syncPreference({ readingTheme: themeId });
                }}
                style={[
                  styles.themeOption,
                  { backgroundColor: option.background, borderColor: option.accent },
                  selected && styles.themeSelected,
                ]}
              >
                <Text variant="bodyStrong" color={option.text}>
                  Aa
                </Text>
                <Text variant="caption" color={option.textMuted}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text variant="label" color={theme.textSecondary} style={styles.subLabel}>
          Thème d'écriture
        </Text>
        <View style={styles.chips}>
          {(["night", "sepia", "ivory"] as const).map((themeId) => {
            const selected = writingTheme === themeId;
            return (
              <Pressable
                key={themeId}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`Thème d'écriture ${getReadingTheme(themeId).label}`}
                onPress={() => {
                  setWritingTheme(themeId);
                  void syncPreference({ writingTheme: themeId });
                }}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text
                  variant="caption"
                  color={selected ? palette.nightDeep : theme.textSecondary}
                >
                  {getReadingTheme(themeId).label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <InlineNotice tone="info">
          Le thème d'écriture prépare une ambiance de page. L'éditeur de cette version conserve un
          fond nuit pour garantir le contraste du texte et des contrôles.
        </InlineNotice>
      </Card>

      <SectionHeader title="Mouvement et confort" eyebrow="Accessibilité" />
      <Card padded={false}>
        <View style={styles.switchPad}>
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text variant="bodyStrong">Réduire les animations</Text>
              <Text variant="caption" color={theme.textMuted}>
                Limite les transitions décoratives. Les changements d'écran restent fonctionnels.
              </Text>
            </View>
            <Switch
              value={reduceMotion}
              onValueChange={(value) => {
                setReduceMotion(value);
                void syncPreference({ reduceMotion: value });
              }}
              trackColor={{ false: palette.inkSoft, true: "rgba(197,164,106,0.55)" }}
              thumbColor={reduceMotion ? palette.goldBright : palette.parchmentDeep}
              accessibilityLabel="Réduire les animations"
            />
          </View>
        </View>
      </Card>

      <SectionHeader title="Notifications" eyebrow="Préférences" />
      <Card padded={false}>
        <View style={styles.switchPad}>
          <NotificationRow
            title="Nouveaux chapitres"
            subtitle="Des histoires que vous suivez"
            value={notifications.newChapters}
            onChange={(value) => void syncPreference({ notifications: { newChapters: value } })}
          />
          <NotificationRow
            title="Commentaires"
            subtitle="Réactions à vos textes publiés"
            value={notifications.comments}
            onChange={(value) => void syncPreference({ notifications: { comments: value } })}
          />
          <NotificationRow
            title="Coach et analyses"
            subtitle="Rappels de méthode et diagnostics terminés"
            value={notifications.coaching}
            onChange={(value) => void syncPreference({ notifications: { coaching: value } })}
          />
          <NotificationRow
            title="Progression"
            subtitle="Récapitulatif de vos compétences"
            value={notifications.progress}
            onChange={(value) => void syncPreference({ notifications: { progress: value } })}
          />
        </View>
        <View style={styles.noticePad}>
          <InlineNotice tone="warning">
            Les notifications push ne sont pas branchées dans cette version. Ces préférences sont
            enregistrées côté serveur et seront respectées par le futur service d'envoi.
          </InlineNotice>
        </View>
      </Card>

      <SectionHeader title="Compte" eyebrow="Sécurité" />
      <Card padded={false}>
        <View style={styles.listPad}>
          <ListRow
            icon="mail-outline"
            title="Adresse e-mail"
            subtitle={
              me.data.user.emailVerified
                ? "Vérifiée"
                : "Non vérifiée — l'envoi d'e-mails n'est pas actif dans cette version"
            }
            rightText={me.data.user.email}
          />
          <ListRow
            icon="key-outline"
            title="Mot de passe"
            subtitle="Modifier le mot de passe révoque les autres sessions"
            onPress={() => {
              setFormError(null);
              setPasswordOpen(true);
            }}
          />
          <ListRow
            icon="download-outline"
            title="Exporter mes données"
            subtitle="Profil, manuscrits, chapitres, bible et analyses au format JSON"
            onPress={() => void exportAccount()}
          />
          <ListRow
            icon="trash-outline"
            title="Supprimer mon compte"
            subtitle="Effacement définitif des manuscrits et données associées"
            danger
            onPress={() => {
              setFormError(null);
              setDeleteOpen(true);
            }}
          />
        </View>
      </Card>

      <SectionHeader title="À propos" eyebrow="Version" />
      <Card style={styles.card}>
        <View style={styles.aboutRow}>
          <Badge tone="gold">Plume 0.1.0</Badge>
          <Badge tone="muted">Démonstration</Badge>
        </View>
        <Text variant="caption" color={theme.textSecondary}>
          Application de démonstration. Le coach utilise un moteur pédagogique simulé et
          déterministe ; aucune IA générative payante n'est appelée. La vérification d'e-mail, la
          réinitialisation de mot de passe et les notifications push sont préparées côté données
          mais ne sont pas branchées.
        </Text>
        <Text variant="caption" color={theme.textMuted}>
          Aucun paiement n'est activé. Les formules présentées sont des enveloppes de quotas.
        </Text>
      </Card>

      <Sheet
        visible={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        title="Modifier le mot de passe"
        subtitle="Choisissez un mot de passe long et unique. Vos autres sessions seront révoquées."
        footer={
          <Button
            label="Modifier le mot de passe"
            icon="key-outline"
            loading={changePassword.isPending}
            onPress={() => void submitPassword()}
          />
        }
      >
        {formError ? <InlineNotice tone="danger">{formError}</InlineNotice> : null}
        <Input
          label="Mot de passe actuel"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          autoCapitalize="none"
        />
        <Input
          label="Nouveau mot de passe"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoCapitalize="none"
          hint="12 caractères minimum, avec majuscule, minuscule et chiffre."
        />
        <Input
          label="Confirmer le nouveau mot de passe"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
        />
      </Sheet>

      <Sheet
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Supprimer définitivement le compte"
        subtitle="Cette action est irréversible et supprime les manuscrits privés, chapitres, versions et analyses."
        footer={
          <Button
            label="Supprimer mon compte"
            icon="trash-outline"
            variant="danger"
            loading={deleteAccount.isPending}
            onPress={() => void confirmDelete()}
          />
        }
      >
        {formError ? <InlineNotice tone="danger">{formError}</InlineNotice> : null}
        <InlineNotice tone="danger" title="Aucune restauration possible">
          Exportez vos données avant de continuer. Les histoires publiées seront également retirées
          du catalogue.
        </InlineNotice>
        <Button
          label="Exporter mes données d'abord"
          icon="download-outline"
          variant="secondary"
          size="sm"
          onPress={() => void exportAccount()}
        />
        <Input
          label="Mot de passe"
          value={deletePassword}
          onChangeText={setDeletePassword}
          secureTextEntry
          autoCapitalize="none"
        />
        <Input
          label="Écrivez SUPPRIMER pour confirmer"
          value={deleteConfirmation}
          onChangeText={setDeleteConfirmation}
          autoCapitalize="characters"
          placeholder="SUPPRIMER"
        />
      </Sheet>
    </Screen>
  );
}

function NotificationRow({
  title,
  subtitle,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" color={theme.textMuted}>
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: palette.inkSoft, true: "rgba(197,164,106,0.55)" }}
        thumbColor={value ? palette.goldBright : palette.parchmentDeep}
        accessibilityLabel={title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    gap: spacing[3],
  },
  scaleRow: {
    flexDirection: "row",
    gap: 6,
  },
  scaleOption: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  scaleSelected: {
    backgroundColor: palette.gold,
    borderColor: palette.gold,
  },
  themeRow: {
    flexDirection: "row",
    gap: 8,
  },
  themeOption: {
    flex: 1,
    minHeight: 82,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  themeSelected: {
    borderWidth: 2,
  },
  subLabel: {
    marginTop: spacing[2],
  },
  chips: {
    flexDirection: "row",
    gap: 7,
  },
  chip: {
    flex: 1,
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: {
    backgroundColor: palette.gold,
    borderColor: palette.gold,
  },
  switchPad: {
    paddingHorizontal: spacing[4],
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 68,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(197,164,106,0.12)",
  },
  noticePad: {
    padding: spacing[4],
  },
  listPad: {
    paddingHorizontal: spacing[4],
  },
  aboutRow: {
    flexDirection: "row",
    gap: 7,
  },
});
