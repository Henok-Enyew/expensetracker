import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useApp } from "@/contexts/AppContext";
import { BudgetProgressBar } from "@/components/BudgetProgressBar";
import { formatCurrency, getCurrentMonth, getMonthName } from "@/lib/utils";
import Colors from "@/constants/colors";

export default function BudgetScreen() {
  const insets = useSafeAreaInsets();
  const { budgets, transactions, categories } = useApp();
  const currentMonth = getCurrentMonth();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const monthlyBudgets = useMemo(() => {
    return budgets.filter((b) => b.month === currentMonth);
  }, [budgets, currentMonth]);

  const spentByCategory = useMemo(() => {
    const monthTxns = transactions.filter(
      (t) => t.date.startsWith(currentMonth) && t.type === "expense",
    );
    const map: Record<string, number> = {};
    monthTxns.forEach((t) => {
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
    });
    return map;
  }, [transactions, currentMonth]);

  const totalBudget = monthlyBudgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = Object.values(spentByCategory).reduce((s, v) => s + v, 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Budget</Text>
        <Pressable onPress={() => router.push("/add-budget")}>
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <Text style={styles.monthLabel}>{getMonthName(currentMonth)}</Text>

        {monthlyBudgets.length > 0 && (
          <View style={styles.overviewCard}>
            <View style={styles.overviewRow}>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Total Budget</Text>
                <Text style={styles.overviewValue}>{formatCurrency(totalBudget)}</Text>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Spent</Text>
                <Text style={[styles.overviewValue, { color: Colors.expense }]}>
                  {formatCurrency(totalSpent)}
                </Text>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Remaining</Text>
                <Text
                  style={[
                    styles.overviewValue,
                    { color: totalBudget - totalSpent >= 0 ? Colors.income : Colors.expense },
                  ]}
                >
                  {formatCurrency(Math.abs(totalBudget - totalSpent))}
                </Text>
              </View>
            </View>

            <View style={styles.overviewBar}>
              <View
                style={[
                  styles.overviewBarFill,
                  {
                    width: `${Math.min((totalSpent / Math.max(totalBudget, 1)) * 100, 100)}%`,
                    backgroundColor:
                      totalSpent > totalBudget
                        ? Colors.expense
                        : totalSpent > totalBudget * 0.8
                          ? "#F59E0B"
                          : Colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        )}

        <View style={styles.budgetList}>
          {monthlyBudgets.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No budgets set</Text>
              <Text style={styles.emptyText}>
                Set monthly budgets to track your spending limits
              </Text>
              <Pressable style={styles.addButton} onPress={() => router.push("/add-budget")}>
                <Ionicons name="add" size={20} color={Colors.textInverse} />
                <Text style={styles.addButtonText}>Add Budget</Text>
              </Pressable>
            </View>
          ) : (
            monthlyBudgets.map((b) => {
              const cat = categories.find((c) => c.id === b.categoryId);
              if (!cat) return null;
              return (
                <BudgetProgressBar
                  key={b.id}
                  category={cat}
                  spent={spentByCategory[b.categoryId] || 0}
                  budget={b.amount}
                />
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  monthLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  overviewCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 20,
  },
  overviewRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  overviewItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  overviewDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  overviewLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  overviewValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  overviewBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceTertiary,
    overflow: "hidden",
  },
  overviewBarFill: {
    height: 8,
    borderRadius: 4,
  },
  budgetList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textInverse,
  },
});
