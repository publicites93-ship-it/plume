import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { PLANS, spacing } from "@plume/shared";
import {
  Avatar,
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
  Stat,
  Text,
} from "@/components";
import { queryClient, trpc } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { shareTextFile } from "@/lib/export";
import { formatDate, formatNumber, planLabel } from "@/lib/format";
import { toast } from "@/lib/toast";
import { palette, theme, withAlpha } from "@/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery(undefined);
  const stories = trpc.stories.list.useQuery();
  const library = trpc.reading.library.useQuery();
  const bookmarks = trpc.reading.bookmarks.useQuery();
  const lists = trpc.reading.lists.useQuery();
  const clearSession = useAuthStore((state) => state.clearSession);
  const appVersion = Constants.expoConfig?.version ?? "0.2.0";

  const [editOpen, setEditOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [pseudonym, setPseudonym] = useState("");
  const [bio, setBio] = useState("");
  const [motif, setMotif] = useState("quill");
  const [editError, setEditError] = useState<string | null>(null);

  const updateProfile = trpc.auth.updateProfile.useMutation();
  const logout = trpc.auth.logout.useMutation();
  const exportData = trpc.auth.exportData.useMutation();

  if (!me.data) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Ouverture de votre profil…" />
      </Screen>
    );
  }

  const profile = me.data.profile;
  const plan = me.data.plan;
  const totalWords = stories.data?.reduce((sum, story) => sum + story.wordCount, 0) ?? 0;

  function openEdit() {
    setPseudonym(profile.pseudonym);
    setBio(profile.bio ?? "");
    setMotif(profile.avatarMotif ?? "quill");
    setEditError(null);
    setEditOpen(true);
  }

  async function saveProfile() {
    setEditError(null);
    try {
      const updated = await updateProfile.mutateAsync({
        pseudonym: pseudonym.trim(),
        bio: bio.trim(),
        avatarMotif: motif as "quill",
      });
      utils.auth.me.setData(undefined, updated);
      setEditOpen(false);
      toast("Profil mis à jour.", "success");
    } catch (error) {
      setEditError(errorMessage(error));
    }
  }

  async function doLogout() {
    try {
      const refreshToken = useAuthStore.getState().session?.refreshToken;
      await logout.mutateAsync({ refreshToken });
    } catch {
      // La session locale est effacée même si le serveur est injoignable.
    }
    await clearSession();
    queryClient.clear();
    router.replace("/bienvenue");
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

  return (
    <Screen
      refreshing={me.isRefetching}
      onRefresh={() => {
        void utils.auth.me.invalidate();
        void utils.stories.list.invalidate();
        void utils.reading.library.invalidate();
      }}
    >
      <PageHeader
        eyebrow="Votre atelier"
        title="Profil"
        right={<Badge tone="gold">{planLabel(plan.plan)}</Badge>}
      />

      <Card style={styles.identity}>
        <View style={styles.identityTop}>
          <Avatar name={profile.pseudonym} motif={profile.avatarMotif} size={68} />
          <View style={styles.flex}>
            <Text variant="title">{profile.pseudonym}</Text>
            <Text variant="caption" color={theme.textMuted} numberOfLines={2}>
              {profile.bio || "Aucune biographie pour l'instant. Une phrase suffit pour situer votre voix."}
            </Text>
            <View style={styles.identityBadges}>
              <Badge tone={me.data.user.emailVerified ? "success" : "muted"} icon={me.data.user.emailVerified ? "checkmark-circle-outline" : "mail-outline"}>
                {me.data.user.emailVerified ? "E-mail vérifié" : "E-mail non vérifié"}
              </Badge>
              <Badge tone="bordeaux">{profile.experience ?? "parcours libre"}</Badge>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Modifier le profil"
            onPress={openEdit}
            style={styles.editButton}
          >
            <Ionicons name="pencil-outline" size={17} color={theme.gold} />
          </Pressable>
        </View>
        <View style={styles.statsRow}>
          <Stat value={formatNumber(stories.data?.length ?? 0)} label="histoires" align="center" compact />
          <View style={styles.rule} />
          <Stat value={formatNumber(totalWords)} label="mots écrits" align="center" compact />
          <View style={styles.rule} />
          <Stat value={formatNumber(library.data?.length ?? 0)} label="lectures" align="center" compact />
          <View style={styles.rule} />
          <Stat value={formatNumber(bookmarks.data?.length ?? 0)} label="signets" align="center" compact />
        </View>
      </Card>

      <SectionHeader title="Votre espace" eyebrow="Bibliothèque" />
      <Card padded={false}>
        <View style={styles.listPad}>
          <ListRow
            icon="star-outline"
            title="Mes favoris · bibliothèque"
            subtitle="Histoires ajoutées en favoris, avec la reprise de lecture"
            rightText={`${library.data?.length ?? 0}`}
            onPress={() => router.push("/bibliotheque")}
          />
          <ListRow
            icon="bookmark-outline"
            title="Mes signets"
            subtitle="Passages gardés au fil de vos lectures"
            rightText={`${bookmarks.data?.length ?? 0}`}
            onPress={() => router.push("/favoris")}
          />
          <ListRow
            icon="albums-outline"
            title="Mes listes de lecture"
            subtitle="Organisez vos envies et vos relectures"
            rightText={`${lists.data?.length ?? 0}`}
            onPress={() => router.push("/listes")}
          />
        </View>
      </Card>

      <SectionHeader title="Compte et préférences" eyebrow="Réglages" />
      <Card padded={false}>
        <View style={styles.listPad}>
          <ListRow
            icon="settings-outline"
            title="Réglages de lecture et d'écriture"
            subtitle="Taille du texte, thèmes, notifications, mot de passe"
            onPress={() => router.push("/reglages")}
          />
          <ListRow
            icon="mail-outline"
            title="Adresse e-mail"
            rightText={me.data.user.email}
            subtitle="La vérification par e-mail n'est pas active dans cette version"
          />
          <ListRow
            icon="calendar-outline"
            title="Compte créé le"
            rightText={formatDate(me.data.user.createdAt)}
          />
          <ListRow
            icon="sparkles-outline"
            title="Formule"
            rightText={PLANS[plan.plan].priceLabel}
            subtitle={`${plan.activeStories}/${plan.activeStoriesLimit} histoires actives · ${formatNumber(plan.creditsRemaining)} crédits coach restants`}
            onPress={() => router.push("/ecrire")}
          />
        </View>
      </Card>

      <SectionHeader title="Vos données" eyebrow="Confidentialité" />
      <Card>
        <Text variant="body" color={theme.textSecondary}>
          Vos manuscrits privés ne sont jamais exposés dans le catalogue. Vous pouvez exporter
          l'intégralité de vos données ou supprimer votre compte depuis les réglages.
        </Text>
        <View style={styles.dataActions}>
          <Button
            label="Exporter mes données"
            icon="download-outline"
            variant="secondary"
            size="sm"
            loading={exportData.isPending}
            onPress={exportAccount}
          />
          <Button
            label="Réglages"
            icon="settings-outline"
            variant="ghost"
            size="sm"
            onPress={() => router.push("/reglages")}
          />
        </View>
      </Card>

      <Card style={styles.logoutCard}>
        <Button
          label="Fermer la session"
          icon="log-out-outline"
          variant="ghost"
          onPress={() => setLogoutOpen(true)}
        />
      </Card>

      <Text variant="caption" color={theme.textMuted} align="center" style={styles.version}>
        Plume {appVersion}
      </Text>

      <Sheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        title="Modifier le profil"
        subtitle="Votre pseudonyme est public si vous publiez. Votre biographie apparaît sur votre page d'auteur."
        footer={
          <Button
            label="Enregistrer"
            icon="checkmark"
            loading={updateProfile.isPending}
            onPress={saveProfile}
          />
        }
      >
        {editError ? <InlineNotice tone="danger">{editError}</InlineNotice> : null}
        <Input
          label="Pseudonyme"
          value={pseudonym}
          onChangeText={setPseudonym}
          maxLength={32}
          autoCapitalize="words"
        />
        <Input
          label="Biographie"
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={600}
          placeholder="Votre voix, vos obsessions, ce que vous cherchez à écrire…"
          hint={`${bio.length}/600`}
        />
        <View style={styles.motifGroup}>
          <Text variant="label" color={theme.textSecondary}>
            Motif d'avatar
          </Text>
          <View style={styles.motifs}>
            {["quill", "rose", "moon", "arch", "castle", "owl"].map((item) => (
              <Pressable
                key={item}
                accessibilityRole="radio"
                accessibilityState={{ selected: motif === item }}
                accessibilityLabel={`Motif ${item}`}
                onPress={() => setMotif(item)}
                style={[styles.motif, motif === item && styles.motifSelected]}
              >
                <Avatar name={item} motif={item} size={40} />
              </Pressable>
            ))}
          </View>
        </View>
      </Sheet>

      <Sheet
        visible={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="Fermer la session ?"
        subtitle="Vos manuscrits restent enregistrés sur le serveur. Les brouillons locaux non synchronisés sont conservés sur cet appareil."
        footer={
          <View style={styles.sheetActions}>
            <Button label="Annuler" variant="ghost" onPress={() => setLogoutOpen(false)} />
            <Button
              label="Fermer la session"
              icon="log-out-outline"
              variant="danger"
              loading={logout.isPending}
              onPress={doLogout}
              style={styles.flex}
            />
          </View>
        }
      >
        <InlineNotice tone="info">
          Vous devrez saisir à nouveau votre adresse e-mail et votre mot de passe pour revenir.
        </InlineNotice>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  identity: {
    gap: spacing[4],
  },
  identityTop: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  identityBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 7,
  },
  editButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(197,164,106,0.18)",
    paddingTop: spacing[3],
  },
  rule: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: "rgba(197,164,106,0.2)",
    flex: 0,
  },
  listPad: {
    paddingHorizontal: spacing[4],
  },
  dataActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3],
    marginTop: spacing[4],
  },
  logoutCard: {
    marginTop: spacing[6],
    backgroundColor: withAlpha(theme.surface, 0.5),
  },
  version: {
    marginTop: spacing[4],
    fontSize: 10,
  },
  motifGroup: {
    gap: 8,
  },
  motifs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  motif: {
    padding: 3,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "transparent",
  },
  motifSelected: {
    borderColor: palette.gold,
  },
  sheetActions: {
    flexDirection: "row",
    gap: spacing[3],
  },
});
