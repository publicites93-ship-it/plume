import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AuthShell, Button, InlineNotice, Text } from "@/components";
import { trpc } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { theme } from "@/theme";

export default function VerificationSentScreen() {
  const { email, sent } = useLocalSearchParams<{ email?: string; sent?: string }>();
  const router = useRouter();
  const resend = trpc.auth.resendVerification.useMutation();
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1_000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function onResend() {
    setError(null);
    setNotice(null);
    if (!email) {
      setError("Adresse e-mail manquante. Revenez à l'inscription.");
      return;
    }
    try {
      await resend.mutateAsync({ email });
      setCooldown(60);
      setNotice("Un nouvel e-mail vient d'être envoyé. Vérifiez aussi les indésirables.");
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <AuthShell
      eyebrow="Dernière étape"
      title="Vérifiez votre boîte mail"
      subtitle={
        email
          ? `Un lien de confirmation a été envoyé à ${email}. Il est valable 24 heures et ne peut servir qu'une fois.`
          : "Un lien de confirmation vous a été envoyé. Il est valable 24 heures et ne peut servir qu'une fois."
      }
      footer={
        <View style={{ gap: 10 }}>
          <Text variant="caption" color={theme.textMuted} align="center">
            Vous n'avez rien reçu ? Vérifiez le dossier des indésirables, puis demandez un nouvel
            envoi.
          </Text>
          <Button
            label={cooldown > 0 ? `Renvoyer dans ${cooldown} s` : "Renvoyer l'e-mail"}
            variant="secondary"
            fullWidth
            loading={resend.isPending}
            disabled={cooldown > 0 || !email}
            onPress={onResend}
          />
          <Button
            label="J'ai vérifié, me connecter"
            variant="ghost"
            fullWidth
            onPress={() => router.replace("/connexion")}
          />
        </View>
      }
    >
      {sent === "0" ? (
        <InlineNotice tone="warning" title="Envoi à confirmer">
          Le compte a bien été créé, mais l'e-mail n'a pas pu être envoyé. Utilisez le bouton
          « Renvoyer l'e-mail » ci-dessous.
        </InlineNotice>
      ) : null}
      {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
      {notice ? <InlineNotice tone="success">{notice}</InlineNotice> : null}
      <InlineNotice tone="info">
        Le lien ouvre l'application Plume. Si votre téléphone ne l'ouvre pas, utilisez le lien de
        secours présent dans l'e-mail.
      </InlineNotice>
    </AuthShell>
  );
}
