import type { ComponentProps, ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { radii, spacing, touchTarget, typography } from "@plume/shared";
import { Text } from "./Text";
import { IconButton } from "./Button";
import { isDarkTheme, palette, theme, withAlpha } from "@/theme";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  back = false,
  right,
  onBack,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  onBack?: () => void;
}) {
  const router = useRouter();
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderTop}>
        {back ? (
          <IconButton
            icon="chevron-back"
            label="Retour"
            tone="plain"
            onPress={onBack ?? (() => router.back())}
          />
        ) : null}
        <View style={styles.pageHeaderText}>
          {eyebrow ? (
            <Text variant="label" color={theme.gold}>
              {eyebrow}
            </Text>
          ) : null}
          <Text variant="display" numberOfLines={3}>
            {title}
          </Text>
        </View>
        {right ? <View style={styles.pageHeaderRight}>{right}</View> : null}
      </View>
      {subtitle ? (
        <Text variant="caption" color={theme.textSecondary} style={styles.pageSubtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  eyebrow,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  eyebrow?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleWrap}>
        {eyebrow ? (
          <Text variant="label" color={theme.gold}>
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="heading">{title}</Text>
      </View>
      {actionLabel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          hitSlop={8}
          style={styles.sectionAction}
        >
          <Text variant="caption" color={theme.gold}>
            {actionLabel}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={theme.gold} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Badge({
  children,
  tone = "gold",
  icon,
}: {
  children: string;
  tone?: "gold" | "muted" | "success" | "danger" | "bordeaux" | "info";
  icon?: ComponentProps<typeof Ionicons>["name"];
}) {
  const colors = {
    gold: { bg: "rgba(197,164,106,0.12)", border: "rgba(197,164,106,0.4)", text: theme.goldBright },
    muted: { bg: "rgba(147,138,124,0.1)", border: "rgba(147,138,124,0.3)", text: theme.textSecondary },
    success: { bg: "rgba(143,175,139,0.12)", border: "rgba(143,175,139,0.4)", text: theme.success },
    danger: { bg: "rgba(199,124,124,0.12)", border: "rgba(199,124,124,0.4)", text: theme.danger },
    bordeaux: {
      bg: isDarkTheme ? "rgba(103,58,73,0.35)" : "rgba(103,58,73,0.10)",
      border: "rgba(184,135,145,0.45)",
      text: isDarkTheme ? "#D8AAB2" : "#7A3A4A",
    },
    info: { bg: "rgba(143,163,192,0.12)", border: "rgba(143,163,192,0.4)", text: theme.info },
  } as const;
  const color = colors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: color.bg, borderColor: color.border }]}>
      {icon ? <Ionicons name={icon} size={11} color={color.text} /> : null}
      <Text variant="label" color={color.text} style={styles.badgeText} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && { opacity: 0.75 },
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={13} color={selected ? theme.textOnGold : theme.textSecondary} />
      ) : null}
      <Text variant="caption" color={selected ? theme.textOnGold : theme.textSecondary}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Divider({ ornament = false }: { ornament?: boolean }) {
  if (!ornament) return <View style={styles.divider} />;
  return (
    <View style={styles.ornamentRow}>
      <View style={styles.ornamentLine} />
      <View style={styles.diamond} />
      <View style={styles.ornamentLine} />
    </View>
  );
}

export function Stat({
  value,
  label,
  align = "left",
  compact,
}: {
  value: string | number;
  label: string;
  align?: "left" | "center";
  compact?: boolean;
}) {
  return (
    <View style={[styles.stat, align === "center" && styles.statCenter]}>
      <Text variant={compact ? "subheading" : "title"} color={theme.goldBright}>
        {String(value)}
      </Text>
      <Text variant="label" color={theme.textMuted} style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

export function ProgressBar({
  value,
  height = 6,
  color = theme.gold,
  track = "rgba(197,164,106,0.14)",
}: {
  value: number;
  height?: number;
  color?: string;
  track?: string;
}) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View
      style={[styles.progressTrack, { height, backgroundColor: track, borderRadius: height }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height,
          borderRadius: height,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export function ListRow({
  icon,
  title,
  subtitle,
  rightText,
  onPress,
  danger,
  right,
  style,
}: {
  icon?: ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle?: string;
  rightText?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const content = (
    <>
      {icon ? (
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={18} color={danger ? theme.danger : theme.gold} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <Text variant="bodyStrong" color={danger ? theme.danger : theme.textPrimary}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color={theme.textMuted} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightText ? (
        <Text variant="caption" color={theme.textSecondary}>
          {rightText}
        </Text>
      ) : null}
      {right}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={theme.textMuted} /> : null}
    </>
  );
  if (!onPress) return <View style={[styles.row, style]}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, style, pressed && { opacity: 0.72 }]}
    >
      {content}
    </Pressable>
  );
}

export function Avatar({
  name,
  motif = "quill",
  size = 56,
}: {
  name: string;
  motif?: "quill" | "rose" | "moon" | "arch" | "castle" | "owl" | string;
  size?: number;
}) {
  const icons: Record<string, ComponentProps<typeof Ionicons>["name"]> = {
    quill: "create-outline",
    rose: "rose-outline",
    moon: "moon-outline",
    arch: "business-outline",
    castle: "home-outline",
    owl: "eye-outline",
  };
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
      accessibilityLabel={`Avatar de ${name}`}
    >
      <Ionicons
        name={icons[motif] ?? "create-outline"}
        size={size * 0.4}
        color={theme.goldBright}
      />
    </View>
  );
}

export function Segmented<T extends string,>({
  options,
  value,
  onChange,
  scroll: _scroll,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  scroll?: boolean;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text
              variant="caption"
              color={selected ? theme.textOnGold : theme.textSecondary}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SimulationNotice({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.simulation}>
      <Ionicons name="flask-outline" size={15} color={theme.warning} />
      <Text variant="caption" color={theme.textSecondary} style={styles.simulationText}>
        {compact
          ? "Analyse simulée : moteur pédagogique déterministe, pas d'IA générative connectée."
          : "Cette analyse provient d'un moteur pédagogique simulé (déterministe, sans appel à une IA générative payante). Elle sert à valider le parcours, pas à juger littérairement votre texte."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    gap: spacing[2],
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
  },
  pageHeaderTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
  },
  pageHeaderText: {
    flex: 1,
    gap: 6,
    paddingTop: 2,
  },
  pageHeaderRight: {
    paddingTop: 4,
  },
  pageSubtitle: {
    maxWidth: 520,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginTop: spacing[6],
    marginBottom: spacing[3],
  },
  sectionTitleWrap: {
    gap: 3,
    flex: 1,
  },
  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: touchTarget.minimum,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeText: {
    letterSpacing: 0.8,
    fontSize: 9.5,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.24)",
    backgroundColor: withAlpha(theme.surface, 0.7),
  },
  chipSelected: {
    backgroundColor: palette.gold,
    borderColor: palette.gold,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(197,164,106,0.22)",
  },
  ornamentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: spacing[2],
  },
  ornamentLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(197,164,106,0.28)",
  },
  diamond: {
    width: 7,
    height: 7,
    backgroundColor: theme.gold,
    transform: [{ rotate: "45deg" }],
    opacity: 0.85,
  },
  stat: {
    gap: 2,
  },
  statCenter: {
    alignItems: "center",
  },
  statLabel: {
    letterSpacing: 1.1,
    fontSize: 9.5,
  },
  progressTrack: {
    width: "100%",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    minHeight: 56,
    paddingVertical: spacing[3],
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(197,164,106,0.08)",
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.18)",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.5)",
    backgroundColor: "rgba(197,164,106,0.08)",
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: withAlpha(theme.backgroundDeep, isDarkTheme ? 0.6 : 0.6),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.22)",
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    paddingHorizontal: 8,
  },
  segmentSelected: {
    backgroundColor: palette.gold,
  },
  simulation: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: spacing[3],
    borderRadius: radii.md,
    backgroundColor: "rgba(211,165,102,0.07)",
    borderWidth: 1,
    borderColor: "rgba(211,165,102,0.24)",
  },
  simulationText: {
    flex: 1,
    fontFamily: typography.ui,
  },
});
