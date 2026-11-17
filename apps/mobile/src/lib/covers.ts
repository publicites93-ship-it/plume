import type { ImageURISource } from "react-native";
import { API_URL } from "./api";
import { getAccessToken } from "./auth";

/** Racine HTTP de l'API (sans /trpc), pour les fichiers comme les couvertures. */
const API_ORIGIN = API_URL.replace(/\/trpc\/?$/, "");

/**
 * Source d'image d'une couverture. Le jeton est joint pour qu'un auteur voie la
 * couverture d'une histoire encore privée ; les couvertures publiques n'en ont pas besoin.
 */
export function coverImageSource(coverAssetUrl?: string | null): ImageURISource | null {
  if (!coverAssetUrl) return null;
  const uri = coverAssetUrl.startsWith("http") ? coverAssetUrl : `${API_ORIGIN}${coverAssetUrl}`;
  const token = getAccessToken();
  return token ? { uri, headers: { Authorization: `Bearer ${token}` } } : { uri };
}

export type PickedCover = { base64: string; previewUri: string } | null;

/**
 * Ouvre le sélecteur de photos du système (aucune permission requise sur
 * Android récent), recadre au format livre 2:3, puis réduit l'image à
 * 600 × 900 px en JPEG pour un envoi léger.
 */
export async function pickCoverImage(): Promise<PickedCover> {
  // Modules natifs chargés à la demande (et non au démarrage de l'appli, car
  // Cover est affiché partout) : en cas de souci natif, seul ce bouton échoue.
  const ImagePicker = require("expo-image-picker") as typeof import("expo-image-picker");
  const ImageManipulator = require("expo-image-manipulator") as typeof import("expo-image-manipulator");
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [2, 3],
    quality: 1,
  });
  if (result.canceled || !result.assets[0]) return null;
  const context = ImageManipulator.ImageManipulator.manipulate(result.assets[0].uri, {
    maxWidth: 1800,
    maxHeight: 2700,
  });
  context.resize({ width: 600, height: 900 });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    format: ImageManipulator.SaveFormat.JPEG,
    compress: 0.8,
    base64: true,
  });
  if (!saved.base64) return null;
  return { base64: saved.base64, previewUri: saved.uri };
}
