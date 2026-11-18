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
      // Le retour suit l'historique réel (fiche → studio → onglet d'origine).
      backBehavior="history"
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
      {/* Écrans d'histoire, studio, coach… : sous la barre de navigation, sans onglet propre. */}
      <Tabs.Screen name="(protected)" options={{ href: null }} />
    </Tabs>
  );
}
