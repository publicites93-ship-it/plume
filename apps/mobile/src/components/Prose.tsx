import { Fragment, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { typography } from "@plume/shared";
import { Text } from "./Text";
import { useUiStore } from "@/lib/ui";

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
}: {
  value: string;
  color: string;
  size: number;
  lineHeight: number;
  italic?: boolean;
}) {
  const parts = useMemo(
    () => value.split(/(\*\*[^*]+\*\*|_[^_\n]+_)/g).filter((part) => part.length > 0),
    [value],
  );
  return (
    <Text
      selectable
      style={{
        color,
        fontFamily: italic ? typography.literaryItalic : typography.literary,
        fontSize: size,
        lineHeight,
      }}
    >
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <Text key={index} style={styles.bold}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part.startsWith("_") && part.endsWith("_")) {
          return (
            <Text key={index} style={styles.italic}>
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
}: {
  content: string;
  color: string;
  mutedColor?: string;
  baseSize?: number;
}) {
  const fontScale = useUiStore((state) => state.fontScale);
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
        const heading = /^(#{1,3})\s+/.exec(block);
        if (heading) {
          return (
            <Text
              key={index}
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
          <View key={index} style={quote ? styles.quote : undefined}>
            <InlineMarkdown
              value={quote ? block.replace(/^>\s?/gm, "") : block}
              color={color}
              size={size}
              lineHeight={size * 1.72}
              italic={quote}
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
  bold: {
    fontFamily: typography.literaryMedium,
  },
  italic: {
    fontFamily: typography.literaryItalic,
  },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: "rgba(197,164,106,0.5)",
    paddingLeft: 14,
  },
});
