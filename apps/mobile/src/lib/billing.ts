import { queryClient } from "./api";

/**
 * Ouvre une page Stripe (paiement ou gestion d'abonnement) dans un onglet du
 * navigateur. L'onglet se referme quand la page de retour renvoie vers
 * plume://paiement/… ; la formule est ensuite relue plusieurs fois, car l'avis
 * de Stripe (webhook) peut arriver quelques secondes après le paiement.
 */
export async function openStripePage(url: string): Promise<void> {
  // Chargé à la demande : un module natif absent ne peut pas empêcher l'appli de démarrer.
  const WebBrowser = require("expo-web-browser") as typeof import("expo-web-browser");
  await WebBrowser.openAuthSessionAsync(url, "plume://paiement");
  refreshPlanSoon();
}

export function refreshPlanSoon(): void {
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: [["auth", "me"]] });
    void queryClient.invalidateQueries({ queryKey: [["billing", "status"]] });
  };
  refresh();
  setTimeout(refresh, 3_000);
  setTimeout(refresh, 8_000);
}
