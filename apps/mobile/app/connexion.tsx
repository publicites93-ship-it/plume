import { useEffect, useState } from "react";
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
import { queryClient, SERVER_WAKE_MESSAGE, trpc } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { errorMessage, isEmailNotVerified } from "@/lib/errors";
import { theme } from "@/theme";

export default function SignInScreen() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const signIn = trpc.auth.signIn.useMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [slowServer, setSlowServer] = useState(false);

  useEffect(() => {
    if (!signIn.isPending) {
      setSlowServer(false);
      return;
    }
    const timer = setTimeout(() => setSlowServer(true), 5_000);
    return () => clearTimeout(timer);
  }, [signIn.isPending]);

  async function submit() {
    setError(null);
    setNeedsVerification(false);
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
      setNeedsVerification(isEmailNotVerified(cause));
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
        </View>
      }
    >
      {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
      {needsVerification ? (
        <Button
          label="Renvoyer l'e-mail de vérification"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: "/verification-envoyee",
              params: { email: email.trim(), sent: "0" },
            })
          }
        />
      ) : null}
      {slowServer ? (
        <InlineNotice tone="warning">{SERVER_WAKE_MESSAGE}</InlineNotice>
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
        onPress={() => router.push("/mot-de-passe-oublie")}
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
        vos textes et vérifie les citations qu'il présente.
      </InlineNotice>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: spacing[2],
  },
  forgot: {
    alignSelf: "flex-end",
    minHeight: 44,
    justifyContent: "center",
  },
});
