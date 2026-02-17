import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

interface BalanceCardProps {
  totalBalance: number;
  income: number;
  expense: number;
}

export function BalanceCard({ totalBalance, income, expense }: BalanceCardProps) {
  const { colors: c, isDark } = useTheme();
  const textMain = isDark ? "#1C0F22" : "#FFFFFF";
  const textSub = isDark ? "rgba(28,15,34,0.55)" : "rgba(255,255,255,0.65)";
  const dividerColor = isDark ? "rgba(28,15,34,0.12)" : "rgba(255,255,255,0.15)";

  return (
    <LinearGradient
      colors={[c.primaryLight, c.primary, c.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={[styles.label, { color: textSub }]}>Total Balance</Text>
      <Text style={[styles.balance, { color: textMain }]}>{formatCurrency(totalBalance)}</Text>

      <View style={styles.row}>
        <View style={styles.metric}>
          <View style={styles.iconRow}>
            <View style={[styles.iconBg, { backgroundColor: isDark ? "rgba(34,197,94,0.18)" : "rgba(34,197,94,0.25)" }]}>
              <Ionicons name="arrow-down-outline" size={14} color={isDark ? "#16A34A" : "#4ADE80"} />
            </View>
            <Text style={[styles.metricLabel, { color: textSub }]}>Income</Text>
          </View>
          <Text style={[styles.metricValue, { color: textMain }]}>{formatCurrency(income)}</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

        <View style={styles.metric}>
          <View style={styles.iconRow}>
            <View style={[styles.iconBg, { backgroundColor: isDark ? "rgba(239,68,68,0.18)" : "rgba(248,113,113,0.25)" }]}>
              <Ionicons name="arrow-up-outline" size={14} color={isDark ? "#DC2626" : "#F87171"} />
            </View>
            <Text style={[styles.metricLabel, { color: textSub }]}>Expense</Text>
          </View>
          <Text style={[styles.metricValue, { color: textMain }]}>{formatCurrency(expense)}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
  },
  label: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  balance: {
    fontSize: 32,
    fontFamily: "Rubik_700Bold",
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  metric: {
    flex: 1,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  iconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
  },
  metricValue: {
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
    marginLeft: 30,
  },
  divider: {
    width: 1,
    height: 40,
    marginHorizontal: 12,
  },
});
