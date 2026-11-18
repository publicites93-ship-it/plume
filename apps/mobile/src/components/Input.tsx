import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radii, spacing, typography } from "@plume/shared";
import { Text } from "./Text";
import { isDarkTheme, palette, theme, withAlpha } from "@/theme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
  right?: React.ReactNode;
  required?: boolean;
}

export function Input({
  label,
  error,
  hint,
  containerStyle,
  right,
  required,
  secureTextEntry,
  multiline,
  style,
  ...rest
}: InputProps) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = Boolean(secureTextEntry);
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <View style={styles.labelRow}>
          <Text variant="label" color={theme.textSecondary}>
            {label}
            {required ? <Text color={theme.gold}> *</Text> : null}
          </Text>
        </View>
      ) : null}
      <View
        style={[
          styles.field,
          multiline && styles.multilineField,
          error ? styles.fieldError : null,
        ]}
      >
        <TextInput
          {...rest}
          multiline={multiline}
          secureTextEntry={isPassword && !revealed}
          placeholderTextColor={theme.textMuted}
          selectionColor={theme.goldBright}
          style={[styles.input, multiline && styles.multilineInput, style]}
          accessibilityLabel={rest.accessibilityLabel ?? label}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            onPress={() => setRevealed((value) => !value)}
            hitSlop={8}
            style={styles.accessory}
          >
            <Ionicons
              name={revealed ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={theme.textMuted}
            />
          </Pressable>
        ) : (
          right
        )}
      </View>
      {error ? (
        <Text variant="caption" color={theme.danger} style={styles.helper}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color={theme.textMuted} style={styles.helper}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 7,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 50,
    borderRadius: radii.md,
    borderWidth: 1,
    // Sur fond clair, l'or translucide du thème Nuit tombait à 1,2:1 : champ invisible.
    borderColor: isDarkTheme ? "rgba(197,164,106,0.28)" : withAlpha(theme.gold, 0.75),
    backgroundColor: withAlpha(theme.backgroundDeep, isDarkTheme ? 0.55 : 0.6),
    paddingHorizontal: spacing[4],
  },
  fieldError: {
    borderColor: isDarkTheme ? "rgba(199,124,124,0.7)" : theme.danger,
  },
  multilineField: {
    alignItems: "flex-start",
    minHeight: 110,
  },
  input: {
    flex: 1,
    color: theme.textPrimary,
    fontFamily: typography.ui,
    fontSize: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top",
    lineHeight: 23,
  },
  accessory: {
    paddingLeft: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  helper: {
    marginTop: 1,
  },
});

export function FieldLabel({ children }: { children: string }) {
  return (
    <Text variant="label" color={theme.textMuted}>
      {children}
    </Text>
  );
}

export { palette };
