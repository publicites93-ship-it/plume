import { Redirect, Tabs } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoadingState } from "@/components";
import { PlumeTabBar } from "@/components/PlumeTabBar";
import { useSessionGate } from "@/lib/session";
import { theme } from "@/theme";

export default function TabsLayout() {
  const { loading, session } = useSessionGate();

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundDeep }}>
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
        sceneStyle: { backgroundColor: theme.backgroundDeep },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Accueil" }} />
      <Tabs.Screen name="decouvrir" options={{ title: "Découvrir" }} />
      <Tabs.Screen name="ecrire" options={{ title: "Écrire" }} />
      <Tabs.Screen name="apprendre" options={{ title: "Apprendre" }} />
      <Tabs.Screen name="profil" options={{ title: "Profil" }} />
      {/* Écrans d'histoire, studio, coach… : sous la barre de navigation, sans onglet propre.
          Ne pas remettre `href: null` : depuis expo-router 58, un onglet caché qui reçoit le
          focus est redirigé vers l'onglet initial (Accueil). L'onglet reste déclaré ici et
          PlumeTabBar n'affiche que les cinq onglets nommés. */}
      <Tabs.Screen name="(protected)" options={{ title: "Espace" }} />
    </Tabs>
  );
}
