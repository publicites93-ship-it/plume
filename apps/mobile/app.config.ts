import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Configuration Expo de Plume.
 *
 * Le fichier `app.json` reste la source des valeurs statiques. Ce fichier
 * ajoute deux garanties utiles aux builds EAS :
 *
 * 1. Un build EAS ne peut pas être produit avec une URL d'API absente,
 *    locale ou non HTTPS. Cela évite de livrer un APK qui ne peut joindre
 *    aucun serveur.
 * 2. L'URL publique est exposée dans `extra.apiUrl` pour les diagnostics.
 *
 * En développement local (`expo start`), aucune URL publique n'est exigée :
 * l'API locale et l'émulateur restent utilisables.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  const isEasBuild = process.env.EAS_BUILD === "true";

  if (isEasBuild) {
    if (!apiUrl) {
      throw new Error(
        "EXPO_PUBLIC_API_URL est obligatoire pour un build EAS. Indiquez l'URL HTTPS publique de l'API Plume, par exemple https://api.votre-domaine.fr/trpc.",
      );
    }
    if (!apiUrl.startsWith("https://")) {
      throw new Error(
        "EXPO_PUBLIC_API_URL doit utiliser HTTPS pour un build EAS. Une adresse HTTP locale ou une IP LAN ne fonctionnera pas sur un téléphone.",
      );
    }
    if (/localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|10\.\d+\.\d+\.\d+/i.test(apiUrl)) {
      throw new Error(
        "EXPO_PUBLIC_API_URL ne doit pas pointer vers localhost ni vers une adresse IP privée : le téléphone ne peut pas joindre l'ordinateur de développement.",
      );
    }
  }

  return {
    ...config,
    extra: {
      ...config.extra,
      apiUrl: apiUrl ?? "",
    },
  } as ExpoConfig;
};
