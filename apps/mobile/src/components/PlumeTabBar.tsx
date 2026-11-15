import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "expo-router/tabs";
import { spacing } from "@plume/shared";
import { Text } from "./Text";
import { palette, theme } from "@/theme";

const tabs: Record<
  string,
  { label: string; icon: ComponentProps<typeof Ionicons>["name"]; active: ComponentProps<typeof Ionicons>["name"] }
> = {
  index: { label: "Accueil", icon: "home-outline", active: "home" },
  decouvrir: { label: "Découvrir", icon: "compass-outline", active: "compass" },
  ecrire: { label: "Écrire", icon: "create-outline", active: "create" },
  apprendre: { label: "Apprendre", icon: "school-outline", active: "school" },
  profil: { label: "Profil", icon: "person-outline", active: "person" },
};

export function PlumeTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.ornament}>
        <View style={styles.line} />
        <View style={styles.diamond} />
        <View style={styles.line} />
      </View>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const config = tabs[route.name] ?? {
            label: route.name,
            icon: "ellipse-outline" as const,
            active: "ellipse" as const,
          };
          const onPress = () => {
            const event = emitter.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };
          const onLongPress = () => {
            emitter.emit({ type: "tabLongPress", target: route.key });
          };
          const label = descriptors[route.key]?.options.title ?? config.label;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={({ pressed }) => [styles.tab, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Ionicons
                  name={focused ? config.active : config.icon}
                  size={21}
                  color={focused ? palette.nightDeep : theme.textMuted}
                />
              </View>
              <Text
                variant="label"
                color={focused ? theme.goldBright : theme.textMuted}
                style={styles.label}
                numberOfLines={1}
              >
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "rgba(11,17,28,0.98)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(197,164,106,0.22)",
    paddingTop: 6,
    paddingHorizontal: 8,
  },
  ornament: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    marginBottom: 3,
    opacity: 0.5,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.gold,
  },
  diamond: {
    width: 4,
    height: 4,
    backgroundColor: theme.gold,
    transform: [{ rotate: "45deg" }],
  },
  bar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  tab: {
    flex: 1,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingTop: 2,
  },
  iconWrap: {
    width: 38,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: palette.gold,
  },
  label: {
    fontSize: 8.5,
    letterSpacing: 0.9,
  },
});
