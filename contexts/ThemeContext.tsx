import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { useColorScheme } from "react-native";
import * as storage from "@/lib/storage";
import type { ThemeMode } from "@/lib/storage";

interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;

  income: string;
  incomeLight: string;
  expense: string;
  expenseLight: string;

  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  border: string;
  borderLight: string;
  divider: string;

  card: string;
  cardShadow: string;

  navBackground: string;
  navActive: string;
  navInactive: string;
}

const LIGHT_COLORS: ThemeColors = {
  primary: "#45234E",
  primaryLight: "#927C9C",
  primaryDark: "#361B3E",
  accent: "#E8734A",

  income: "#22C55E",
  incomeLight: "#DCFCE7",
  expense: "#EF4444",
  expenseLight: "#FEE2E2",

  background: "#F5F2F6",
  surface: "#FFFFFF",
  surfaceSecondary: "#E7DBE9",
  surfaceTertiary: "#C2B5BF",

  text: "#1C0F22",
  textSecondary: "#927C9C",
  textTertiary: "#C2B5BF",
  textInverse: "#FFFFFF",

  border: "#E7DBE9",
  borderLight: "#F0EAF1",
  divider: "#E7DBE9",

  card: "#FFFFFF",
  cardShadow: "rgba(69, 35, 78, 0.08)",

  navBackground: "#FFFFFF",
  navActive: "#45234E",
  navInactive: "#C2B5BF",
};

const DARK_COLORS: ThemeColors = {
  primary: "#C2B5BF",
  primaryLight: "#E7DBE9",
  primaryDark: "#927C9C",
  accent: "#E8734A",

  income: "#34D399",
  incomeLight: "#1A3A2F",
  expense: "#F87171",
  expenseLight: "#3D1F1F",

  background: "#1C0F22",
  surface: "#2A1832",
  surfaceSecondary: "#362242",
  surfaceTertiary: "#45234E",

  text: "#F0EAF1",
  textSecondary: "#C2B5BF",
  textTertiary: "#927C9C",
  textInverse: "#1C0F22",

  border: "#362242",
  borderLight: "#2A1832",
  divider: "#362242",

  card: "#2A1832",
  cardShadow: "rgba(0, 0, 0, 0.4)",

  navBackground: "#221430",
  navActive: "#E7DBE9",
  navInactive: "#927C9C",
};

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: "light" | "dark";
  colors: ThemeColors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    storage.getThemeMode().then((m) => {
      setModeState(m);
      setLoaded(true);
    });
  }, []);

  const setMode = useCallback(async (m: ThemeMode) => {
    setModeState(m);
    await storage.setThemeMode(m);
  }, []);

  const resolvedTheme = useMemo((): "light" | "dark" => {
    if (mode === "system") return systemScheme === "dark" ? "dark" : "light";
    return mode;
  }, [mode, systemScheme]);

  const colors = useMemo(() => {
    return resolvedTheme === "dark" ? DARK_COLORS : LIGHT_COLORS;
  }, [resolvedTheme]);

  const value = useMemo(
    () => ({
      mode,
      resolvedTheme,
      colors,
      isDark: resolvedTheme === "dark",
      setMode,
    }),
    [mode, resolvedTheme, colors, setMode],
  );

  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function useColors() {
  return useTheme().colors;
}
