import type { ReactNode } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, theme } from "@/theme";

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: Array<"top" | "bottom" | "left" | "right">;
  contentStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
  glow?: boolean;
  background?: string;
  keyboardShouldPersistTaps?: "always" | "handled" | "never";
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  edges = ["top"],
  contentStyle,
  refreshing,
  onRefresh,
  glow = true,
  background = palette.nightDeep,
  keyboardShouldPersistTaps = "handled",
}: ScreenProps) {
  const padding = padded ? styles.padded : undefined;
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: background }]} edges={edges}>
      {glow ? (
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(36,52,75,0.55)", "rgba(16,24,39,0.0)"]}
          style={styles.glow}
        />
      ) : null}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[padding, styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={Boolean(refreshing)}
                onRefresh={onRefresh}
                tintColor={theme.gold}
                colors={[theme.gold]}
                progressBackgroundColor={palette.slate}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, padding, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export const screenStyles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  glow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  padded: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 48,
    flexGrow: 1,
  },
});
