import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { PASSWORD_MIN_LENGTH, spacing } from "@plume/shared";
import {
  AuthShell,
  Button,
  Checkbox,
  InlineNotice,
  Input,
  Text,
} from "@/components";
import { queryClient, SERVER_WAKE_MESSAGE, trpc } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { theme } from "@/theme";

export default function SignUpScreen() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const signUp = trpc.auth.signUp.useMutation();
  const [pseudonym, setPseudonym] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slowServer, setSlowServer] = useState(false);

  useEffect(() => {
    if (!signUp.isPending) {
      setSlowServer(false);
      return;
    }
    const timer = setTimeout(() => setSlowServer(true), 5_000);
    return () => clearTimeout(timer);
  }, [signUp.isPending]);

  async function submit() {
    setError(null);
    if (pseudonym.trim().length < 3) {
      setError("Choisissez un pseudonyme d'au moins 3 caractères.");
      return;
    }
    if (!email.trim().includes("@")) {
      setError("Indiquez une adresse e-mail valide.");
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`);
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (!accepted) {
      setError("Vous devez accepter les conditions d'utilisation.");
      return;
    }
    try {
      const result = await signUp.mutateAsync({
        pseudonym: pseudonym.trim(),
        email: email.trim(),
        password,
        acceptedTerms: true,
      });
      if (result.verificationRequired) {
        router.replace({
          pathname: "/verification-envoyee",
          params: { email: email.trim(), sent: result.emailSent ? "1" : "0" },
        });
        return;
      }
      if (!result.tokens) {
        setError("Le compte a été créé, mais la session n'a pas pu être ouverte. Connectez-vous.");
        return;
      }
      await setSession(result.tokens);
      await queryClient.invalidateQueries();
      router.replace("/onboarding");
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <AuthShell
      eyebrow="Premier feuillet"
      title="Ouvrir un atelier"
      subtitle="Un compte suffit pour écrire en privé, lire la bibliothèque et suivre votre progression."
      footer={
        <View style={styles.footer}>
          <Text variant="caption" color={theme.textMuted} align="center">
            Déjà un manuscrit en cours ?
          </Text>
          <Button
            label="Se connecter"
            variant="ghost"
            onPress={() => router.replace("/connexion")}
          />
        </View>
      }
    >
      {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
      {slowServer ? (
        <InlineNotice tone="warning">{SERVER_WAKE_MESSAGE}</InlineNotice>
      ) : null}

      <Input
        label="Pseudonyme d'auteur"
        required
        value={pseudonym}
        onChangeText={setPseudonym}
        placeholder="Le nom qui signera vos histoires"
        autoCapitalize="words"
        maxLength={32}
        hint="Entre 3 et 32 caractères. Il sera public si vous publiez."
      />
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
        hint="Utilisez une adresse à laquelle vous avez accès : elle sécurise votre compte."
      />
      <Input
        label="Mot de passe"
        required
        value={password}
        onChangeText={setPassword}
        placeholder="Au moins 6 caractères"
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        hint="6 caractères minimum."
      />
      <Input
        label="Confirmer le mot de passe"
        required
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Retapez le mot de passe"
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Checkbox
        checked={accepted}
        onToggle={() => setAccepted((value) => !value)}
        label="J'accepte les conditions d'utilisation et la politique de confidentialité. Mes manuscrits restent privés par défaut et je peux exporter ou supprimer mes données."
      />

      <Button
        label="Créer mon atelier"
        icon="create-outline"
        size="lg"
        fullWidth
        loading={signUp.isPending}
        onPress={submit}
      />

    </AuthShell>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: spacing[2],
  },
});
