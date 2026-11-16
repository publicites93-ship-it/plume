import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AuthShell, Button, InlineNotice, Input } from "@/components";
import { trpc } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const reset = trpc.auth.resetPassword.useMutation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    if (!token) {
      setError("Ce lien ne contient pas de jeton de réinitialisation.");
      return;
    }
    if (
      password.length < 12 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      setError(
        "Le mot de passe doit contenir au moins 12 caractères, une majuscule, une minuscule et un chiffre.",
      );
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    try {
      await reset.mutateAsync({ token, newPassword: password });
      setDone(true);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <AuthShell
      eyebrow="Nouveau mot de passe"
      title={done ? "Mot de passe modifié" : "Choisir un mot de passe"}
      subtitle={
        done
          ? "Toutes les autres sessions ont été déconnectées. Reconnectez-vous avec votre nouveau mot de passe."
          : "Choisissez un mot de passe d'au moins 12 caractères, avec une majuscule, une minuscule et un chiffre."
      }
      footer={
        <Button
          label={done ? "Se connecter" : "Revenir à la connexion"}
          variant={done ? "primary" : "ghost"}
          fullWidth
          onPress={() => router.replace("/connexion")}
        />
      }
    >
      {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
      {done ? (
        <InlineNotice tone="success">Votre mot de passe a bien été enregistré.</InlineNotice>
      ) : (
        <>
          <Input
            label="Nouveau mot de passe"
            required
            value={password}
            onChangeText={setPassword}
            placeholder="Au moins 12 caractères"
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            hint="12 caractères minimum, avec une majuscule, une minuscule et un chiffre."
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
          <Button
            label="Enregistrer le mot de passe"
            icon="checkmark-outline"
            size="lg"
            fullWidth
            loading={reset.isPending}
            onPress={submit}
          />
        </>
      )}
    </AuthShell>
  );
}
