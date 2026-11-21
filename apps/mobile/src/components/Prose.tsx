import { Fragment, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { typography } from "@plume/shared";
import { Text } from "./Text";
import { useUiStore, type ReadingFont } from "@/lib/ui";

const FONTS: Record<ReadingFont, { regular: string; italic: string; bold: string; synthItalic: boolean }> = {
  serif: {
    regular: typography.literary,
    italic: typography.literaryItalic,
    bold: typography.literaryMedium,
    synthItalic: false,
  },
  // Inter n'est chargée qu'en romain : l'italique est simulé par le système.
  sans: { regular: typography.ui, italic: typography.ui, bold: typography.uiSemibold, synthItalic: true },
};

/**
 * Rendu de lecture volontairement simple : paragraphes, gras (`**`) et
 * italique (`_`). L'éditeur de la phase 1 enregistre ces marqueurs Markdown
 * légers plutôt qu'un format riche propriétaire.
 */
function InlineMarkdown({
  value,
  color,
  size,
  lineHeight,
  italic,
  font,
}: {
  value: string;
  color: string;
  size: number;
  lineHeight: number;
  italic?: boolean;
  font: ReadingFont;
}) {
  const family = FONTS[font];
  const parts = useMemo(
    () => value.split(/(\*\*[^*]+\*\*|_[^_\n]+_)/g).filter((part) => part.length > 0),
    [value],
  );
  return (
    <Text
      selectable
      style={{
        color,
        fontFamily: italic ? family.italic : family.regular,
        fontStyle: italic && family.synthItalic ? "italic" : "normal",
        fontSize: size,
        lineHeight,
      }}
    >
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <Text key={index} style={{ fontFamily: family.bold }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part.startsWith("_") && part.endsWith("_")) {
          return (
            <Text
              key={index}
              style={{ fontFamily: family.italic, fontStyle: family.synthItalic ? "italic" : "normal" }}
            >
              {part.slice(1, -1)}
            </Text>
          );
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </Text>
  );
}

export function Prose({
  content,
  color,
  mutedColor,
  baseSize = 18,
  onBlockLayout,
}: {
  content: string;
  color: string;
  mutedColor?: string;
  baseSize?: number;
  onBlockLayout?: (index: number, top: number, height: number) => void;
}) {
  const fontScale = useUiStore((state) => state.fontScale);
  const readingFont = useUiStore((state) => state.readingFont);
  const size = baseSize * fontScale;
  const blocks = useMemo(
    () =>
      content
        .replace(/\r\n/g, "\n")
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean),
    [content],
  );

  if (blocks.length === 0) {
    return (
      <Text style={{ color: mutedColor ?? color, fontStyle: "italic", fontSize: size * 0.9 }}>
        Ce chapitre est encore vide.
      </Text>
    );
  }

  return (
    <View style={styles.blocks}>
      {blocks.map((block, index) => {
        const layout = onBlockLayout ? (e: import("react-native").LayoutChangeEvent) => {
          const { y, height } = e.nativeEvent.layout;
          onBlockLayout(index, y, height);
        } : undefined;
        const heading = /^(#{1,3})\s+/.exec(block);
        if (heading) {
          return (
            <Text
              key={index}
              onLayout={layout}
              variant="heading"
              color={color}
              style={styles.heading}
            >
              {block.replace(/^#{1,3}\s+/, "")}
            </Text>
          );
        }
        const quote = block.startsWith("> ");
        return (
          <View key={index} onLayout={layout} style={quote ? styles.quote : undefined}>
            <InlineMarkdown
              value={quote ? block.replace(/^>\s?/gm, "") : block}
              color={color}
              size={size}
              lineHeight={size * 1.72}
              italic={quote}
              font={readingFont}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  blocks: {
    gap: 18,
  },
  heading: {
    marginTop: 6,
  },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: "rgba(197,164,106,0.5)",
    paddingLeft: 14,
  },
});
