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
  primary: "#0D7C5F",
  primaryLight: "#12A37D",
  primaryDark: "#095C47",
  accent: "#D4A843",

  income: "#22C55E",
  incomeLight: "#DCFCE7",
  expense: "#EF4444",
  expenseLight: "#FEE2E2",

  background: "#F8FAFB",
  surface: "#FFFFFF",
  surfaceSecondary: "#F1F5F9",
  surfaceTertiary: "#E8EDF2",

  text: "#0F172A",
  textSecondary: "#64748B",
  textTertiary: "#94A3B8",
  textInverse: "#FFFFFF",

  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  divider: "#F1F5F9",

  card: "#FFFFFF",
  cardShadow: "rgba(15, 23, 42, 0.06)",

  navBackground: "#FFFFFF",
  navActive: "#0D7C5F",
  navInactive: "#94A3B8",
};

const DARK_COLORS: ThemeColors = {
  primary: "#12A37D",
  primaryLight: "#15C99A",
  primaryDark: "#0D7C5F",
  accent: "#E8C36A",

  income: "#34D399",
  incomeLight: "#064E3B",
  expense: "#F87171",
  expenseLight: "#7F1D1D",

  background: "#0F172A",
  surface: "#1E293B",
  surfaceSecondary: "#334155",
  surfaceTertiary: "#475569",

  text: "#F8FAFC",
  textSecondary: "#94A3B8",
  textTertiary: "#64748B",
  textInverse: "#0F172A",

  border: "#334155",
  borderLight: "#1E293B",
  divider: "#334155",

  card: "#1E293B",
  cardShadow: "rgba(0, 0, 0, 0.3)",

  navBackground: "#1E293B",
  navActive: "#12A37D",
  navInactive: "#64748B",
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
