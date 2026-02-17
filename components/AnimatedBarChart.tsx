import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect, Line } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useColors } from "@/contexts/ThemeContext";
import { formatCurrencyShort } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface BarChartProps {
  transactions: Transaction[];
  period: "daily" | "monthly" | "yearly";
  height?: number;
}

interface BarData {
  label: string;
  income: number;
  expense: number;
}

function AnimatedBar({
  x,
  targetY,
  width,
  targetHeight,
  color,
  delay,
  baseY,
  rx,
}: {
  x: number;
  targetY: number;
  width: number;
  targetHeight: number;
  color: string;
  delay: number;
  baseY: number;
  rx: number;
}) {
  const height = useSharedValue(0);
  const y = useSharedValue(baseY);

  useEffect(() => {
    height.value = withDelay(
      delay,
      withTiming(targetHeight, { duration: 600, easing: Easing.out(Easing.back(1.1)) }),
    );
    y.value = withDelay(
      delay,
      withTiming(targetY, { duration: 600, easing: Easing.out(Easing.back(1.1)) }),
    );
  }, [delay, targetHeight, targetY, baseY, height, y]);

  const animatedProps = useAnimatedProps(() => ({
    y: y.value,
    height: height.value,
  }));

  return (
    <AnimatedRect
      x={x}
      width={width}
      rx={rx}
      fill={color}
      animatedProps={animatedProps}
    />
  );
}

export function AnimatedBarChart({ transactions, period, height = 180 }: BarChartProps) {
  const c = useColors();

  const bars = useMemo((): BarData[] => {
    const now = new Date();

    if (period === "daily") {
      // Hourly breakdown of today
      const today = now.toISOString().split("T")[0];
      const todayTxns = transactions.filter((t) => t.date === today);
      const hours: BarData[] = [];
      for (let h = 0; h < 24; h += 3) {
        hours.push({
          label: `${h}`,
          income: 0,
          expense: 0,
        });
      }
      todayTxns.forEach((t) => {
        const hour = new Date(t.createdAt).getHours();
        const bucket = Math.floor(hour / 3);
        if (bucket < hours.length) {
          if (t.type === "income") hours[bucket].income += t.amount;
          else hours[bucket].expense += t.amount;
        }
      });
      return hours;
    } else if (period === "monthly") {
      // Weekly breakdown of current month
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const weeks: BarData[] = [];
      const weekSize = 7;

      for (let d = 1; d <= daysInMonth; d += weekSize) {
        const endDay = Math.min(d + weekSize - 1, daysInMonth);
        weeks.push({
          label: `${d}-${endDay}`,
          income: 0,
          expense: 0,
        });
      }

      const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
      transactions
        .filter((t) => t.date.startsWith(monthStr))
        .forEach((t) => {
          const day = parseInt(t.date.split("-")[2]);
          const weekIdx = Math.floor((day - 1) / weekSize);
          if (weekIdx < weeks.length) {
            if (t.type === "income") weeks[weekIdx].income += t.amount;
            else weeks[weekIdx].expense += t.amount;
          }
        });
      return weeks;
    } else {
      // Monthly breakdown for the year
      const year = String(now.getFullYear());
      const months: BarData[] = [];
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      for (let m = 0; m < 12; m++) {
        months.push({ label: monthNames[m], income: 0, expense: 0 });
      }

      transactions
        .filter((t) => t.date.startsWith(year))
        .forEach((t) => {
          const monthIdx = parseInt(t.date.split("-")[1]) - 1;
          if (monthIdx >= 0 && monthIdx < 12) {
            if (t.type === "income") months[monthIdx].income += t.amount;
            else months[monthIdx].expense += t.amount;
          }
        });
      return months;
    }
  }, [transactions, period]);

  const maxVal = useMemo(() => {
    let max = 0;
    bars.forEach((b) => {
      max = Math.max(max, b.income, b.expense);
    });
    return max || 1;
  }, [bars]);

  const chartPadding = { top: 20, bottom: 28, left: 0, right: 0 };
  const chartHeight = height - chartPadding.top - chartPadding.bottom;
  const barGroupWidth = 100 / bars.length;
  const barWidth = Math.min(barGroupWidth * 0.35, 14);

  // Y-axis grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <View style={[styles.container, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
      <Text style={[styles.title, { color: c.text }]}>Income vs Expenses</Text>

      <View style={[styles.chartArea, { height }]}>
        {/* Grid lines */}
        <Svg
          width="100%"
          height={height}
          style={StyleSheet.absoluteFill}
        >
          {gridLines.map((pct) => {
            const y = chartPadding.top + chartHeight * (1 - pct);
            return (
              <Line
                key={pct}
                x1="0"
                y1={y}
                x2="100%"
                y2={y}
                stroke={c.borderLight}
                strokeWidth={1}
                strokeDasharray={pct > 0 ? "4,4" : undefined}
              />
            );
          })}
        </Svg>

        {/* Grid labels */}
        {gridLines
          .filter((pct) => pct > 0)
          .map((pct) => {
            const y = chartPadding.top + chartHeight * (1 - pct);
            return (
              <Text
                key={`label-${pct}`}
                style={[
                  styles.gridLabel,
                  { color: c.textTertiary, top: y - 7 },
                ]}
              >
                {formatCurrencyShort(maxVal * pct).replace("ETB ", "")}
              </Text>
            );
          })}

        {/* Bars */}
        <View style={[styles.barsRow, { paddingTop: chartPadding.top, height: chartHeight + chartPadding.top }]}>
          {bars.map((bar, idx) => {
            const incomeH = (bar.income / maxVal) * chartHeight;
            const expenseH = (bar.expense / maxVal) * chartHeight;
            const baseY = chartPadding.top + chartHeight;

            return (
              <View key={bar.label} style={[styles.barGroup, { width: `${barGroupWidth}%` as any }]}>
                <Svg width={barWidth * 2 + 3} height={height - chartPadding.bottom}>
                  <AnimatedBar
                    x={0}
                    targetY={baseY - incomeH}
                    width={barWidth}
                    targetHeight={incomeH}
                    color={c.income}
                    delay={idx * 60}
                    baseY={baseY}
                    rx={2}
                  />
                  <AnimatedBar
                    x={barWidth + 3}
                    targetY={baseY - expenseH}
                    width={barWidth}
                    targetHeight={expenseH}
                    color={c.expense}
                    delay={idx * 60 + 30}
                    baseY={baseY}
                    rx={2}
                  />
                </Svg>
              </View>
            );
          })}
        </View>

        {/* X labels */}
        <View style={styles.xLabels}>
          {bars.map((bar) => (
            <Text
              key={bar.label}
              style={[
                styles.xLabel,
                { color: c.textTertiary, width: `${barGroupWidth}%` as any },
              ]}
            >
              {bar.label}
            </Text>
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: c.income }]} />
          <Text style={[styles.legendText, { color: c.textSecondary }]}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: c.expense }]} />
          <Text style={[styles.legendText, { color: c.textSecondary }]}>Expense</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 12,
  },
  chartArea: {
    position: "relative",
    overflow: "hidden",
  },
  gridLabel: {
    position: "absolute",
    right: 4,
    fontSize: 9,
    fontFamily: "Rubik_400Regular",
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 28,
  },
  barGroup: {
    alignItems: "center",
  },
  xLabels: {
    flexDirection: "row",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  xLabel: {
    textAlign: "center",
    fontSize: 9,
    fontFamily: "Rubik_500Medium",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontFamily: "Rubik_500Medium",
  },
});
