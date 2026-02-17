import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "@/lib/utils";
import { useColors } from "@/contexts/ThemeContext";
import Colors from "@/constants/colors";

interface BalanceCardProps {
  totalBalance: number;
  income: number;
  expense: number;
}

export function BalanceCard({ totalBalance, income, expense }: BalanceCardProps) {
  const c = useColors();
  return (
    <LinearGradient
      colors={[c.primaryLight, c.primary, c.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.label}>Total Balance</Text>
      <Text style={styles.balance}>{formatCurrency(totalBalance)}</Text>

      <View style={styles.row}>
        <View style={styles.metric}>
          <View style={styles.iconRow}>
            <View style={[styles.iconBg, { backgroundColor: "rgba(34, 197, 94, 0.3)" }]}>
              <Ionicons name="arrow-down-outline" size={14} color="#4ADE80" />
            </View>
            <Text style={styles.metricLabel}>Income</Text>
          </View>
          <Text style={styles.metricValue}>{formatCurrency(income)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metric}>
          <View style={styles.iconRow}>
            <View style={[styles.iconBg, { backgroundColor: "rgba(239, 68, 68, 0.3)" }]}>
              <Ionicons name="arrow-up-outline" size={14} color="#F87171" />
            </View>
            <Text style={styles.metricLabel}>Expense</Text>
          </View>
          <Text style={styles.metricValue}>{formatCurrency(expense)}</Text>
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
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  balance: {
    color: "#FFFFFF",
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
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
  },
  metricValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
    marginLeft: 30,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 12,
  },
});
