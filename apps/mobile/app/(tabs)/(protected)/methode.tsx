import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SKILLS, spacing } from "@plume/shared";
import {
  Button,
  Card,
  PageHeader,
  Screen,
  SectionHeader,
  SimulationNotice,
  Text,
} from "@/components";
import { trpc } from "@/lib/api";
import { theme } from "@/theme";

const GUARANTEES = [
  {
    icon: "lock-closed-outline" as const,
    title: "Propriété",
    body: "Vos manuscrits privés vous appartiennent. Rien n'est publié par défaut, et aucune ressource privée n'est accessible à un autre compte.",
  },
  {
    icon: "checkmark-circle-outline" as const,
    title: "Vérité des citations",
    body: "Tout extrait présenté comme venant du manuscrit est comparé mot pour mot au texte enregistré. Une citation non vérifiée est retirée, jamais corrigée.",
  },
  {
    icon: "school-outline" as const,
    title: "Honnêteté",
    body: "Un score situe une compétence à un moment donné. Il n'est jamais une note littéraire définitive, et chaque réponse indique son niveau de confiance.",
  },
];

const REFUSALS = [
  "Écrire, réécrire ou poursuivre un passage à votre place.",
  "Inventer une citation, un personnage, un lieu ou un événement absent du texte et de la bible.",
  "Affirmer un fait sur le manuscrit sans l'avoir vérifié.",
  "Attribuer une note littéraire absolue.",
  "Activer un fournisseur IA payant sans votre accord explicite.",
];

const STEPS = [
  "Vous choisissez un chapitre, ou un extrait exact de celui-ci.",
  "Le serveur vérifie la propriété du chapitre, la présence mot pour mot de l'extrait et un minimum de 30 mots.",
  "Une version du texte est figée par un snapshot : l'analyse porte toujours sur un état stable.",
  "Le quota de jetons est vérifié côté serveur, puis le fournisseur répond.",
  "Chaque citation est revérifiée contre le chapitre enregistré avant affichage.",
  "Le diagnostic est enregistré avec ses constats, son score pédagogique et sa confiance.",
];

export default function MethodScreen() {
  const router = useRouter();
  const me = trpc.auth.me.useQuery(undefined);

  return (
    <Screen>
      <PageHeader
        back
        eyebrow="La méthode Plume"
        title="Comment le coach travaille"
        subtitle="Un professeur d'écriture, pas un générateur. Voici ce qu'il fait, ce qu'il refuse, et comment il en rend compte."
      />

      <Card accent style={styles.lead}>
        <Text variant="literary" color={theme.textSecondary}>
          « Un diagnostic ne dit pas si votre texte est bon. Il montre ce que votre texte fait au
          lecteur, avec quels moyens, et ce que vous pourriez essayer ensuite. »
        </Text>
      </Card>

      <SectionHeader title="Trois garanties" eyebrow="La règle" />
      <Card style={styles.listCard}>
        {GUARANTEES.map((item, index) => (
          <View
            key={item.title}
            style={[styles.row, index > 0 && styles.rowSeparated]}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon} size={18} color={theme.goldBright} />
            </View>
            <View style={styles.flex}>
              <Text variant="bodyStrong">{item.title}</Text>
              <Text variant="caption" color={theme.textSecondary}>
                {item.body}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      <SectionHeader title="Ce que le coach refuse" eyebrow="Frontière" />
      <Card style={styles.listCard}>
        {REFUSALS.map((item, index) => (
          <View key={item} style={[styles.row, index > 0 && styles.rowSeparated]}>
            <Ionicons name="checkmark-circle-outline" size={16} color={theme.gold} />
            <Text variant="caption" color={theme.textSecondary} style={styles.flex}>
              {item}
            </Text>
          </View>
        ))}
      </Card>

      <SectionHeader title="Le parcours d'un diagnostic" eyebrow="Étape par étape" />
      <Card style={styles.listCard}>
        {STEPS.map((step, index) => (
          <View key={step} style={[styles.row, index > 0 && styles.rowSeparated]}>
            <View style={styles.stepNumber}>
              <Text variant="label" color={theme.gold}>
                {String(index + 1).padStart(2, "0")}
              </Text>
            </View>
            <Text variant="caption" color={theme.textSecondary} style={styles.flex}>
              {step}
            </Text>
          </View>
        ))}
      </Card>

      <SectionHeader title="Les sept compétences" eyebrow="Repères" />
      <View style={styles.skillList}>
        {SKILLS.map((skill) => (
          <Card
            key={skill.id}
            onPress={() =>
              router.push({ pathname: "/atelier/[slug]", params: { slug: skill.workshopSlug } })
            }
            accessibilityLabel={`Ouvrir l'atelier ${skill.name}`}
            style={styles.skillCard}
          >
            <View style={styles.skillTop}>
              <Text variant="label" color={theme.gold}>
                {String(skill.order).padStart(2, "0")}
              </Text>
              <View style={styles.flex}>
                <Text variant="bodyStrong">{skill.name}</Text>
                <Text variant="caption" color={theme.textMuted}>
                  {skill.tagline}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color={theme.textMuted} />
            </View>
            <Text variant="caption" color={theme.textSecondary} style={styles.skillQuestion}>
              {skill.selfCheck}
            </Text>
          </Card>
        ))}
      </View>

      {me.data?.coach.isSimulation ? (
        <Card style={styles.simulationCard}>
          <SimulationNotice />
        </Card>
      ) : null}

      <Button
        label="Revenir à Apprendre"
        icon="arrow-forward"
        variant="ghost"
        onPress={() => router.back()}
        style={styles.backButton}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { marginBottom: spacing[4] },
  listCard: { gap: 0, marginBottom: spacing[2] },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
    paddingVertical: spacing[3],
  },
  rowSeparated: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  iconWrap: {
    width: 26,
    alignItems: "center",
  },
  stepNumber: {
    width: 26,
    alignItems: "center",
  },
  flex: { flex: 1 },
  skillList: { gap: spacing[2], marginBottom: spacing[4] },
  skillCard: { gap: spacing[2] },
  skillTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
  },
  skillQuestion: { paddingLeft: 26 + spacing[3] },
  simulationCard: { marginBottom: spacing[4] },
  backButton: { alignSelf: "flex-start" },
});
