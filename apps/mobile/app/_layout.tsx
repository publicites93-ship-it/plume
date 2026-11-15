import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
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
import { createTrpcClient, queryClient, trpc } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useUiStore } from "@/lib/ui";
import { ToastHost } from "@/components";
import { palette } from "@/theme";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

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
    void hydrateAuth();
    void hydrateUi();
  }, [hydrateAuth, hydrateUi]);

  const ready = (fontsLoaded || Boolean(fontError)) && authHydrated && uiHydrated;

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.nightDeep }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: palette.nightDeep },
                animation: "fade",
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(protected)" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="bienvenue" options={{ animation: "fade" }} />
              <Stack.Screen name="connexion" options={{ animation: "slide_from_bottom" }} />
              <Stack.Screen name="inscription" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
            </Stack>
            <ToastHost />
          </trpc.Provider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
