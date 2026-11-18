import { useEffect, useState } from "react";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { Pressable, ScrollView, Text as RNText, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { useFonts } from "expo-font";
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_600SemiBold_Italic,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import {
  Lora_400Regular,
  Lora_400Regular_Italic,
  Lora_500Medium,
} from "@expo-google-fonts/lora";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { createTrpcClient, queryClient, trpc, wakeServer } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useUiStore } from "@/lib/ui";
import { ToastHost } from "@/components";
import { isDarkTheme, palette, theme } from "@/theme";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

/**
 * Écran de secours : une erreur d'affichage n'entraîne plus la fermeture de
 * l'appli. Composants React Native de base uniquement (indépendants du thème
 * et du design system, qui pourraient être la cause de l'erreur).
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: "#0B111C", paddingTop: 64, paddingHorizontal: 24 }}>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 48 }}>
        <RNText style={{ color: "#E9D8B4", fontSize: 22, fontWeight: "600" }}>
          Plume a rencontré un problème
        </RNText>
        <RNText style={{ color: "#C3B7A4", fontSize: 15, lineHeight: 22 }}>
          Vos manuscrits ne sont pas touchés. Faites une capture de cet écran pour le support, puis
          réessayez.
        </RNText>
        <RNText selectable style={{ color: "#938A7C", fontSize: 13, fontFamily: "monospace" }}>
          {error.name}: {error.message}
        </RNText>
        <Pressable
          accessibilityRole="button"
          onPress={retry}
          style={{ backgroundColor: "#C5A46A", borderRadius: 10, padding: 14, alignItems: "center" }}
        >
          <RNText style={{ color: "#1A1409", fontWeight: "600" }}>Réessayer</RNText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

export default function RootLayout() {
  const [trpcClient] = useState(() => createTrpcClient());
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydrateUi = useUiStore((state) => state.hydrate);
  const authHydrated = useAuthStore((state) => state.hydrated);
  const uiHydrated = useUiStore((state) => state.hydrated);
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_600SemiBold_Italic,
    PlayfairDisplay_700Bold,
    Lora_400Regular,
    Lora_400Regular_Italic,
    Lora_500Medium,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    // Fond natif (sous les écrans, pendant les transitions) aligné sur le thème choisi.
    void SystemUI.setBackgroundColorAsync(theme.backgroundDeep).catch(() => undefined);
    void hydrateAuth();
    void hydrateUi();
    // Réveille l'API Render sans bloquer l'affichage. Les requêtes suivantes
    // réessaient d'elles-mêmes si le service met du temps à démarrer.
    void wakeServer();
  }, [hydrateAuth, hydrateUi]);

  const ready = (fontsLoaded || Boolean(fontError)) && authHydrated && uiHydrated;

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.backgroundDeep }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <StatusBar style={isDarkTheme ? "light" : "dark"} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.backgroundDeep },
                animation: "fade",
              }}
            >
              <Stack.Screen name="(tabs)" />
              {/* Lecture en plein écran : seule partie de l'appli sans barre de navigation. */}
              <Stack.Screen name="(lecture)" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="bienvenue" options={{ animation: "fade" }} />
              <Stack.Screen name="connexion" options={{ animation: "slide_from_bottom" }} />
              <Stack.Screen name="inscription" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="verification-envoyee" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="verifier-email" options={{ animation: "fade" }} />
              <Stack.Screen name="mot-de-passe-oublie" options={{ animation: "slide_from_right" }} />
              <Stack.Screen
                name="reinitialiser-mot-de-passe"
                options={{ animation: "slide_from_right" }}
              />
              <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
            </Stack>
            <ToastHost />
          </trpc.Provider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
