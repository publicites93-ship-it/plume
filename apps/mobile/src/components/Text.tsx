import { useMemo } from "react";
import {
  Text as RNText,
  StyleSheet,
  type TextProps as RNTextProps,
  type TextStyle,
} from "react-native";
import { fontSizes, lineHeights, typography } from "@plume/shared";
import { useUiStore } from "@/lib/ui";
import { theme } from "@/theme";

export type TextVariant =
  | "display"
  | "title"
  | "heading"
  | "subheading"
  | "body"
  | "bodyStrong"
  | "literary"
  | "literaryItalic"
  | "quote"
  | "caption"
  | "label";

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  align?: TextStyle["textAlign"];
  /** Désactive le réglage global de taille (ex. titres de couverture). */
  fixed?: boolean;
  italic?: boolean;
}

const variantStyles: Record<TextVariant, TextStyle> = {
  display: {
    fontFamily: typography.display,
    fontSize: fontSizes["3xl"],
    lineHeight: fontSizes["3xl"] * lineHeights.tight,
    letterSpacing: -0.4,
  },
  title: {
    fontFamily: typography.display,
    fontSize: fontSizes.xl,
    lineHeight: fontSizes.xl * lineHeights.tight,
    letterSpacing: -0.2,
  },
  heading: {
    fontFamily: typography.display,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * lineHeights.snug,
  },
  subheading: {
    fontFamily: typography.uiSemibold,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.snug,
  },
  body: {
    fontFamily: typography.ui,
    fontSize: fontSizes.base,
    lineHeight: fontSizes.base * lineHeights.normal,
  },
  bodyStrong: {
    fontFamily: typography.uiMedium,
    fontSize: fontSizes.base,
    lineHeight: fontSizes.base * lineHeights.normal,
  },
  literary: {
    fontFamily: typography.literary,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.reading,
  },
  literaryItalic: {
    fontFamily: typography.literaryItalic,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.reading,
  },
  quote: {
    fontFamily: typography.literaryItalic,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.relaxed,
  },
  caption: {
    fontFamily: typography.ui,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.normal,
  },
  label: {
    fontFamily: typography.uiSemibold,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.4,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
};

/** Les titres suivent la préférence de taille, mais plus modérément. */
function scaleFor(variant: TextVariant, scale: number): number {
  if (scale === 1) return 1;
  if (variant === "display" || variant === "title" || variant === "heading") {
    return 1 + (scale - 1) * 0.45;
  }
  if (variant === "label" || variant === "caption") return 1 + (scale - 1) * 0.6;
  return scale;
}

export function Text({
  variant = "body",
  color,
  align,
  fixed,
  italic,
  style,
  ...rest
}: TextProps) {
  const fontScale = useUiStore((state) => state.fontScale);
  const merged = useMemo(() => {
    const base = variantStyles[variant];
    const scale = fixed ? 1 : scaleFor(variant, fontScale);
    return [
      base,
      scale !== 1
        ? {
            fontSize: (base.fontSize ?? 15) * scale,
            lineHeight: (base.lineHeight ?? 22) * scale,
          }
        : null,
      { color: color ?? theme.textPrimary },
      align ? { textAlign: align } : null,
      italic ? { fontFamily: typography.literaryItalic } : null,
      style,
    ];
  }, [variant, fontScale, fixed, color, align, italic, style]);

  return <RNText {...rest} style={merged} />;
}

export const textStyles = StyleSheet.create({
  gold: { color: theme.gold },
});
