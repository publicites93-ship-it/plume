import { useMemo, useRef, useState } from "react";
import { PanResponder, ScrollView, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, IconButton, InlineNotice, Sheet, Text } from "@/components";
import { errorMessage } from "@/lib/errors";
import { theme } from "@/theme";

type Event = { id: string; title: string };
const HEIGHT = 60;

function Grip({ start, move, end }: { start: () => void; move: (dy: number) => void; end: (dy?: number) => void }) {
  const handlers = useRef({ start, move, end });
  handlers.current = { start, move, end };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => handlers.current.start(),
    onPanResponderMove: (_, g) => handlers.current.move(g.dy),
    onPanResponderRelease: (_, g) => handlers.current.end(g.dy),
    onPanResponderTerminate: () => handlers.current.end(),
    onPanResponderTerminationRequest: () => false,
  }), []);
  return <View {...responder.panHandlers} style={{ width: 44, height: HEIGHT, alignItems: "center", justifyContent: "center" }}>
    <Ionicons name="reorder-three-outline" size={26} color={theme.gold} />
  </View>;
}

export function TimelineOrder({ events, close, save }: {
  events: Event[]; close: () => void; save: (previous: string[], ordered: string[]) => Promise<void>;
}) {
  const [initial] = useState(() => events.map(e => e.id));
  const [rows, setRows] = useState(events);
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { height } = useWindowDimensions();
  const target = (from: number, dy: number) => Math.max(0, Math.min(rows.length - 1, from + Math.round(dy / HEIGHT)));
  function shift(from: number, to: number) {
    if (from === to) return;
    const next = [...rows];
    next.splice(to, 0, ...next.splice(from, 1));
    setRows(next);
  }
  async function submit() {
    setBusy(true);
    setError("");
    try { await save(initial, rows.map(e => e.id)); close(); }
    catch (e) { setError(errorMessage(e)); setBusy(false); }
  }
  return <Sheet visible onClose={() => { if (!busy) close(); }} scroll={false} title="Réorganiser la frise"
    subtitle="Faites glisser une poignée jusqu’à la position voulue, ou utilisez les flèches."
    footer={<Button label="Enregistrer l’ordre" loading={busy} disabled={!!drag || rows.every((r, i) => r.id === initial[i])} onPress={() => void submit()} />}>
    {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
    <ScrollView scrollEnabled={!drag} style={{ maxHeight: height * 0.43 }}>
      <View pointerEvents={busy ? "none" : "auto"}>
        {rows.map((row, i) => <View key={row.id} style={{ height: HEIGHT, flexDirection: "row", alignItems: "center", backgroundColor: drag?.to === i ? theme.surfaceRaised : theme.surface, borderBottomWidth: 1, borderBottomColor: drag?.to === i ? theme.gold : theme.border }}>
          <Grip start={() => setDrag({ from: i, to: i })} move={dy => setDrag({ from: i, to: target(i, dy) })}
            end={dy => { if (dy !== undefined) shift(i, target(i, dy)); setDrag(null); }} />
          <Text variant="caption" numberOfLines={2} style={{ flex: 1 }}>{i + 1}. {row.title}</Text>
          <IconButton icon="chevron-up" label={`Monter : ${row.title}`} disabled={i === 0 || busy} onPress={() => shift(i, i - 1)} />
          <IconButton icon="chevron-down" label={`Descendre : ${row.title}`} disabled={i === rows.length - 1 || busy} onPress={() => shift(i, i + 1)} />
        </View>)}
      </View>
    </ScrollView>
  </Sheet>;
}
