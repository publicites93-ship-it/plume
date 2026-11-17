import { useId, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { coverImageSource } from "@/lib/covers";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { Text } from "./Text";
import { palette, theme } from "@/theme";

export type CoverMotif = "arch" | "rose" | "quill" | "moon" | "castle" | "owl";

const palettes: Array<[string, string, string]> = [
  ["#1B2A3E", "#0B111C", "#C5A46A"],
  ["#2A2230", "#120E17", "#D3AE79"],
  ["#1E2B2A", "#0C1414", "#BFA77A"],
  ["#30222A", "#140D12", "#C79C93"],
  ["#25283A", "#0D0F19", "#D8C08B"],
  ["#2B241C", "#130F0A", "#CDB183"],
];

function hashCode(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function Motif({ motif, color }: { motif: CoverMotif; color: string }) {
  switch (motif) {
    case "rose":
      return (
        <G>
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const angle = (index * Math.PI) / 3;
            return (
              <Circle
                key={index}
                cx={60 + Math.cos(angle) * 12}
                cy={62 + Math.sin(angle) * 12}
                r={12}
                stroke={color}
                strokeWidth={0.9}
                fill="none"
                opacity={0.75}
              />
            );
          })}
          <Circle cx={60} cy={62} r={5} stroke={color} strokeWidth={1} fill="none" />
        </G>
      );
    case "quill":
      return (
        <G>
          <Path
            d="M38 96 C46 62 64 34 88 26 C78 48 68 68 48 92 C46 96 42 98 38 96 Z"
            stroke={color}
            strokeWidth={1.2}
            fill="none"
          />
          <Path d="M40 94 C52 76 66 58 84 34" stroke={color} strokeWidth={0.8} opacity={0.8} />
          <Line x1={34} y1={102} x2={48} y2={92} stroke={color} strokeWidth={1.2} />
        </G>
      );
    case "moon":
      return (
        <G>
          <Path
            d="M70 28 A34 34 0 1 0 70 98 A28 28 0 1 1 70 28 Z"
            stroke={color}
            strokeWidth={1.1}
            fill="none"
          />
          <Circle cx={82} cy={46} r={1.4} fill={color} />
          <Circle cx={88} cy={70} r={1} fill={color} opacity={0.8} />
          <Circle cx={76} cy={86} r={1.2} fill={color} opacity={0.7} />
        </G>
      );
    case "castle":
      return (
        <G>
          <Path
            d="M34 100 L34 58 L44 58 L44 48 L54 48 L54 58 L66 58 L66 48 L76 48 L76 58 L86 58 L86 100 Z"
            stroke={color}
            strokeWidth={1.1}
            fill="none"
          />
          <Path d="M54 100 L54 78 A6 6 0 0 1 66 78 L66 100" stroke={color} strokeWidth={1} fill="none" />
          <Line x1={34} y1={100} x2={86} y2={100} stroke={color} strokeWidth={1.2} />
        </G>
      );
    case "owl":
      return (
        <G>
          <Path
            d="M42 50 C42 36 78 36 78 50 L78 76 C78 92 42 92 42 76 Z"
            stroke={color}
            strokeWidth={1.1}
            fill="none"
          />
          <Circle cx={52} cy={60} r={7} stroke={color} strokeWidth={1} fill="none" />
          <Circle cx={68} cy={60} r={7} stroke={color} strokeWidth={1} fill="none" />
          <Circle cx={52} cy={60} r={2} fill={color} />
          <Circle cx={68} cy={60} r={2} fill={color} />
          <Path d="M60 68 L56 74 L64 74 Z" stroke={color} strokeWidth={0.9} fill="none" />
        </G>
      );
    case "arch":
    default:
      return (
        <G>
          <Path
            d="M32 108 L32 58 C32 40 46 26 60 18 C74 26 88 40 88 58 L88 108 Z"
            stroke={color}
            strokeWidth={1.2}
            fill="none"
          />
          <Path
            d="M42 108 L42 60 C42 47 51 37 60 31 C69 37 78 47 78 60 L78 108"
            stroke={color}
            strokeWidth={0.7}
            opacity={0.6}
            fill="none"
          />
          <Line x1={24} y1={108} x2={96} y2={108} stroke={color} strokeWidth={1.2} />
          <Circle cx={60} cy={54} r={2} fill={color} />
        </G>
      );
  }
}

