import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import React, { useEffect } from "react";
import { View, LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLockScreen } from "@/components/AppLockScreen";
import { MoneyLoadingScreen } from "@/components/MoneyLoadingScreen";
import { queryClient } from "@/lib/query-client";
import { AppProvider } from "@/contexts/AppContext";
import { SecurityProvider, useSecurity } from "@/contexts/SecurityContext";
import { ThemeProvider, useColors } from "@/contexts/ThemeContext";
import { SmsListenerProvider } from "@/components/SmsListenerProvider";
import {
  useFonts,
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
  Rubik_700Bold,
} from "@expo-google-fonts/rubik";

SplashScreen.preventAutoHideAsync();

// Suppress keep-awake errors from Expo dev client on some Android devices
LogBox.ignoreLogs(["Unable to activate keep awake", "Unable to deactivate keep awake"]);

function RootLayoutNav() {
  const c = useColors();
  return (
    <Stack screenOptions={{ headerBackTitle: "Back", contentStyle: { backgroundColor: c.background } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="add-transaction"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="add-bank"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="add-budget"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="bank-detail"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="friend-detail"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="add-friend"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="about"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}

function LockGate({ children }: { children: React.ReactNode }) {
  const { appLockEnabled, locked, isLoading } = useSecurity();
  if (isLoading) return <MoneyLoadingScreen />;
  if (!appLockEnabled) return <>{children}</>;
  if (locked) return <AppLockScreen />;
  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_600SemiBold,
    Rubik_700Bold,
  });

  useEffect(() => {
    if (!fontsLoaded) return;
    SplashScreen.hideAsync();
    // In production builds, check for OTA updates on load (download in background; apply on next launch)
    if (!__DEV__) {
      Updates.checkForUpdateAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <ThemeProvider>
              <SecurityProvider>
                <AppProvider>
                  <SmsListenerProvider>
                    <LockGate>
                      <RootLayoutNav />
                    </LockGate>
                  </SmsListenerProvider>
                </AppProvider>
              </SecurityProvider>
            </ThemeProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
