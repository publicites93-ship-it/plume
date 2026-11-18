import { Redirect, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoadingState } from "@/components";
import { useSessionGate } from "@/lib/session";
import { palette } from "@/theme";

export default function ProtectedLayout() {
  const { loading, session } = useSessionGate();

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.nightDeep }}>
        <LoadingState label="Ouverture du manuscrit…" />
      </SafeAreaView>
    );
  }

  if (!session) return <Redirect href="/bienvenue" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.nightDeep },
        animation: "slide_from_right",
      }}
    />
  );
}
