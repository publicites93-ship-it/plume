import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { radii, spacing } from "@plume/shared";
import { Button, InlineNotice, Text } from "@/components";
import { trpc, queryClient } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { toast } from "@/lib/toast";
import { palette, theme } from "@/theme";

const features = [
  {
    icon: "lock-closed-outline" as const,
    title: "Vos manuscrits restent privés",
    body: "Brouillons, notes et versions sont visibles de vous seul. Rien n'est publié sans votre geste.",
  },
  {
    icon: "compass-outline" as const,
    title: "Un coach qui enseigne",
    body: "Des diagnostics argumentés et des exercices. Jamais de texte écrit à votre place.",
  },
  {
    icon: "library-outline" as const,
    title: "Une bibliothèque vivante",
    body: "Lisez, suivez des auteurs et retrouvez vos histoires là où vous les avez laissées.",
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  const [demoLoading, setDemoLoading] = useState<"auteur" | "lecteur" | null>(null);
  const signIn = trpc.auth.signIn.useMutation();

  async function enterDemo(kind: "auteur" | "lecteur") {
    setDemoLoading(kind);
    try {
      const result = await signIn.mutateAsync({
        email: kind === "auteur" ? "auteur@plume.app" : "lecteur@plume.app",
        password: "Plume2026",
      });
      await setSession(result.tokens);
      await queryClient.invalidateQueries();
      router.replace("/");
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setDemoLoading(null);
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0B111C", "#101827", "#162133", "#0B111C"]}
        locations={[0, 0.35, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.stars}>
        {[
          [18, 80, 1.4],
          [44, 140, 1],
          [82, 64, 1.8],
          [120, 190, 0.9],
          [280, 110, 1.2],
          [320, 220, 1.6],
          [250, 60, 0.8],
        ].map(([left, top, size], index) => (
          <View
            key={index}
            style={{
              position: "absolute",
              left: `${(Number(left) / 360) * 100}%`,
              top: Number(top),
              width: Number(size) * 2,
              height: Number(size) * 2,
              borderRadius: Number(size),
              backgroundColor: palette.goldBright,
              opacity: 0.35,
            }}
          />
        ))}
      </View>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.hero}>
          <Svg width={168} height={212} viewBox="0 0 168 212" style={styles.arch}>
            <Path
              d="M20 204 L20 88 C20 52 48 26 84 10 C120 26 148 52 148 88 L148 204"
              stroke={palette.gold}
              strokeWidth={1.1}
              fill="none"
              opacity={0.7}
            />
            <Path
              d="M34 204 L34 90 C34 61 57 38 84 24 C111 38 134 61 134 90 L134 204"
              stroke={palette.gold}
              strokeWidth={0.5}
              fill="none"
              opacity={0.4}
            />
            <Line x1={10} y1={204} x2={158} y2={204} stroke={palette.gold} strokeWidth={1} opacity={0.6} />
            <Path
              d="M70 122 C76 100 92 82 112 74 C103 92 94 110 78 126 C75 130 71 128 70 122 Z"
              stroke={palette.goldBright}
              strokeWidth={1}
              fill="none"
              opacity={0.9}
            />
            <Line x1={64} y1={136} x2={79} y2={123} stroke={palette.goldBright} strokeWidth={1} opacity={0.9} />
            <Circle cx={84} cy={58} r={2.2} fill={palette.goldBright} opacity={0.9} />
            <Circle cx={56} cy={88} r={1.2} fill={palette.gold} opacity={0.6} />
            <Circle cx={114} cy={96} r={1.4} fill={palette.gold} opacity={0.55} />
          </Svg>

          <Text variant="label" color={theme.gold} style={styles.kicker} fixed>
            Bibliothèque & atelier d'écriture
          </Text>
          <Text variant="display" color={palette.parchment} style={styles.wordmark} fixed>
            PLUME
          </Text>
          <View style={styles.rule}>
            <View style={styles.ruleLine} />
            <View style={styles.ruleDiamond} />
            <View style={styles.ruleLine} />
          </View>
          <Text variant="quote" color={theme.textSecondary} align="center" style={styles.tagline}>
            Les histoires ne s'écrivent pas à votre place.{"\n"}Elles apprennent à vous reconnaître.
          </Text>
        </View>

        <View style={styles.features}>
          {features.map((feature) => (
            <View key={feature.title} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={17} color={theme.goldBright} />
              </View>
              <View style={styles.featureText}>
                <Text variant="bodyStrong" color={palette.parchment}>
                  {feature.title}
                </Text>
                <Text variant="caption" color={theme.textMuted}>
                  {feature.body}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          {session ? (
            <Button
              label="Reprendre la lecture"
              icon="arrow-forward"
              size="lg"
              fullWidth
              onPress={() => router.replace("/")}
            />
          ) : (
            <>
              <Button
                label="Entrer dans la bibliothèque"
                icon="key-outline"
                size="lg"
                fullWidth
                onPress={() => router.push("/connexion")}
              />
              <Button
                label="Créer mon atelier"
                variant="secondary"
                size="lg"
                fullWidth
                onPress={() => router.push("/inscription")}
              />
            </>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Essayer avec un compte de démonstration"
            onPress={() => enterDemo("auteur")}
            disabled={demoLoading !== null}
            style={({ pressed }) => [styles.demo, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="flask-outline" size={14} color={theme.textMuted} />
            <Text variant="caption" color={theme.textMuted}>
              {demoLoading === "auteur"
                ? "Ouverture du compte démo…"
                : "Découvrir avec le compte auteur de démonstration"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.legal}>
          <InlineNotice tone="warning" title="Transparence">
            Version de démonstration. Le coach utilise un moteur pédagogique simulé et les envois
            d'e-mail ne sont pas actifs. Aucun paiement n'est demandé.
          </InlineNotice>
          <Text variant="caption" color={theme.textMuted} align="center" style={styles.legalText}>
            En continuant, vous acceptez que vos manuscrits privés restent chiffrés en transit et
            accessibles à vous seul. Les conditions complètes seront publiées avant la mise en
            production.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.nightDeep,
  },
  stars: {
    position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  hero: {
    alignItems: "center",
    paddingTop: 18,
  },
  arch: {
    opacity: 0.95,
    marginBottom: -6,
  },
  kicker: {
    marginTop: 4,
    letterSpacing: 2.4,
    textAlign: "center",
  },
  wordmark: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 54,
    lineHeight: 64,
    letterSpacing: 9,
    marginTop: 2,
    marginLeft: 9,
  },
  rule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: 190,
    marginVertical: 10,
  },
  ruleLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(197,164,106,0.5)",
  },
  ruleDiamond: {
    width: 6,
    height: 6,
    backgroundColor: palette.gold,
    transform: [{ rotate: "45deg" }],
  },
  tagline: {
    maxWidth: 330,
    fontSize: 16,
  },
  features: {
    gap: 14,
    paddingVertical: 18,
  },
  feature: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.28)",
    backgroundColor: "rgba(197,164,106,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  actions: {
    gap: 10,
  },
  demo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 44,
    marginTop: 2,
  },
  legal: {
    gap: 8,
    paddingTop: 14,
    paddingBottom: 6,
  },
  legalText: {
    fontSize: 10.5,
    lineHeight: 15,
    paddingHorizontal: 6,
  },
});
