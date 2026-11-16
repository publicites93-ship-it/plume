import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AuthShell, Button, InlineNotice, LoadingState, Text } from "@/components";
import { queryClient, trpc } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { theme } from "@/theme";

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const verify = trpc.auth.verifyEmail.useMutation();
  const started = useRef(false);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) {
      setStatus("error");
      setError("Ce lien ne contient pas de jeton de vérification.");
      return;
    }
    void (async () => {
      try {
        const result = await verify.mutateAsync({ token });
        await setSession(result.tokens);
        await queryClient.invalidateQueries();
        setStatus("success");
      } catch (cause) {
        setStatus("error");
        setError(errorMessage(cause));
      }
    })();
  }, [setSession, token, verify]);

  return (
    <AuthShell
      eyebrow="Confirmation"
      title={status === "success" ? "Adresse vérifiée" : "Vérification de l'adresse"}
      subtitle={
        status === "success"
          ? "Votre compte est actif. Vous pouvez reprendre votre atelier."
          : "Nous vérifions le lien reçu par e-mail."
      }
      showBack={status !== "success"}
      footer={
        status === "success" ? (
          <Button
            label="Continuer"
            icon="arrow-forward"
            fullWidth
            onPress={() => router.replace("/")}
          />
        ) : (
          <View style={{ gap: 10 }}>
            <Button
              label="Aller à la connexion"
              variant="ghost"
              fullWidth
              onPress={() => router.replace("/connexion")}
            />
            <Text variant="caption" color={theme.textMuted} align="center">
              Si le lien a déjà été utilisé sur le web, connectez-vous simplement avec votre
              adresse e-mail.
            </Text>
          </View>
        )
      }
    >
      {status === "loading" ? <LoadingState label="Vérification du lien…" /> : null}
      {status === "success" ? (
        <InlineNotice tone="success">Votre adresse e-mail est maintenant confirmée.</InlineNotice>
      ) : null}
      {status === "error" ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
    </AuthShell>
  );
}
