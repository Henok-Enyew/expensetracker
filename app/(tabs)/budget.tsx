import React, { useMemo, useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/contexts/ThemeContext";
import { BudgetProgressBar } from "@/components/BudgetProgressBar";
import { formatCurrencyShort, getPeriodDateRange, getPeriodLabel } from "@/lib/utils";
import type { BudgetPeriod, Budget } from "@/lib/types";
import Colors from "@/constants/colors";

const PERIODS: BudgetPeriod[] = ["daily", "weekly", "monthly", "yearly"];
const PERIOD_ICONS: Record<BudgetPeriod, string> = {
  daily: "today-outline",
  weekly: "calendar-outline",
  monthly: "calendar",
  yearly: "globe-outline",
};

export default function BudgetScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { budgets, transactions, categories, saveBudgets } = useApp();
  const [selectedPeriod, setSelectedPeriod] = useState<BudgetPeriod>("monthly");
  const alertedBudgets = useRef<Set<string>>(new Set());
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const dateRange = useMemo(() => getPeriodDateRange(selectedPeriod), [selectedPeriod]);

  const periodBudgets = useMemo(() => {
    return budgets.filter((b) => b.period === selectedPeriod);
  }, [budgets, selectedPeriod]);

  const overallBudget = useMemo(() => {
    return periodBudgets.find((b) => b.categoryId === null);
  }, [periodBudgets]);

  const categoryBudgets = useMemo(() => {
    return periodBudgets.filter((b) => b.categoryId !== null);
  }, [periodBudgets]);

  const periodExpenses = useMemo(() => {
    return transactions.filter(
      (t) => t.type === "expense" && t.date >= dateRange.start && t.date <= dateRange.end,
    );
  }, [transactions, dateRange]);

  const totalSpent = useMemo(() => {
    return periodExpenses.reduce((s, t) => s + t.amount, 0);
  }, [periodExpenses]);

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    periodExpenses.forEach((t) => {
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
    });
    return map;
  }, [periodExpenses]);

  // Alerts at 80% and 100%
  useEffect(() => {
    const allBudgetsToCheck: { budget: Budget; spent: number; label: string }[] = [];

    if (overallBudget) {
      allBudgetsToCheck.push({
        budget: overallBudget,
        spent: totalSpent,
        label: `overall ${getPeriodLabel(selectedPeriod).toLowerCase()}`,
      });
    }
    for (const b of categoryBudgets) {
      const cat = categories.find((ct) => ct.id === b.categoryId);
      if (!cat) continue;
      allBudgetsToCheck.push({
        budget: b,
        spent: spentByCategory[b.categoryId!] || 0,
        label: `${cat.name} (${getPeriodLabel(selectedPeriod).toLowerCase()})`,
      });
    }

    for (const { budget: b, spent, label } of allBudgetsToCheck) {
      if (b.amount <= 0) continue;
      const pct = spent / b.amount;
      const key100 = `${b.id}_100`;
      const key80 = `${b.id}_80`;

      if (pct >= 1 && !alertedBudgets.current.has(key100)) {
        alertedBudgets.current.add(key100);
        alertedBudgets.current.add(key80);
        Alert.alert(
          "Over Budget!",
          `You've exceeded your ${label} budget (${formatCurrencyShort(spent)} / ${formatCurrencyShort(b.amount)}).`,
        );
      } else if (pct >= 0.8 && pct < 1 && !alertedBudgets.current.has(key80)) {
        alertedBudgets.current.add(key80);
        Alert.alert(
          "Budget Warning",
          `You've used ${Math.round(pct * 100)}% of your ${label} budget.`,
        );
      }
    }
  }, [overallBudget, categoryBudgets, totalSpent, spentByCategory, selectedPeriod, categories]);

  const handleDeleteBudget = (budget: Budget) => {
    const cat = budget.categoryId ? categories.find((ct) => ct.id === budget.categoryId) : null;
    const name = cat ? cat.name : "Overall";
    Alert.alert(
      "Delete Budget",
      `Remove the ${getPeriodLabel(budget.period).toLowerCase()} budget for "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => saveBudgets(budgets.filter((b) => b.id !== budget.id)),
        },
      ],
    );
  };

  const handleEditBudget = (budget: Budget) => {
    router.push({ pathname: "/add-budget", params: { editId: budget.id } });
  };

  const overallPct = overallBudget && overallBudget.amount > 0
    ? Math.min((totalSpent / overallBudget.amount) * 100, 100)
    : 0;
  const overallBarColor = overallBudget
    ? totalSpent > overallBudget.amount
      ? c.expense
      : totalSpent > overallBudget.amount * 0.8
        ? "#F59E0B"
        : c.primary
    : c.primary;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset, backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Budget</Text>
        <Pressable onPress={() => router.push({ pathname: "/add-budget", params: { defaultPeriod: selectedPeriod } })}>
          <Ionicons name="add-circle-outline" size={28} color={c.primary} />
        </Pressable>
      </View>

      {/* Period Tabs: label row + count row below so button size and label alignment stay consistent */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodRow}>
        {PERIODS.map((p) => {
          const active = selectedPeriod === p;
          const count = budgets.filter((b) => b.period === p).length;
          return (
            <Pressable
              key={p}
              onPress={() => setSelectedPeriod(p)}
              style={[
                styles.periodChip,
                { backgroundColor: c.surfaceSecondary, borderColor: "transparent" },
                active && { backgroundColor: c.primary + "12", borderColor: c.primary },
              ]}
            >
              <View style={styles.periodChipLabelRow}>
                <Ionicons
                  name={PERIOD_ICONS[p] as any}
                  size={16}
                  color={active ? c.primary : c.textTertiary}
                />
                <Text style={[styles.periodText, { color: c.textSecondary }, active && { color: c.primary, fontFamily: "Rubik_600SemiBold" }]}>
                  {getPeriodLabel(p)}
                </Text>
              </View>
              <View style={styles.periodChipCountRow}>
                <Text style={[styles.periodCountText, { color: active ? c.primary : c.textTertiary }]}>{count}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Date range label */}
        <Text style={[styles.dateLabel, { color: c.textTertiary }]}>{dateRange.label}</Text>

        {/* Overall Budget Card */}
        {overallBudget && (
          <Pressable
            style={[styles.overallCard, { backgroundColor: c.surface, borderColor: c.borderLight }]}
            onPress={() => handleEditBudget(overallBudget)}
            onLongPress={() => handleDeleteBudget(overallBudget)}
          >
            <View style={styles.overallHeader}>
              <View style={[styles.overallIconBg, { backgroundColor: c.primary + "15" }]}>
                <Ionicons name="shield-checkmark-outline" size={24} color={c.primary} />
              </View>
              <View style={styles.overallInfo}>
                <Text style={[styles.overallTitle, { color: c.text }]}>Overall {getPeriodLabel(selectedPeriod)} Budget</Text>
                <Text style={[styles.overallSubtitle, { color: c.textSecondary }]}>
                  {formatCurrencyShort(totalSpent)} spent of {formatCurrencyShort(overallBudget.amount)}
                </Text>
              </View>
              <Text style={[styles.overallPct, { color: overallBarColor }]}>
                {Math.round(overallBudget.amount > 0 ? (totalSpent / overallBudget.amount) * 100 : 0)}%
              </Text>
            </View>

            <View style={[styles.overallTrack, { backgroundColor: c.surfaceTertiary }]}>
              <View style={[styles.overallFill, { width: `${overallPct}%`, backgroundColor: overallBarColor }]} />
            </View>

            <View style={styles.overallStats}>
              <View style={styles.overallStat}>
                <Text style={[styles.statLabel, { color: c.textTertiary }]}>Budget</Text>
                <Text style={[styles.statValue, { color: c.text }]}>{formatCurrencyShort(overallBudget.amount)}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: c.borderLight }]} />
              <View style={styles.overallStat}>
                <Text style={[styles.statLabel, { color: c.textTertiary }]}>Spent</Text>
                <Text style={[styles.statValue, { color: c.expense }]}>{formatCurrencyShort(totalSpent)}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: c.borderLight }]} />
              <View style={styles.overallStat}>
                <Text style={[styles.statLabel, { color: c.textTertiary }]}>
                  {totalSpent > overallBudget.amount ? "Over" : "Left"}
                </Text>
                <Text style={[styles.statValue, { color: totalSpent > overallBudget.amount ? c.expense : c.income }]}>
                  {formatCurrencyShort(Math.abs(overallBudget.amount - totalSpent))}
                </Text>
              </View>
            </View>
          </Pressable>
        )}

        {/* Category Budgets */}
        {categoryBudgets.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>CATEGORY BUDGETS</Text>
            <View style={styles.budgetList}>
              {categoryBudgets.map((b) => {
                const cat = categories.find((ct) => ct.id === b.categoryId);
                if (!cat) return null;
                return (
                  <BudgetProgressBar
                    key={b.id}
                    category={cat}
                    spent={spentByCategory[b.categoryId!] || 0}
                    budget={b.amount}
                    onPress={() => handleEditBudget(b)}
                    onLongPress={() => handleDeleteBudget(b)}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* Empty State */}
        {periodBudgets.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: c.primary + "12" }]}>
              <Ionicons name="wallet-outline" size={40} color={c.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: c.text }]}>No {getPeriodLabel(selectedPeriod).toLowerCase()} budgets</Text>
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>
              Set a {getPeriodLabel(selectedPeriod).toLowerCase()} budget to track and control your spending
            </Text>
            <Pressable
              style={[styles.addButton, { backgroundColor: c.primary }]}
              onPress={() => router.push({ pathname: "/add-budget", params: { defaultPeriod: selectedPeriod } })}
            >
              <Ionicons name="add" size={20} color={c.textInverse} />
              <Text style={[styles.addButtonText, { color: c.textInverse }]}>Add Budget</Text>
            </Pressable>
          </View>
        )}
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
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontFamily: "Rubik_700Bold",
    color: Colors.text,
  },
  periodRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  periodChip: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 76,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 4,
  },
  periodChipLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  periodText: {
    fontSize: 13,
    fontFamily: "Rubik_500Medium",
  },
  periodChipCountRow: {
    minHeight: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  periodCountText: {
    fontSize: 12,
    fontFamily: "Rubik_600SemiBold",
  },
  dateLabel: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  overallCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  overallHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  overallIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  overallInfo: {
    flex: 1,
    gap: 2,
  },
  overallTitle: {
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
  overallSubtitle: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
  },
  overallPct: {
    fontSize: 20,
    fontFamily: "Rubik_700Bold",
  },
  overallTrack: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  overallFill: {
    height: 10,
    borderRadius: 5,
  },
  overallStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  overallStat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Rubik_400Regular",
  },
  statValue: {
    fontSize: 14,
    fontFamily: "Rubik_700Bold",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Rubik_600SemiBold",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  budgetList: {
    gap: 10,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.text,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
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
    fontFamily: "Rubik_600SemiBold",
    color: Colors.textInverse,
  },
});
