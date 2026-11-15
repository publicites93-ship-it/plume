import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { spacing } from "@plume/shared";
import {
  AuthShell,
  Button,
  InlineNotice,
  Input,
  Text,
} from "@/components";
import { queryClient, trpc } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { toast } from "@/lib/toast";
import { palette, theme } from "@/theme";

export default function SignInScreen() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const signIn = trpc.auth.signIn.useMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  async function submit() {
    setError(null);
    if (!email.trim().includes("@")) {
      setError("Indiquez une adresse e-mail valide.");
      return;
    }
    if (!password) {
      setError("Le mot de passe est requis.");
      return;
    }
    try {
      const result = await signIn.mutateAsync({ email: email.trim(), password });
      await setSession(result.tokens);
      await queryClient.invalidateQueries();
      router.replace("/");
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function enterDemo() {
    setError(null);
    setDemoLoading(true);
    try {
      const result = await signIn.mutateAsync({
        email: "auteur@plume.app",
        password: "Plume2026",
      });
      await setSession(result.tokens);
      await queryClient.invalidateQueries();
      router.replace("/");
    } catch (cause) {
      toast(errorMessage(cause), "error");
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Votre atelier vous attend"
      title="Rouvrir le manuscrit"
      subtitle="Retrouvez vos histoires, vos notes et l'endroit exact où vous vous êtes arrêté."
      footer={
        <View style={styles.footer}>
          <Text variant="caption" color={theme.textMuted} align="center">
            Pas encore de manuscrit ?
          </Text>
          <Button
            label="Créer un compte"
            variant="ghost"
            onPress={() => router.push("/inscription")}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Essayer le compte de démonstration"
            onPress={enterDemo}
            disabled={demoLoading}
            style={styles.demo}
          >
            <Text variant="caption" color={theme.textMuted}>
              {demoLoading ? "Ouverture…" : "Essayer avec le compte démo (auteur@plume.app)"}
            </Text>
          </Pressable>
        </View>
      }
    >
      {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
      {notice ? (
        <InlineNotice tone="warning" title="Réinitialisation indisponible">
          {notice}
        </InlineNotice>
      ) : null}

      <Input
        label="Adresse e-mail"
        required
        value={email}
        onChangeText={setEmail}
        placeholder="vous@exemple.fr"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        returnKeyType="next"
      />
      <Input
        label="Mot de passe"
        required
        value={password}
        onChangeText={setPassword}
        placeholder="Votre mot de passe"
        secureTextEntry
        textContentType="password"
        autoComplete="current-password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mot de passe oublié"
        onPress={() =>
          setNotice(
            "L'envoi d'e-mails n'est pas configuré dans cette version. La réinitialisation en libre-service sera activée avec un fournisseur d'e-mail vérifié. Contactez l'administrateur de l'instance pour débloquer votre compte.",
          )
        }
        style={styles.forgot}
      >
        <Text variant="caption" color={theme.gold}>
          Mot de passe oublié ?
        </Text>
      </Pressable>

      <Button
        label="Entrer"
        icon="arrow-forward"
        size="lg"
        fullWidth
        loading={signIn.isPending}
        onPress={submit}
      />

      <InlineNotice tone="info">
        Vos manuscrits privés ne sont jamais visibles dans le catalogue. Le coach ne réécrit pas
        vos textes et signale toute analyse simulée.
      </InlineNotice>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: spacing[2],
  },
  demo: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  forgot: {
    alignSelf: "flex-end",
    minHeight: 44,
    justifyContent: "center",
  },
  tag: {
    color: palette.gold,
  },
});
