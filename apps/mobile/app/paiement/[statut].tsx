import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AuthShell, Button, InlineNotice } from "@/components";
import { refreshPlanSoon } from "@/lib/billing";

const MESSAGES: Record<string, { title: string; text: string; tone: "success" | "info" }> = {
  succes: {
    title: "Merci !",
    text: "Votre paiement est confirmé. Votre formule s'active dans quelques secondes.",
    tone: "success",
  },
  annule: { title: "Paiement annulé", text: "Aucun débit n'a été effectué.", tone: "info" },
  retour: { title: "Abonnement mis à jour", text: "Vos changements sont pris en compte.", tone: "info" },
};

/** Point d'arrivée du lien plume://paiement/… quand l'onglet de paiement n'a pas pu l'intercepter. */
export default function PaymentReturnScreen() {
  const { statut } = useLocalSearchParams<{ statut?: string }>();
  const router = useRouter();
  const message = MESSAGES[String(statut)] ?? MESSAGES.retour!;

  useEffect(() => {
    refreshPlanSoon();
  }, []);

  return (
    <AuthShell eyebrow="Abonnement" title={message.title} subtitle={message.text}>
      <InlineNotice tone={message.tone}>
        Le paiement est géré par Stripe : Plume ne voit ni ne conserve vos données bancaires.
      </InlineNotice>
      <Button label="Revenir à mon atelier" icon="arrow-forward" onPress={() => router.replace("/")} />
    </AuthShell>
  );
}
