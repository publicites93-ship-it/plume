import { Redirect, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoadingState } from "@/components";
import { useSessionGate } from "@/lib/session";
import { palette, theme } from "@/theme";

/** Lecture en plein écran : hors des onglets, donc sans barre de navigation. */
export default function ReadingLayout() {
  const { loading, session } = useSessionGate();

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundDeep }}>
        <LoadingState label="Ouverture du manuscrit…" />
      </SafeAreaView>
    );
  }

  if (!session) return <Redirect href="/bienvenue" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.backgroundDeep },
        animation: "slide_from_right",
      }}
    />
  );
}
