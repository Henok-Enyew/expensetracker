import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { Category } from "@/constants/categories";
import { formatCurrencyShort } from "@/lib/utils";
import { useColors } from "@/contexts/ThemeContext";
import Colors from "@/constants/colors";

interface BudgetProgressBarProps {
  category?: Category | null;
  label?: string;
  spent: number;
  budget: number;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function BudgetProgressBar({ category, label, spent, budget, onPress, onLongPress }: BudgetProgressBarProps) {
  const c = useColors();
  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const overBudget = spent > budget;
  const nearBudget = percentage >= 80 && !overBudget;
  const barColor = overBudget ? c.expense : nearBudget ? "#F59E0B" : c.primary;
  const displayName = label ?? category?.name ?? "Overall";

  const content = (
    <View style={[styles.container, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
      <View style={styles.header}>
        <View style={styles.catRow}>
          {category ? (
            <View style={[styles.iconBg, { backgroundColor: category.color + "18" }]}>
              {category.iconFamily === "Ionicons" ? (
                <Ionicons name={category.icon as any} size={18} color={category.color} />
              ) : (
                <MaterialIcons name={category.icon as any} size={18} color={category.color} />
              )}
            </View>
          ) : (
            <View style={[styles.iconBg, { backgroundColor: c.primary + "18" }]}>
              <Ionicons name="wallet-outline" size={18} color={c.primary} />
            </View>
          )}
          <Text style={[styles.catName, { color: c.text }]} numberOfLines={1}>{displayName}</Text>
        </View>
        <Text style={[styles.amount, { color: c.textSecondary }, overBudget && { color: c.expense }]} numberOfLines={1}>
          {formatCurrencyShort(spent)} / {formatCurrencyShort(budget)}
        </Text>
      </View>

      <View style={[styles.trackBg, { backgroundColor: c.surfaceTertiary }]}>
        <View style={[styles.trackFill, { width: `${percentage}%`, backgroundColor: barColor }]} />
      </View>

      <View style={styles.footer}>
        {overBudget ? (
          <Text style={[styles.overText, { color: c.expense }]}>
            Over by {formatCurrencyShort(spent - budget)}
          </Text>
        ) : (
          <Text style={[styles.remainText, { color: c.textTertiary }]}>
            {formatCurrencyShort(budget - spent)} remaining
          </Text>
        )}
        <Text style={[styles.pctText, { color: barColor }]}>
          {Math.round(budget > 0 ? (spent / budget) * 100 : 0)}%
        </Text>
      </View>
    </View>
  );

  if (onPress || onLongPress) {
    return (
      <Pressable onPress={onPress} onLongPress={onLongPress}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
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
    fontFamily: "Rubik_500Medium",
    color: Colors.text,
    flexShrink: 1,
  },
  amount: {
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
    color: Colors.textSecondary,
    flexShrink: 0,
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
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  overText: {
    fontSize: 11,
    fontFamily: "Rubik_500Medium",
    color: Colors.expense,
  },
  remainText: {
    fontSize: 11,
    fontFamily: "Rubik_400Regular",
  },
  pctText: {
    fontSize: 11,
    fontFamily: "Rubik_600SemiBold",
  },
});
