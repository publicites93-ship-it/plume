import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Svg, { Line } from "react-native-svg";
import { RELATION_KINDS } from "@plume/shared";
import { Button, Card, Chip, Text } from "@/components";
import { theme } from "@/theme";

type Character = { id: string; name: string };
type Link = { id: string; fromCharacterId: string; toCharacterId: string; kind: string };
const label = (kind: string) => RELATION_KINDS.find(k => k.id === kind)?.label ?? kind;

// Les liens rapprochent leurs extrémités ; la répulsion garde les cibles tactiles séparées.
function layout(ids: string[], links: Link[]) {
  const cols = Math.ceil(Math.sqrt(ids.length));
  const width = Math.max(260, cols * 128), height = Math.max(158, Math.ceil(ids.length / cols) * 84);
  const points = ids.map((id, i) => ({ id, x: 60 + i % cols * 128, y: 36 + Math.floor(i / cols) * 84 }));
  const index = new Map(ids.map((id, i) => [id, i]));
  for (let step = 0; step < 32 && ids.length <= 100; step++) {
    const moves = points.map(() => ({ x: 0, y: 0 }));
    function force(i: number, j: number, spring: boolean) {
      const dx = points[j]!.x - points[i]!.x, dy = points[j]!.y - points[i]!.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const f = spring ? (d - 125) * 0.025 : -Math.max(0, 138 - d) * 0.18;
      moves[i]!.x += dx / d * f; moves[j]!.x -= dx / d * f;
      moves[i]!.y += dy / d * f; moves[j]!.y -= dy / d * f;
    }
    points.forEach((_, i) => { for (let j = 0; j < i; j++) force(i, j, false); });
    for (const link of links) {
      const i = index.get(link.fromCharacterId), j = index.get(link.toCharacterId);
      if (i !== undefined && j !== undefined) force(i, j, true);
    }
    points.forEach((p, i) => {
      p.x = Math.max(54, Math.min(width - 54, p.x + moves[i]!.x));
      p.y = Math.max(24, Math.min(height - 24, p.y + moves[i]!.y));
    });
  }
  return { width, height, nodes: new Map(points.map(p => [p.id, p])) };
}

export function RelationMap({ characters, relations, advanced, open }: {
  characters: Character[]; relations: Link[]; advanced: boolean; open: (id: string) => void;
}) {
  const [selected, select] = useState<string>();
  const [kind, filter] = useState<string>();
  const kinds = [...new Set(relations.map(r => r.kind))];
  const activeKind = advanced && kind && kinds.includes(kind) ? kind : undefined;
  const links = useMemo(() => relations.filter(r => !activeKind || r.kind === activeKind), [relations, activeKind]);
  const graph = useMemo(() => layout(characters.map(c => c.id), links), [characters, links]);
  const person = characters.find(c => c.id === selected);
  const incident = (r: Link) => r.fromCharacterId === selected || r.toCharacterId === selected;
  const adjacent = links.filter(incident);
  return <Card style={{ gap: 10 }}>
    <Text variant="heading">Carte des relations</Text>
    <Text variant="caption" color={theme.textMuted}>Touchez un personnage pour explorer ses liens.</Text>
    {advanced && kinds.length > 1 && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      <Chip label="Tous les liens" selected={!activeKind} onPress={() => filter(undefined)} />
      {kinds.map(k => <Chip key={k} label={label(k)} selected={activeKind === k} onPress={() => filter(k)} />)}
    </View>}
    <ScrollView horizontal>
      <View style={{ width: graph.width, height: graph.height }}>
        <Svg width={graph.width} height={graph.height} accessible={false}>
          {links.map(r => {
            const a = graph.nodes.get(r.fromCharacterId), b = graph.nodes.get(r.toCharacterId);
            return a && b && <Line key={r.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={person && !incident(r) ? theme.borderStrong : theme.gold} strokeWidth={incident(r) ? 3 : 2} />;
          })}
        </Svg>
        {characters.map(c => {
          const p = graph.nodes.get(c.id)!;
          return <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={c.name} accessibilityState={{ selected: selected === c.id }} onPress={() => select(c.id)} style={{ position: "absolute", left: p.x - 52, top: p.y - 22, width: 104, height: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderRadius: 12, backgroundColor: theme.surfaceRaised, borderWidth: selected === c.id ? 2 : 1, borderColor: selected === c.id ? theme.gold : theme.borderStrong }}>
            <Text variant="caption" numberOfLines={2} align="center">{c.name}</Text>
          </Pressable>;
        })}
      </View>
    </ScrollView>
    {person && <>
      <Text variant="bodyStrong">{person.name}</Text>
      {adjacent.length === 0 && <Text variant="caption">Aucun lien dans cette sélection.</Text>}
      {adjacent.map(r => <Text key={r.id} variant="caption">{label(r.kind)} · {characters.find(c => c.id === (r.fromCharacterId === selected ? r.toCharacterId : r.fromCharacterId))?.name ?? "Personnage"}</Text>)}
      <Button label="Ouvrir la fiche" size="sm" variant="secondary" onPress={() => open(person.id)} />
    </>}
  </Card>;
}
