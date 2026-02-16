import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "@/lib/utils";
import Colors from "@/constants/colors";

interface BalanceCardProps {
  totalBalance: number;
  income: number;
  expense: number;
}

export function BalanceCard({ totalBalance, income, expense }: BalanceCardProps) {
  return (
    <LinearGradient
      colors={[Colors.primary, Colors.primaryDark]}
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
              <Ionicons name="arrow-down" size={14} color="#22C55E" />
            </View>
            <Text style={styles.metricLabel}>Income</Text>
          </View>
          <Text style={styles.metricValue}>{formatCurrency(income)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metric}>
          <View style={styles.iconRow}>
            <View style={[styles.iconBg, { backgroundColor: "rgba(239, 68, 68, 0.3)" }]}>
              <Ionicons name="arrow-up" size={14} color="#EF4444" />
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
    fontFamily: "Inter_500Medium",
    marginBottom: 4,
  },
  balance: {
    color: "#FFFFFF",
    fontSize: 32,
    fontFamily: "Inter_700Bold",
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
    fontFamily: "Inter_500Medium",
  },
  metricValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginLeft: 30,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 12,
  },
});
