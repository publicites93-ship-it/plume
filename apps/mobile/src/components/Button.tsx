import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radii, spacing, touchTarget, typography } from "@plume/shared";
import { Text } from "./Text";
import { palette, theme } from "@/theme";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg" | "sm";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: ComponentProps<typeof Ionicons>["name"];
  iconRight?: ComponentProps<typeof Ionicons>["name"];
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  icon,
  iconRight,
  fullWidth,
  style,
  accessibilityHint,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(isDisabled), busy: Boolean(loading) }}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? palette.nightDeep : theme.gold}
        />
      ) : (
        <View style={styles.content}>
          {icon ? (
            <Ionicons
              name={icon}
              size={size === "sm" ? 16 : 18}
              color={variant === "primary" ? palette.nightDeep : variant === "danger" ? theme.danger : theme.gold}
            />
          ) : null}
          <Text
            variant={size === "sm" ? "caption" : "bodyStrong"}
            color={
              variant === "primary"
                ? palette.nightDeep
                : variant === "danger"
                  ? theme.danger
                  : theme.goldBright
            }
            style={styles.label}
          >
            {label}
          </Text>
          {iconRight ? (
            <Ionicons
              name={iconRight}
              size={size === "sm" ? 16 : 18}
              color={variant === "primary" ? palette.nightDeep : theme.gold}
            />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget.minimum,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    paddingHorizontal: spacing[5],
    borderWidth: 1,
    borderColor: "transparent",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontFamily: typography.uiSemibold,
    letterSpacing: 0.2,
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.45,
  },
});

const sizeStyles = StyleSheet.create({
  sm: {
    minHeight: 38,
    paddingHorizontal: spacing[4],
  },
  md: {
    minHeight: touchTarget.minimum,
  },
  lg: {
    minHeight: 54,
    paddingHorizontal: spacing[6],
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: palette.gold,
    borderColor: palette.gold,
  },
  secondary: {
    backgroundColor: "rgba(197,164,106,0.08)",
    borderColor: "rgba(197,164,106,0.55)",
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "rgba(197,164,106,0.18)",
  },
  danger: {
    backgroundColor: "rgba(199,124,124,0.10)",
    borderColor: "rgba(199,124,124,0.5)",
  },
});

export function IconButton({
  icon,
  onPress,
  label,
  active,
  disabled,
  tone = "gold",
  size = 20,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  onPress?: () => void;
  label: string;
  active?: boolean;
  disabled?: boolean;
  tone?: "gold" | "plain" | "danger";
  size?: number;
}) {
  const color =
    tone === "danger" ? theme.danger : active ? theme.goldBright : tone === "plain" ? theme.textSecondary : theme.gold;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(active), disabled: Boolean(disabled) }}
      onPress={disabled ? undefined : onPress}
      hitSlop={8}
      style={({ pressed }) => [
        iconStyles.base,
        active && iconStyles.active,
        pressed && { opacity: 0.7 },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

const iconStyles = StyleSheet.create({
  base: {
    width: touchTarget.minimum,
    height: touchTarget.minimum,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  active: {
    backgroundColor: "rgba(197,164,106,0.12)",
    borderColor: "rgba(197,164,106,0.32)",
  },
});
