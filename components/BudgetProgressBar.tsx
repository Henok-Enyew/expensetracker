import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { Category } from "@/constants/categories";
import { formatCurrency } from "@/lib/utils";
import Colors from "@/constants/colors";

interface BudgetProgressBarProps {
  category: Category;
  spent: number;
  budget: number;
}

export function BudgetProgressBar({ category, spent, budget }: BudgetProgressBarProps) {
  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const overBudget = spent > budget;
  const nearBudget = percentage >= 80 && !overBudget;

  const barColor = overBudget ? Colors.expense : nearBudget ? "#F59E0B" : Colors.primary;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.catRow}>
          <View style={[styles.iconBg, { backgroundColor: category.color + "18" }]}>
            {category.iconFamily === "Ionicons" ? (
              <Ionicons name={category.icon as any} size={18} color={category.color} />
            ) : (
              <MaterialIcons name={category.icon as any} size={18} color={category.color} />
            )}
          </View>
          <Text style={styles.catName}>{category.name}</Text>
        </View>
        <Text style={[styles.amount, overBudget && { color: Colors.expense }]}>
          {formatCurrency(spent)} / {formatCurrency(budget)}
        </Text>
      </View>

      <View style={styles.trackBg}>
        <View style={[styles.trackFill, { width: `${percentage}%`, backgroundColor: barColor }]} />
      </View>

      {overBudget && (
        <Text style={styles.overText}>Over budget by {formatCurrency(spent - budget)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  catName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  amount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  trackBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceTertiary,
    overflow: "hidden",
  },
  trackFill: {
    height: 8,
    borderRadius: 4,
  },
  overText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.expense,
  },
});
