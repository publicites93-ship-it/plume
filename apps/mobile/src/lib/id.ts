/**
 * Identifiant UUID v4 côté client, utilisé pour l'idempotence des sauvegardes.
 * `crypto.randomUUID` n'existe pas sur toutes les versions d'Android/Expo Go ;
 * ce générateur reste suffisant pour distinguer deux tentatives locales.
 */
export function createMutationId(): string {
  const cryptoObject = globalThis.crypto as
    | { randomUUID?: () => string; getRandomValues?: (values: Uint8Array) => Uint8Array }
    | undefined;
  if (cryptoObject?.randomUUID) {
    try {
      return cryptoObject.randomUUID();
    } catch {
      // continue avec le générateur de secours
    }
  }
  const bytes = new Uint8Array(16);
  if (cryptoObject?.getRandomValues) {
    cryptoObject.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}
