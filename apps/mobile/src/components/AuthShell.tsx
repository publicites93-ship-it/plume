import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { spacing, touchTarget } from "@plume/shared";
import { Text } from "./Text";
import { palette, theme } from "@/theme";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  showBack = true,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  showBack?: boolean;
}) {
  const router = useRouter();
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0B111C", "#101827", "#162133", "#0B111C"]}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topBar}>
              {showBack ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retour"
                  onPress={() => (router.canGoBack() ? router.back() : router.replace("/bienvenue"))}
                  style={styles.back}
                  hitSlop={8}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.gold} />
                  <Text variant="caption" color={theme.gold}>
                    Retour
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.back} />
              )}
              <Text variant="label" color={theme.gold} style={styles.brand}>
                PLUME
              </Text>
              <View style={styles.back} />
            </View>

            <View style={styles.heading}>
              {eyebrow ? (
                <Text variant="label" color={theme.gold}>
                  {eyebrow}
                </Text>
              ) : null}
              <Text variant="display">{title}</Text>
              {subtitle ? (
                <Text variant="body" color={theme.textSecondary}>
                  {subtitle}
                </Text>
              ) : null}
            </View>

            <View style={styles.body}>{children}</View>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export function Checkbox({
  checked,
  onToggle,
  label,
  accessibilityLabel,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onToggle}
      style={styles.checkboxRow}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Ionicons name="checkmark" size={15} color={palette.nightDeep} /> : null}
      </View>
      <Text variant="caption" color={theme.textSecondary} style={styles.checkboxLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.nightDeep,
  },
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingBottom: spacing[7],
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
  },
  back: {
    minWidth: 74,
    minHeight: touchTarget.minimum,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  brand: {
    letterSpacing: 4,
    fontSize: 12,
  },
  heading: {
    gap: spacing[3],
    paddingTop: spacing[6],
    paddingBottom: spacing[6],
    maxWidth: 520,
  },
  body: {
    gap: spacing[4],
  },
  footer: {
    marginTop: spacing[6],
    gap: spacing[3],
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    minHeight: touchTarget.minimum,
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.45)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: palette.gold,
    borderColor: palette.gold,
  },
  checkboxLabel: {
    flex: 1,
    lineHeight: 19,
  },
});
