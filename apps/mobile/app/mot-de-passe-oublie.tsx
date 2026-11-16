import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { AuthShell, Button, InlineNotice, Input, Text } from "@/components";
import { trpc } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { theme } from "@/theme";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const requestReset = trpc.auth.requestPasswordReset.useMutation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!email.trim().includes("@")) {
      setError("Indiquez une adresse e-mail valide.");
      return;
    }
    try {
      await requestReset.mutateAsync({ email: email.trim() });
      setSent(true);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <AuthShell
      eyebrow="Accès au compte"
      title="Mot de passe oublié"
      subtitle="Indiquez l'adresse de votre compte. Si elle existe, nous envoyons un lien valable 1 heure."
      footer={
        <Button
          label="Revenir à la connexion"
          variant="ghost"
          fullWidth
          onPress={() => router.replace("/connexion")}
        />
      }
    >
      {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
      {sent ? (
        <View style={{ gap: 14 }}>
          <InlineNotice tone="success" title="Demande envoyée">
            Si un compte correspond à cette adresse, un e-mail de réinitialisation vient d'être
            envoyé. Pensez à vérifier les indésirables.
          </InlineNotice>
          <Text variant="caption" color={theme.textMuted} align="center">
            Le lien est à usage unique et expire après 1 heure. Toutes les autres sessions seront
            déconnectées après le changement de mot de passe.
          </Text>
        </View>
      ) : (
        <>
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
            returnKeyType="send"
            onSubmitEditing={submit}
          />
          <Button
            label="Envoyer le lien"
            icon="mail-outline"
            size="lg"
            fullWidth
            loading={requestReset.isPending}
            onPress={submit}
          />
        </>
      )}
    </AuthShell>
  );
}
