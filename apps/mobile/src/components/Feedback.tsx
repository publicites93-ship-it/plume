import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { radii, spacing } from "@plume/shared";
import { Text } from "./Text";
import { Button } from "./Button";
import { useToastStore } from "@/lib/toast";
import { palette, theme } from "@/theme";

export function LoadingState({ label = "Ouverture du grimoire…" }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator size="large" color={theme.gold} />
      <Text variant="caption" color={theme.textMuted} style={styles.centerText}>
        {label}
      </Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
  compact,
}: {
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.state, compact && styles.stateCompact]}>
      <View style={styles.iconCircle}>
        <Ionicons name="cloud-offline-outline" size={22} color={theme.danger} />
      </View>
      <Text variant="subheading" align="center">
        La page reste fermée
      </Text>
      <Text variant="caption" color={theme.textMuted} align="center" style={styles.stateText}>
        {message}
      </Text>
      {onRetry ? <Button label="Réessayer" variant="secondary" size="sm" onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyState({
  icon = "book-outline",
  title,
  message,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: {
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <View style={styles.state}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={24} color={theme.gold} />
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      <Text variant="caption" color={theme.textMuted} align="center" style={styles.stateText}>
        {message}
      </Text>
      {actionLabel ? <Button label={actionLabel} onPress={onAction} /> : null}
      {secondaryLabel ? (
        <Button label={secondaryLabel} variant="ghost" size="sm" onPress={onSecondary} />
      ) : null}
    </View>
  );
}

export function InlineNotice({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "success" | "danger";
  title?: string;
  children: React.ReactNode;
}) {
  const paletteMap = {
    info: { border: "rgba(143,163,192,0.35)", bg: "rgba(143,163,192,0.08)", icon: "information-circle-outline", color: theme.info },
    warning: { border: "rgba(211,165,102,0.4)", bg: "rgba(211,165,102,0.08)", icon: "flask-outline", color: theme.warning },
    success: { border: "rgba(143,175,139,0.4)", bg: "rgba(143,175,139,0.08)", icon: "checkmark-circle-outline", color: theme.success },
    danger: { border: "rgba(199,124,124,0.4)", bg: "rgba(199,124,124,0.08)", icon: "alert-circle-outline", color: theme.danger },
  } as const;
  const config = paletteMap[tone];
  return (
    <View style={[styles.notice, { borderColor: config.border, backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={18} color={config.color} style={styles.noticeIcon} />
      <View style={styles.noticeBody}>
        {title ? (
          <Text variant="bodyStrong" color={config.color}>
            {title}
          </Text>
        ) : null}
        <Text variant="caption" color={theme.textSecondary}>
          {children}
        </Text>
      </View>
    </View>
  );
}

export function ToastHost() {
  const message = useToastStore((state) => state.message);
  const tone = useToastStore((state) => state.tone);
  const hide = useToastStore((state) => state.hide);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hide, 3600);
    return () => clearTimeout(timer);
  }, [message, hide]);

  if (!message) return null;
  const color = tone === "success" ? theme.success : tone === "error" ? theme.danger : theme.gold;
  return (
    <View
      pointerEvents="none"
      style={[styles.toast, { top: insets.top + 8, borderColor: `${color}88` }]}
      accessibilityLiveRegion="polite"
    >
      <Ionicons
        name={tone === "success" ? "checkmark-circle" : tone === "error" ? "alert-circle" : "information-circle"}
        size={18}
        color={color}
      />
      <Text variant="caption" color={theme.textPrimary} style={styles.toastText}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    minHeight: 200,
  },
  centerText: {
    letterSpacing: 0.3,
  },
  state: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[3],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[4],
  },
  stateCompact: {
    paddingVertical: spacing[5],
  },
  stateText: {
    maxWidth: 300,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.32)",
    backgroundColor: "rgba(197,164,106,0.07)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  notice: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing[3],
    alignItems: "flex-start",
  },
  noticeIcon: {
    marginTop: 1,
  },
  noticeBody: {
    flex: 1,
    gap: 3,
  },
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
  },
  toastText: {
    flex: 1,
  },
});
