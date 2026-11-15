import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { radii, spacing, touchTarget } from "@plume/shared";
import { Text } from "./Text";
import { IconButton } from "./Button";
import { palette, theme } from "@/theme";

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  scroll = true,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const body = (
    <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="heading">{title}</Text>
          {subtitle ? (
            <Text variant="caption" color={theme.textMuted} style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <IconButton icon="close" label="Fermer" tone="plain" onPress={onClose} />
      </View>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.body}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.body}>{children}</View>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.fill}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer la fenêtre"
          style={styles.backdrop}
          onPress={onClose}
        />
        <View style={styles.sheet}>{body}</View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: "rgba(5,9,15,0.72)",
  },
  sheet: {
    maxHeight: "90%",
    backgroundColor: palette.nightSoft,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(197,164,106,0.32)",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -8 },
    elevation: 18,
  },
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
    maxHeight: "100%",
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(197,164,106,0.4)",
    marginBottom: spacing[3],
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(197,164,106,0.22)",
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  subtitle: {
    maxWidth: 340,
  },
  body: {
    paddingTop: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[4],
  },
  footer: {
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(197,164,106,0.22)",
    gap: spacing[2],
  },
});

export function SheetActions({ children }: { children: ReactNode }) {
  return <View style={sheetActionsStyles.row}>{children}</View>;
}

const sheetActionsStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing[3],
    alignItems: "center",
  },
});

export const sheetTouchTarget = touchTarget.minimum;
