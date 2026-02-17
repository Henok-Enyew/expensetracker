import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/contexts/ThemeContext";
import { PieChart, PieChartLegend } from "@/components/PieChart";
import { formatCurrency, getCurrentMonth, getMonthName } from "@/lib/utils";
import { Period } from "@/lib/types";
import Colors from "@/constants/colors";

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { transactions, categories } = useApp();
  const [period, setPeriod] = useState<Period>("monthly");
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const periodData = useMemo(() => {
    const now = new Date();
    let filtered = transactions;

    if (period === "daily") {
      const today = now.toISOString().split("T")[0];
      filtered = transactions.filter((t) => t.date === today);
    } else if (period === "monthly") {
      const month = getCurrentMonth();
      filtered = transactions.filter((t) => t.date.startsWith(month));
    } else {
      const year = String(now.getFullYear());
      filtered = transactions.filter((t) => t.date.startsWith(year));
    }

    const income = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    const catBreakdown: Record<string, number> = {};
    filtered
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        catBreakdown[t.categoryId] = (catBreakdown[t.categoryId] || 0) + t.amount;
      });

    const pieData = Object.entries(catBreakdown)
      .map(([catId, value]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          label: cat?.name || "Other",
          value,
          color: cat?.color || "#78909C",
        };
      })
      .sort((a, b) => b.value - a.value);

    return { income, expense, net: income - expense, pieData, txnCount: filtered.length };
  }, [transactions, categories, period]);

  const periods: { key: Period; label: string }[] = [
    { key: "daily", label: "Today" },
    { key: "monthly", label: "Month" },
    { key: "yearly", label: "Year" },
  ];

  const periodLabel =
    period === "daily"
      ? "Today"
      : period === "monthly"
        ? getMonthName(getCurrentMonth())
        : String(new Date().getFullYear());

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset, backgroundColor: c.background }]}>
      <Text style={[styles.title, { color: c.text }]}>Analytics</Text>

      <View style={styles.periodRow}>
        {periods.map((p) => (
          <Pressable
            key={p.key}
            onPress={() => setPeriod(p.key)}
            style={[
              styles.periodChip,
              { backgroundColor: c.surfaceSecondary },
              period === p.key && { backgroundColor: c.primary },
            ]}
          >
            <Text style={[
              styles.periodText,
              { color: c.textSecondary },
              period === p.key && { color: c.textInverse },
            ]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <Text style={[styles.periodLabel, { color: c.textSecondary }]}>{periodLabel}</Text>

        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: c.income + "10", borderColor: c.income + "25" }]}>
            <Text style={[styles.metricLabel, { color: c.textSecondary }]}>Income</Text>
            <Text style={[styles.metricValue, { color: c.income }]}>
              {formatCurrency(periodData.income)}
            </Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: c.expense + "10", borderColor: c.expense + "25" }]}>
            <Text style={[styles.metricLabel, { color: c.textSecondary }]}>Expenses</Text>
            <Text style={[styles.metricValue, { color: c.expense }]}>
              {formatCurrency(periodData.expense)}
            </Text>
          </View>
        </View>

        <View style={[styles.netCard, {
          backgroundColor: (periodData.net >= 0 ? c.income : c.expense) + "10",
          borderColor: (periodData.net >= 0 ? c.income : c.expense) + "25",
        }]}>
          <Text style={[styles.netLabel, { color: c.textSecondary }]}>Net Savings</Text>
          <Text
            style={[
              styles.netValue,
              { color: periodData.net >= 0 ? c.income : c.expense },
            ]}
          >
            {periodData.net >= 0 ? "+" : "-"}{formatCurrency(Math.abs(periodData.net))}
          </Text>
          <Text style={[styles.txnCount, { color: c.textTertiary }]}>{periodData.txnCount} transactions</Text>
        </View>

        <View style={styles.chartSection}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Spending by Category</Text>
          {periodData.pieData.length > 0 ? (
            <View style={[styles.chartContainer, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
              <PieChart
                data={periodData.pieData}
                size={180}
                centerValue={formatCurrency(periodData.expense)}
                centerLabel="Total"
              />
              <View style={styles.legendContainer}>
                <PieChartLegend data={periodData.pieData} />
              </View>
            </View>
          ) : (
            <View style={[styles.emptyChart, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
              <Text style={[styles.emptyText, { color: c.textTertiary }]}>No expense data for this period</Text>
            </View>
          )}
        </View>

        {periodData.pieData.length > 0 && (
          <View style={styles.topSpending}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Top Spending Categories</Text>
            {periodData.pieData.slice(0, 5).map((item, idx) => (
              <View key={item.label} style={styles.barRow}>
                <Text style={[styles.barRank, { color: c.textTertiary }]}>{idx + 1}</Text>
                <View style={styles.barInfo}>
                  <View style={styles.barLabelRow}>
                    <Text style={[styles.barLabel, { color: c.text }]}>{item.label}</Text>
                    <Text style={[styles.barValue, { color: c.textSecondary }]}>{formatCurrency(item.value)}</Text>
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: c.surfaceTertiary }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${(item.value / (periodData.pieData[0]?.value || 1)) * 100}%`,
                          backgroundColor: item.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))}
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
  title: {
    fontSize: 26,
    fontFamily: "Rubik_700Bold",
    color: Colors.text,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  periodRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  periodChip: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
  },
  periodChipActive: {
    backgroundColor: Colors.primary,
  },
  periodText: {
    fontSize: 13,
    fontFamily: "Rubik_500Medium",
    color: Colors.textSecondary,
  },
  periodTextActive: {
    color: Colors.textInverse,
  },
  periodLabel: {
    fontSize: 15,
    fontFamily: "Rubik_500Medium",
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    gap: 4,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
    color: Colors.textSecondary,
  },
  metricValue: {
    fontSize: 18,
    fontFamily: "Rubik_700Bold",
  },
  netCard: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  netLabel: {
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
    color: Colors.textSecondary,
  },
  netValue: {
    fontSize: 24,
    fontFamily: "Rubik_700Bold",
  },
  txnCount: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    color: Colors.textTertiary,
  },
  chartSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.text,
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  legendContainer: {
    flex: 1,
  },
  emptyChart: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    color: Colors.textTertiary,
  },
  topSpending: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  barRank: {
    width: 20,
    fontSize: 14,
    fontFamily: "Rubik_700Bold",
    color: Colors.textTertiary,
    textAlign: "center",
  },
  barInfo: {
    flex: 1,
    gap: 6,
  },
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  barLabel: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
    color: Colors.text,
  },
  barValue: {
    fontSize: 13,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.textSecondary,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceTertiary,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
});
