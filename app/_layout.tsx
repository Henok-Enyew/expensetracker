import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLockScreen } from "@/components/AppLockScreen";
import { useColors } from "@/contexts/ThemeContext";
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
  const c = useColors();
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: c.background }}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }
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
    if (fontsLoaded) {
      SplashScreen.hideAsync();
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
