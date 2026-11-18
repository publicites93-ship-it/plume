import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { radii, spacing } from "@plume/shared";
import { palette, theme, withAlpha } from "@/theme";

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  elevated?: boolean;
  accent?: boolean;
  accessibilityLabel?: string;
}

export function Card({
  children,
  onPress,
  style,
  padded = true,
  elevated,
  accent,
  accessibilityLabel,
}: CardProps) {
  const base = [
    styles.card,
    padded && styles.padded,
    elevated && styles.elevated,
    accent && styles.accent,
    style,
  ];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [base, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: withAlpha(theme.surface, 0.92),
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
  },
  padded: {
    padding: spacing[5],
  },
  elevated: {
    backgroundColor: theme.surfaceRaised,
    borderColor: theme.borderStrong,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  accent: {
    borderColor: "rgba(197,164,106,0.42)",
    backgroundColor: "rgba(197,164,106,0.06)",
  },
  pressed: {
    opacity: 0.86,
  },
});