export function Cover({
  title,
  motif = "arch",
  width = 108,
  height = 162,
  label,
  compact = false,
  imageUrl,
}: {
  title: string;
  motif?: CoverMotif;
  width?: number;
  height?: number;
  label?: string;
  compact?: boolean;
  /** Couverture personnalisée (chemin /covers/… ou URI locale d'aperçu). */
  imageUrl?: string | null;
}) {
  // Les hooks restent avant tout retour anticipé (ordre stable entre rendus).
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const source =
    imageUrl && imageUrl !== failedUrl
      ? imageUrl.startsWith("file:")
        ? { uri: imageUrl }
        : coverImageSource(imageUrl)
      : null;
  if (source) {
    return (
      <View
        style={[styles.frame, { width, height, borderColor: "rgba(197,164,106,0.4)" }]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Couverture de ${title}`}
      >
        <Image
          source={source}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setFailedUrl(imageUrl ?? null)}
        />
      </View>
    );
  }
  const gradientId = `cover-${rawId}`;
  const [top, bottom, accent] = palettes[hashCode(title) % palettes.length]!;
  const titleSize = Math.max(9, Math.min(15, width / 9));
  return (
    <View
      style={[
        styles.frame,
        { width, height, borderColor: `${accent}66` },
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 120 180">
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={top} />
            <Stop offset="1" stopColor={bottom} />
          </SvgLinearGradient>
        </Defs>
        <Rect x={0} y={0} width={120} height={180} fill={`url(#${gradientId})`} />
        <Rect
          x={7}
          y={7}
          width={106}
          height={166}
          fill="none"
          stroke={accent}
          strokeWidth={0.7}
          opacity={0.65}
        />
        <Rect
          x={11}
          y={11}
          width={98}
          height={158}
          fill="none"
          stroke={accent}
          strokeWidth={0.35}
          opacity={0.35}
        />
        <G opacity={0.85}>
          <Motif motif={motif} color={accent} />
        </G>
        <Line x1={32} y1={122} x2={88} y2={122} stroke={accent} strokeWidth={0.6} opacity={0.6} />
        <Circle cx={60} cy={122} r={1.6} fill={accent} />
        <Circle cx={26} cy={26} r={1} fill={accent} opacity={0.6} />
        <Circle cx={96} cy={34} r={0.8} fill={accent} opacity={0.5} />
        <Circle cx={90} cy={16} r={1.1} fill={accent} opacity={0.45} />
      </Svg>
      <View pointerEvents="none" style={styles.overlay}>
        {!compact ? (
          <Text
            fixed
            variant="label"
            color={`${accent}CC`}
            style={[styles.brand, { fontSize: Math.max(6, width / 18) }]}
          >
            PLUME
          </Text>
        ) : null}
        <View style={styles.spacer} />
        <Text
          fixed
          variant="heading"
          color={palette.parchment}
          numberOfLines={3}
          style={{
            fontSize: titleSize,
            lineHeight: titleSize * 1.22,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
        {label ? (
          <Text
            fixed
            variant="caption"
            color={`${accent}CC`}
            numberOfLines={1}
            style={[styles.label, { fontSize: Math.max(6, width / 20) }]}
          >
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    backgroundColor: palette.nightDeep,
  },
  overlay: {
    position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 12,
  },
  brand: {
    textAlign: "center",
    letterSpacing: 2.2,
    opacity: 0.8,
  },
  spacer: {
    flex: 1,
  },
  label: {
    textAlign: "center",
    marginTop: 5,
    letterSpacing: 0.6,
  },
});

export const coverMeta = {
  accent: theme.gold,
};
