import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/contexts/ThemeContext";
import { PieChart, PieChartLegend } from "@/components/PieChart";
import { ContributionHeatmap } from "@/components/ContributionHeatmap";
import { AnimatedBarChart } from "@/components/AnimatedBarChart";
import { SpendingFlowChart } from "@/components/SpendingFlowChart";
import { SpendingStreakCard } from "@/components/SpendingStreakCard";
import { formatCurrency, getCurrentMonth, getMonthName } from "@/lib/utils";
import { Period } from "@/lib/types";

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { width: screenWidth } = useWindowDimensions();
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
        const cat = categories.find((ct) => ct.id === catId);
        return {
          label: cat?.name || "Other",
          value,
          color: cat?.color || "#78909C",
        };
      })
      .sort((a, b) => b.value - a.value);

    return { income, expense, net: income - expense, pieData, txnCount: filtered.length };
  }, [transactions, categories, period]);

  const periods: { key: Period; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "daily", label: "Today", icon: "today-outline" },
    { key: "monthly", label: "Month", icon: "calendar-outline" },
    { key: "yearly", label: "Year", icon: "earth-outline" },
  ];

  const periodLabel =
    period === "daily"
      ? "Today"
      : period === "monthly"
        ? getMonthName(getCurrentMonth())
        : String(new Date().getFullYear());

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset, backgroundColor: c.background }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: c.text }]}>Analytics</Text>
        <Text style={[styles.periodLabel, { color: c.textSecondary }]}>{periodLabel}</Text>
      </View>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {periods.map((p) => (
          <Pressable
            key={p.key}
            onPress={() => setPeriod(p.key)}
            style={[
              styles.periodChip,
              { backgroundColor: c.surfaceSecondary, borderColor: c.border },
              period === p.key && { backgroundColor: c.primary, borderColor: c.primary },
            ]}
          >
            <Ionicons
              name={p.icon}
              size={14}
              color={period === p.key ? c.textInverse : c.textSecondary}
            />
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
        {/* Summary metrics */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: c.income + "10", borderColor: c.income + "25" }]}>
            <View style={[styles.metricIconWrap, { backgroundColor: c.income + "20" }]}>
              <Ionicons name="arrow-down-outline" size={16} color={c.income} />
            </View>
            <Text style={[styles.metricLabel, { color: c.textSecondary }]}>Income</Text>
            <Text style={[styles.metricValue, { color: c.income }]}>
              {formatCurrency(periodData.income)}
            </Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: c.expense + "10", borderColor: c.expense + "25" }]}>
            <View style={[styles.metricIconWrap, { backgroundColor: c.expense + "20" }]}>
              <Ionicons name="arrow-up-outline" size={16} color={c.expense} />
            </View>
            <Text style={[styles.metricLabel, { color: c.textSecondary }]}>Expenses</Text>
            <Text style={[styles.metricValue, { color: c.expense }]}>
              {formatCurrency(periodData.expense)}
            </Text>
          </View>
        </View>

        {/* Net savings */}
        <View style={[styles.netCard, {
          backgroundColor: (periodData.net >= 0 ? c.income : c.expense) + "10",
          borderColor: (periodData.net >= 0 ? c.income : c.expense) + "25",
        }]}>
          <View style={styles.netCardContent}>
            <View>
              <Text style={[styles.netLabel, { color: c.textSecondary }]}>Net Savings</Text>
              <Text
                style={[
                  styles.netValue,
                  { color: periodData.net >= 0 ? c.income : c.expense },
                ]}
              >
                {periodData.net >= 0 ? "+" : "-"}{formatCurrency(Math.abs(periodData.net))}
              </Text>
            </View>
            <View style={styles.netBadge}>
              <Ionicons
                name={periodData.net >= 0 ? "trending-up-outline" : "trending-down-outline"}
                size={28}
                color={periodData.net >= 0 ? c.income : c.expense}
              />
            </View>
          </View>
          <Text style={[styles.txnCount, { color: c.textTertiary }]}>{periodData.txnCount} transactions</Text>
        </View>

        {/* Quick Insights */}
        <View style={styles.section}>
          <SpendingStreakCard transactions={transactions} />
        </View>

        {/* Contribution Heatmap */}
        <View style={styles.section}>
          <ContributionHeatmap transactions={transactions} period={period} />
        </View>

        {/* Spending Flow Chart */}
        <View style={styles.section}>
          <SpendingFlowChart transactions={transactions} period={period} />
        </View>

        {/* Animated Bar Chart */}
        <View style={styles.section}>
          <AnimatedBarChart transactions={transactions} period={period} />
        </View>

        {/* Pie Chart */}
        <View style={styles.section}>
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
              <Ionicons name="pie-chart-outline" size={40} color={c.textTertiary} />
              <Text style={[styles.emptyText, { color: c.textTertiary }]}>No expense data for this period</Text>
            </View>
          )}
        </View>

        {/* Top Spending */}
        {periodData.pieData.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Top Spending Categories</Text>
            <View style={[styles.topList, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
              {periodData.pieData.slice(0, 5).map((item, idx) => (
                <View key={item.label} style={[styles.barRow, idx < Math.min(periodData.pieData.length - 1, 4) && styles.barRowBorder, { borderBottomColor: c.borderLight }]}>
                  <View style={[styles.rankBadge, { backgroundColor: item.color + "15" }]}>
                    <Text style={[styles.barRank, { color: item.color }]}>{idx + 1}</Text>
                  </View>
                  <View style={styles.barInfo}>
                    <View style={styles.barLabelRow}>
                      <Text style={[styles.barLabel, { color: c.text }]}>{item.label}</Text>
                      <Text style={[styles.barValue, { color: c.textSecondary }]}>{formatCurrency(item.value)}</Text>
                    </View>
                    <View style={[styles.barTrack, { backgroundColor: c.surfaceSecondary }]}>
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
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 26,
    fontFamily: "Rubik_700Bold",
  },
  periodLabel: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
  },
  periodRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  periodChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  periodText: {
    fontSize: 13,
    fontFamily: "Rubik_500Medium",
  },
  metricsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
  },
  metricIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
  },
  metricValue: {
    fontSize: 17,
    fontFamily: "Rubik_700Bold",
  },
  netCard: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
  },
  netCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  netLabel: {
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
  },
  netValue: {
    fontSize: 24,
    fontFamily: "Rubik_700Bold",
  },
  netBadge: {
    opacity: 0.7,
  },
  txnCount: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 12,
  },
  chartContainer: {
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    borderWidth: 1,
  },
  legendContainer: {
    flex: 1,
  },
  emptyChart: {
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
  },
  topList: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  barRowBorder: {
    borderBottomWidth: 1,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  barRank: {
    fontSize: 13,
    fontFamily: "Rubik_700Bold",
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
  },
  barValue: {
    fontSize: 13,
    fontFamily: "Rubik_600SemiBold",
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
});
