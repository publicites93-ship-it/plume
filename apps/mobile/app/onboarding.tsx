import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GENRES, SKILLS, radii, spacing, touchTarget } from "@plume/shared";
import { Button, Chip, LoadingState, ProgressBar, Text } from "@/components";
import { queryClient, trpc } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { toast } from "@/lib/toast";
import { palette, theme } from "@/theme";

const goals = [
  {
    value: "both" as const,
    icon: "swap-horizontal-outline" as const,
    title: "Lire et écrire",
    body: "Je veux avancer sur un texte et découvrir d'autres plumes.",
  },
  {
    value: "write" as const,
    icon: "create-outline" as const,
    title: "Écrire",
    body: "J'ai un projet de roman, de nouvelle ou de récit.",
  },
  {
    value: "read" as const,
    icon: "book-outline" as const,
    title: "Lire",
    body: "Je cherche des histoires à suivre et une bibliothèque vivante.",
  },
];

const experiences = [
  {
    value: "beginner" as const,
    title: "Je commence",
    body: "Peu ou pas encore de texte terminé. J'ai besoin de repères simples.",
  },
  {
    value: "intermediate" as const,
    title: "J'écris régulièrement",
    body: "Quelques textes, des habitudes, et l'envie de structurer davantage.",
  },
  {
    value: "advanced" as const,
    title: "Je travaille en profondeur",
    body: "Je veux des diagnostics exigeants et des exercices ciblés.",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery(undefined, { enabled: Boolean(session), retry: false });
  const complete = trpc.auth.completeOnboarding.useMutation();

  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<"read" | "write" | "both">("both");
  const [genres, setGenres] = useState<string[]>([]);
  const [experience, setExperience] = useState<"beginner" | "intermediate" | "advanced">(
    "intermediate",
  );
  const [skills, setSkills] = useState<string[]>([]);
  const [notifications, setNotifications] = useState({
    newChapters: true,
    comments: true,
    coaching: true,
    progress: true,
  });

  const titles = useMemo(
    () => [
      {
        eyebrow: "Votre intention",
        title: "Que venez-vous chercher ?",
        subtitle: "Plume adapte ses propositions à votre usage, sans jamais écrire à votre place.",
      },
      {
        eyebrow: "Votre bibliothèque",
        title: "Quels mondes vous attirent ?",
        subtitle: "Choisissez au moins un genre. Vous pourrez modifier ces préférences plus tard.",
      },
      {
        eyebrow: "Votre expérience",
        title: "Où en êtes-vous ?",
        subtitle: "Il n'y a pas de bonne réponse. Le coach règle simplement son niveau d'exigence.",
      },
      {
        eyebrow: "Vos priorités",
        title: "Que voulez-vous travailler ?",
        subtitle: "Sélectionnez les compétences qui comptent pour votre projet actuel.",
      },
    ],
    [],
  );

  if (!session) return <Redirect href="/bienvenue" />;
  if (meQuery.isLoading) {
    return (
      <SafeAreaView style={styles.loading}>
        <LoadingState label="Préparation de votre atelier…" />
      </SafeAreaView>
    );
  }
  if (meQuery.data?.profile.onboardingCompleted) return <Redirect href="/" />;

  const current = titles[step]!;

  function toggle(list: string[], value: string, max: number): string[] {
    if (list.includes(value)) return list.filter((item) => item !== value);
    if (list.length >= max) {
      toast(`Vous pouvez sélectionner jusqu'à ${max} éléments.`, "info");
      return list;
    }
    return [...list, value];
  }

  function next() {
    if (step === 1 && genres.length === 0) {
      toast("Choisissez au moins un genre pour continuer.", "error");
      return;
    }
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    void finish();
  }

  async function finish() {
    try {
      const result = await complete.mutateAsync({
        goal,
        genres: genres as (typeof GENRES)[number][],
        experience,
        skills: skills as Array<(typeof SKILLS)[number]["id"]>,
        notifications,
      });
      utils.auth.me.setData(undefined, result);
      await queryClient.invalidateQueries();
      router.replace("/");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0B111C", "#101827", "#162133"]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Text variant="label" color={theme.gold} style={styles.brand}>
            PLUME
          </Text>
          <Text variant="caption" color={theme.textMuted}>
            Étape {step + 1} sur 4
          </Text>
        </View>
        <ProgressBar value={(step + 1) / 4} height={4} />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heading}>
            <Text variant="label" color={theme.gold}>
              {current.eyebrow}
            </Text>
            <Text variant="display">{current.title}</Text>
            <Text variant="body" color={theme.textSecondary}>
              {current.subtitle}
            </Text>
          </View>

          {step === 0 ? (
            <View style={styles.options}>
              {goals.map((item) => (
                <OptionCard
                  key={item.value}
                  selected={goal === item.value}
                  icon={item.icon}
                  title={item.title}
                  body={item.body}
                  onPress={() => setGoal(item.value)}
                />
              ))}
            </View>
          ) : null}

          {step === 1 ? (
            <View style={styles.chips}>
              {GENRES.map((genre) => (
                <Chip
                  key={genre}
                  label={genre}
                  selected={genres.includes(genre)}
                  onPress={() => setGenres((list) => toggle(list, genre, 8))}
                />
              ))}
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.options}>
              {experiences.map((item) => (
                <OptionCard
                  key={item.value}
                  selected={experience === item.value}
                  icon="bookmark-outline"
                  title={item.title}
                  body={item.body}
                  onPress={() => setExperience(item.value)}
                />
              ))}
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.stepThree}>
              <View style={styles.chips}>
                {SKILLS.map((skill) => (
                  <Chip
                    key={skill.id}
                    label={skill.name}
                    selected={skills.includes(skill.id)}
                    onPress={() => setSkills((list) => toggle(list, skill.id, 7))}
                  />
                ))}
              </View>
              <View style={styles.notifications}>
                <Text variant="subheading">Rappels discrets</Text>
                <Text variant="caption" color={theme.textMuted}>
                  Aucune notification n'est envoyée dans cette version : les préférences sont
                  enregistrées pour la future application mobile.
                </Text>
                <NotificationRow
                  label="Nouveaux chapitres des auteurs suivis"
                  value={notifications.newChapters}
                  onChange={(value) => setNotifications({ ...notifications, newChapters: value })}
                />
                <NotificationRow
                  label="Réponses et commentaires"
                  value={notifications.comments}
                  onChange={(value) => setNotifications({ ...notifications, comments: value })}
                />
                <NotificationRow
                  label="Retours du coach"
                  value={notifications.coaching}
                  onChange={(value) => setNotifications({ ...notifications, coaching: value })}
                />
                <NotificationRow
                  label="Progression et objectifs"
                  value={notifications.progress}
                  onChange={(value) => setNotifications({ ...notifications, progress: value })}
                />
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {step > 0 ? (
            <Button
              label="Retour"
              variant="ghost"
              onPress={() => setStep(step - 1)}
              style={styles.backButton}
            />
          ) : null}
          <Button
            label={step === 3 ? "Entrer dans mon atelier" : "Continuer"}
            icon={step === 3 ? "sparkles-outline" : "arrow-forward"}
            size="lg"
            loading={complete.isPending}
            onPress={next}
            style={styles.nextButton}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function OptionCard({
  selected,
  icon,
  title,
  body,
  onPress,
}: {
  selected: boolean;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && { opacity: 0.82 },
      ]}
    >
      <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
        <Ionicons
          name={icon}
          size={19}
          color={selected ? palette.nightDeep : theme.gold}
        />
      </View>
      <View style={styles.optionText}>
        <Text variant="bodyStrong" color={selected ? theme.goldBright : theme.textPrimary}>
          {title}
        </Text>
        <Text variant="caption" color={theme.textMuted}>
          {body}
        </Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

function NotificationRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.notificationRow}>
      <Text variant="caption" color={theme.textSecondary} style={styles.notificationLabel}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "rgba(147,138,124,0.3)", true: "rgba(197,164,106,0.55)" }}
        thumbColor={value ? palette.goldBright : palette.parchmentDeep}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.nightDeep },
  loading: { flex: 1, backgroundColor: palette.nightDeep },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  brand: { letterSpacing: 4, fontSize: 12 },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  heading: {
    gap: spacing[3],
    paddingTop: spacing[6],
    paddingBottom: spacing[5],
  },
  options: { gap: spacing[3] },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: spacing[4],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.2)",
    backgroundColor: "rgba(28,40,59,0.7)",
    minHeight: 78,
  },
  optionSelected: {
    borderColor: "rgba(197,164,106,0.75)",
    backgroundColor: "rgba(197,164,106,0.09)",
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconSelected: {
    backgroundColor: palette.gold,
    borderColor: palette.gold,
  },
  optionText: { flex: 1, gap: 3 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: palette.gold },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.gold },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  stepThree: { gap: spacing[6] },
  notifications: {
    gap: spacing[2],
    padding: spacing[4],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.18)",
    backgroundColor: "rgba(28,40,59,0.55)",
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: touchTarget.minimum,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(197,164,106,0.14)",
    paddingTop: 6,
  },
  notificationLabel: { flex: 1 },
  footer: {
    flexDirection: "row",
    gap: spacing[3],
    paddingHorizontal: 20,
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(197,164,106,0.18)",
    backgroundColor: "rgba(11,17,28,0.92)",
  },
  backButton: { flex: 1 },
  nextButton: { flex: 1.7 },
});
