import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
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
  Segmented,
  Sheet,
  Text,
} from "@/components";
import { queryClient, trpc } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { shareTextFile } from "@/lib/export";
import { toast } from "@/lib/toast";
import { useUiStore } from "@/lib/ui";
import { APP_THEME_OPTIONS, type AppThemeId, appThemeId, getReadingTheme, palette, setAppTheme, theme } from "@/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery(undefined);
  const updatePreferences = trpc.auth.updatePreferences.useMutation();
  const setGoal = trpc.auth.setGoal.useMutation();
  const [pendingTheme, setPendingTheme] = useState<AppThemeId | null>(null);
  const [applyingTheme, setApplyingTheme] = useState(false);
  // Choix affiché tout de suite au toucher, sans attendre le serveur (qui peut
  // mettre plusieurs dizaines de secondes à se réveiller).
  const [goalDraft, setGoalDraft] = useState<"read" | "write" | "both" | null>(null);
  const changePassword = trpc.auth.changePassword.useMutation();
  const resendVerification = trpc.auth.resendVerification.useMutation();
  const exportData = trpc.auth.exportData.useMutation();
  const deleteAccount = trpc.auth.deleteAccount.useMutation();
  const clearSession = useAuthStore((state) => state.clearSession);
  const appVersion = Constants.expoConfig?.version ?? "0.2.0";
  const legalUrl =
    (Constants.expoConfig?.extra as { privacyPolicyUrl?: string } | undefined)
      ?.privacyPolicyUrl ?? "https://plume-api-qk9s.onrender.com/confidentialite";

  const fontScale = useUiStore((state) => state.fontScale);
  const setFontScale = useUiStore((state) => state.setFontScale);
  const readingTheme = useUiStore((state) => state.readingTheme);
  const setReadingTheme = useUiStore((state) => state.setReadingTheme);
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

  async function resendEmailVerification() {
    if (!me.data) return;
    try {
      await resendVerification.mutateAsync({ email: me.data.user.email });
      toast("E-mail de vérification envoyé. Vérifiez aussi les indésirables.", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
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
  const savedGoal = (me.data.profile?.goal as "read" | "write" | "both" | null | undefined) ?? "both";

  async function chooseGoal(goal: "read" | "write" | "both") {
    if (goal === (goalDraft ?? savedGoal)) return;
    setGoalDraft(goal);
    try {
      await setGoal.mutateAsync({ goal });
      await queryClient.invalidateQueries();
      toast("Profil mis à jour.", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setGoalDraft(null);
    }
  }

  async function applyTheme() {
    if (!pendingTheme) return;
    setApplyingTheme(true);
    // Si l'application ne s'est pas relancée au bout de quelques secondes
    // (serveur de développement injoignable, par exemple), on le dit.
    const fallback = setTimeout(() => {
      setApplyingTheme(false);
      setPendingTheme(null);
      toast("Thème enregistré. Fermez puis rouvrez Plume pour l'appliquer.", "info");
    }, 6_000);
    try {
      await setAppTheme(pendingTheme);
    } catch (error) {
      clearTimeout(fallback);
      setApplyingTheme(false);
      setPendingTheme(null);
      toast(`Thème enregistré, mais la relance a échoué (${errorMessage(error)}). Fermez puis rouvrez Plume.`, "error");
    }
  }

  return (
    <Screen>
      <PageHeader
        back
        eyebrow="Votre espace"
        title="Réglages"
        subtitle="Confort de lecture, écriture et données personnelles."
      />

      <SectionHeader title="Ce que je fais sur Plume" eyebrow="Mon profil" />
      <Card style={styles.card}>
        <Text variant="caption" color={theme.textSecondary}>
          Indique si vous venez surtout pour lire, pour écrire, ou les deux. Ce choix ne change pas
          les couleurs : le thème se règle juste en dessous.
        </Text>
        <Segmented
          options={[
            { value: "read", label: "Lire" },
            { value: "write", label: "Écrire" },
            { value: "both", label: "Les deux" },
          ]}
          value={goalDraft ?? savedGoal}
          onChange={(goal) => void chooseGoal(goal)}
        />
        {setGoal.isPending ? (
          <Text variant="caption" color={theme.gold}>
            Enregistrement…
          </Text>
        ) : null}
        <Text variant="caption" color={theme.textMuted}>
          Le Studio d'écriture (fiches, relations, chronologie) est réservé aux profils « Écrire »
          et « Les deux ». Changer de profil ne supprime rien.
        </Text>
      </Card>

      <SectionHeader title="Thème de l'application" eyebrow="Apparence" />
      <Card style={styles.card}>
        <View style={styles.appThemeRow}>
          {APP_THEME_OPTIONS.map((option) => {
            const selected = appThemeId === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`Thème ${option.label}`}
                onPress={() => {
                  if (!selected) setPendingTheme(option.id);
                }}
                style={[
                  styles.appThemeOption,
                  { backgroundColor: option.background },
                  selected && { borderColor: theme.gold, borderWidth: 2 },
                ]}
              >
                <Text variant="bodyStrong" color={option.text}>
                  Aa
                </Text>
                <Text variant="caption" color={option.text}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text variant="caption" color={theme.textMuted}>
          Couleurs de tous les écrans de Plume. Le fond des pages de lecture se règle à part, plus
          bas (« Pages de lecture »).
        </Text>
      </Card>

      <Sheet
        visible={Boolean(pendingTheme)}
        onClose={() => {
          if (!applyingTheme) setPendingTheme(null);
        }}
        title="Changer de thème ?"
        subtitle="L'application va se relancer pour appliquer le thème partout. Vos textes sont enregistrés."
        footer={
          <Button
            label="Appliquer et relancer"
            icon="color-palette-outline"
            loading={applyingTheme}
            onPress={() => void applyTheme()}
            fullWidth
          />
        }
      >
        <Text variant="caption" color={theme.textMuted}>
          {applyingTheme
            ? "Relance en cours…"
            : `Thème choisi : ${APP_THEME_OPTIONS.find((option) => option.id === pendingTheme)?.label ?? ""}`}
        </Text>
      </Sheet>

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
                  color={selected ? theme.textOnGold : theme.textSecondary}
                >
                  {Math.round(option * 100)} %
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <SectionHeader title="Pages de lecture" eyebrow="Lecteur de chapitres" />
      <Card style={styles.card}>
        <Text variant="caption" color={theme.textMuted}>
          Fond et couleur du texte quand vous lisez un chapitre. Indépendant du thème de
          l'application ; se change aussi depuis le lecteur.
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
                {selected ? (
                  <Ionicons name="checkmark-circle" size={16} color={option.accent} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
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
              trackColor={{ false: theme.surfaceSunken, true: "rgba(197,164,106,0.55)" }}
              thumbColor={reduceMotion ? palette.goldBright : theme.textMuted}
              accessibilityLabel="Réduire les animations"
            />
          </View>
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
                : "Non vérifiée — appuyez pour renvoyer le lien de confirmation"
            }
            rightText={me.data.user.email}
            onPress={
              me.data.user.emailVerified ? undefined : () => void resendEmailVerification()
            }
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
            icon="shield-checkmark-outline"
            title="Confidentialité et conditions"
            subtitle="Politique de confidentialité, conditions d'utilisation et suppression"
            onPress={() => void Linking.openURL(legalUrl)}
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
          <Badge tone="gold">{`Plume ${appVersion}`}</Badge>
        </View>
        <Text variant="caption" color={theme.textSecondary}>
          Plume est un atelier d'écriture et une bibliothèque de lecture. Le coach observe,
          questionne et propose des exercices ; il ne réécrit jamais votre texte. Les citations
          présentées comme provenant de votre manuscrit sont vérifiées côté serveur.
        </Text>
        <Text variant="caption" color={theme.textMuted}>
          Vos manuscrits privés restent accessibles à vous seul. Vous pouvez exporter vos données
          ou supprimer votre compte à tout moment.
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
          hint="6 caractères minimum."
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

const styles = StyleSheet.create({
  appThemeRow: {
    flexDirection: "row",
    gap: spacing[3],
  },
  appThemeOption: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: spacing[3],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.3)",
  },
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
    borderWidth: 3,
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
  listPad: {
    paddingHorizontal: spacing[4],
  },
  aboutRow: {
    flexDirection: "row",
    gap: 7,
  },
});
