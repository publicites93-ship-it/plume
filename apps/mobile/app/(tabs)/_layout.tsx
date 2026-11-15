import { Redirect, Tabs } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoadingState } from "@/components";
import { PlumeTabBar } from "@/components/PlumeTabBar";
import { useSessionGate } from "@/lib/session";
import { palette } from "@/theme";

export default function TabsLayout() {
  const { loading, session } = useSessionGate();

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.nightDeep }}>
        <LoadingState label="Ouverture de la bibliothèque…" />
      </SafeAreaView>
    );
  }
  if (!session) return <Redirect href="/bienvenue" />;

  return (
    <Tabs
      tabBar={(props) => <PlumeTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: palette.nightDeep },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Accueil" }} />
      <Tabs.Screen name="decouvrir" options={{ title: "Découvrir" }} />
      <Tabs.Screen name="ecrire" options={{ title: "Écrire" }} />
      <Tabs.Screen name="apprendre" options={{ title: "Apprendre" }} />
      <Tabs.Screen name="profil" options={{ title: "Profil" }} />
    </Tabs>
  );
}
