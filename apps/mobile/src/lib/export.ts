import { Platform, Share } from "react-native";

/**
 * Partage un fichier texte. Sur mobile, le fichier est écrit dans le dossier
 * documentaire puis confié au partage natif. Sur le web, un téléchargement
 * classique est déclenché.
 */
export async function shareTextFile(options: {
  filename: string;
  mimeType: string;
  content: string;
  dialogTitle?: string;
}): Promise<"shared" | "downloaded" | "unavailable"> {
  if (Platform.OS === "web") {
    const scope = globalThis as unknown as {
      document?: {
        createElement: (tag: string) => {
          href: string;
          download: string;
          click: () => void;
          style: { display: string };
        };
        body: { appendChild: (node: unknown) => void; removeChild: (node: unknown) => void };
      };
      Blob?: typeof Blob;
      URL?: { createObjectURL: (blob: Blob) => string; revokeObjectURL: (url: string) => void };
    };
    if (!scope.document || !scope.Blob || !scope.URL) return "unavailable";
    const blob = new scope.Blob([options.content], { type: options.mimeType });
    const url = scope.URL.createObjectURL(blob);
    const anchor = scope.document.createElement("a");
    anchor.href = url;
    anchor.download = options.filename;
    anchor.style.display = "none";
    scope.document.body.appendChild(anchor);
    anchor.click();
    scope.document.body.removeChild(anchor);
    scope.URL.revokeObjectURL(url);
    return "downloaded";
  }

  try {
    const FileSystem = await import("expo-file-system/legacy");
    const Sharing = await import("expo-sharing");
    const safeName = options.filename.replace(/[^\p{L}\p{N}._-]/gu, "_");
    const uri = `${FileSystem.documentDirectory ?? ""}${safeName}`;
    await FileSystem.writeAsStringAsync(uri, options.content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: options.mimeType,
        dialogTitle: options.dialogTitle ?? "Partager le fichier",
        UTI: options.mimeType === "text/markdown" ? "net.daringfireball.markdown" : "public.plain-text",
      });
      return "shared";
    }
    await Share.share({ message: options.content, title: options.filename });
    return "shared";
  } catch {
    return "unavailable";
  }
}
