import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Svg, { Rect } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useColors } from "@/contexts/ThemeContext";
import type { Transaction } from "@/lib/types";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface HeatmapProps {
  transactions: Transaction[];
  period: "daily" | "monthly" | "yearly";
}

interface DayData {
  date: string;
  income: number;
  expense: number;
  net: number;
}

function getDaysForPeriod(period: "daily" | "monthly" | "yearly"): string[] {
  const now = new Date();
  const days: string[] = [];

  if (period === "daily" || period === "monthly") {
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      days.push(date.toISOString().split("T")[0]);
    }
  } else {
    // Last 365 days for yearly
    for (let i = 364; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split("T")[0]);
    }
  }
  return days;
}

function getColor(
  net: number,
  maxAbs: number,
  income: string,
  expense: string,
  neutral: string,
): string {
  if (net === 0) return neutral;

  const intensity = Math.min(Math.abs(net) / (maxAbs || 1), 1);

  if (net > 0) {
    // Green shades
    const alphas = ["20", "40", "70", "A0", "DD"];
    const idx = Math.min(Math.floor(intensity * 5), 4);
    return income + alphas[idx];
  } else {
    // Red shades
    const alphas = ["20", "40", "70", "A0", "DD"];
    const idx = Math.min(Math.floor(intensity * 5), 4);
    return expense + alphas[idx];
  }
}

function AnimatedCell({
  x,
  y,
  size,
  color,
  delay,
  rx,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  rx: number;
}) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
    );
  }, [delay, opacity]);

  const animatedProps = useAnimatedProps(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedRect
      x={x}
      y={y}
      width={size}
      height={size}
      rx={rx}
      fill={color}
      animatedProps={animatedProps}
    />
  );
}

export function ContributionHeatmap({ transactions, period }: HeatmapProps) {
  const c = useColors();

  const { dayMap, days, maxAbs } = useMemo(() => {
    const days = getDaysForPeriod(period);
    const map: Record<string, DayData> = {};

    days.forEach((date) => {
      map[date] = { date, income: 0, expense: 0, net: 0 };
    });

    transactions.forEach((t) => {
      if (map[t.date]) {
        if (t.type === "income") {
          map[t.date].income += t.amount;
          map[t.date].net += t.amount;
        } else {
          map[t.date].expense += t.amount;
          map[t.date].net -= t.amount;
        }
      }
    });

    let maxAbs = 0;
    Object.values(map).forEach((d) => {
      const a = Math.abs(d.net);
      if (a > maxAbs) maxAbs = a;
    });

    return { dayMap: map, days, maxAbs };
  }, [transactions, period]);

  const isYearly = period === "yearly";
  const cellSize = isYearly ? 11 : 14;
  const cellGap = isYearly ? 2 : 3;
  const cellTotal = cellSize + cellGap;

  // Build grid
  const { grid, numCols } = useMemo(() => {
    if (isYearly) {
      // 53 columns x 7 rows (like GitHub)
      const grid: (string | null)[][] = [];
      const firstDay = new Date(days[0]);
      const startDow = firstDay.getDay(); // 0=Sun

      let col: (string | null)[] = new Array(7).fill(null);
      col[startDow] = days[0];
      let dayIdx = 1;

      for (let row = startDow + 1; row < 7 && dayIdx < days.length; row++) {
        col[row] = days[dayIdx++];
      }
      grid.push(col);

      while (dayIdx < days.length) {
        col = new Array(7).fill(null);
        for (let row = 0; row < 7 && dayIdx < days.length; row++) {
          col[row] = days[dayIdx++];
        }
        grid.push(col);
      }

      return { grid, numCols: grid.length };
    } else {
      // Monthly: 4-6 columns with weeks
      const firstDay = new Date(days[0]);
      const startDow = firstDay.getDay();
      const grid: (string | null)[][] = [];

      let col: (string | null)[] = new Array(7).fill(null);
      col[startDow] = days[0];
      let dayIdx = 1;

      for (let row = startDow + 1; row < 7 && dayIdx < days.length; row++) {
        col[row] = days[dayIdx++];
      }
      grid.push(col);

      while (dayIdx < days.length) {
        col = new Array(7).fill(null);
        for (let row = 0; row < 7 && dayIdx < days.length; row++) {
          col[row] = days[dayIdx++];
        }
        grid.push(col);
      }

      return { grid, numCols: grid.length };
    }
  }, [days, isYearly]);

  const svgWidth = numCols * cellTotal + 20; // +20 for day labels
  const svgHeight = 7 * cellTotal + 16; // +16 for month labels

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const monthLabels = useMemo(() => {
    if (!isYearly) return [];
    const labels: { text: string; col: number }[] = [];
    let lastMonth = -1;
    for (let colIdx = 0; colIdx < grid.length; colIdx++) {
      const firstDate = grid[colIdx].find((d) => d !== null);
      if (firstDate) {
        const month = new Date(firstDate).getMonth();
        if (month !== lastMonth) {
          lastMonth = month;
          labels.push({
            text: new Date(firstDate).toLocaleDateString("en-US", { month: "short" }),
            col: colIdx,
          });
        }
      }
    }
    return labels;
  }, [grid, isYearly]);

  const [selectedDay, setSelectedDay] = React.useState<DayData | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: c.text }]}>Activity Heatmap</Text>
        {selectedDay && (
          <View style={styles.tooltip}>
            <Text style={[styles.tooltipDate, { color: c.textSecondary }]}>
              {new Date(selectedDay.date + "T12:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </Text>
            <Text
              style={[
                styles.tooltipNet,
                { color: selectedDay.net >= 0 ? c.income : c.expense },
              ]}
            >
              {selectedDay.net >= 0 ? "+" : ""}
              {selectedDay.net.toFixed(0)} ETB
            </Text>
          </View>
        )}
      </View>

      <View style={styles.heatmapWrap}>
        {/* Day labels */}
        <View style={[styles.dayLabels, { marginTop: isYearly ? 14 : 0 }]}>
          {dayLabels.map((l, i) => (
            <Text
              key={i}
              style={[
                styles.dayLabel,
                { color: c.textTertiary, height: cellTotal, lineHeight: cellTotal },
              ]}
            >
              {i % 2 === 1 ? l : ""}
            </Text>
          ))}
        </View>

        <View>
          {isYearly && (
            <View style={styles.monthLabelsRow}>
              {monthLabels.map((ml) => (
                <Text
                  key={ml.text + ml.col}
                  style={[
                    styles.monthLabel,
                    { color: c.textTertiary, left: ml.col * cellTotal },
                  ]}
                >
                  {ml.text}
                </Text>
              ))}
            </View>
          )}
          <Svg
            width={svgWidth - 20}
            height={7 * cellTotal}
            style={{ marginTop: isYearly ? 2 : 0 }}
          >
            {grid.map((col, colIdx) =>
              col.map((dateStr, rowIdx) => {
                if (!dateStr) return null;
                const day = dayMap[dateStr];
                const color = day
                  ? getColor(day.net, maxAbs, c.income, c.expense, c.surfaceSecondary)
                  : c.surfaceSecondary;

                return (
                  <AnimatedCell
                    key={dateStr}
                    x={colIdx * cellTotal}
                    y={rowIdx * cellTotal}
                    size={cellSize}
                    color={color}
                    delay={colIdx * 8 + rowIdx * 3}
                    rx={isYearly ? 2 : 3}
                  />
                );
              }),
            )}
          </Svg>

          {/* Invisible touch layer */}
          <View
            style={[
              StyleSheet.absoluteFill,
              { marginTop: isYearly ? 2 : 0 },
            ]}
            pointerEvents="box-none"
          >
            {grid.map((col, colIdx) =>
              col.map((dateStr, rowIdx) => {
                if (!dateStr) return null;
                const day = dayMap[dateStr];
                return (
                  <Pressable
                    key={`touch-${dateStr}`}
                    style={{
                      position: "absolute",
                      left: colIdx * cellTotal,
                      top: rowIdx * cellTotal,
                      width: cellSize,
                      height: cellSize,
                    }}
                    onPress={() => {
                      if (day && (day.income > 0 || day.expense > 0)) {
                        setSelectedDay(
                          selectedDay?.date === dateStr ? null : day,
                        );
                      } else {
                        setSelectedDay(null);
                      }
                    }}
                  />
                );
              }),
            )}
          </View>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <Text style={[styles.legendText, { color: c.textTertiary }]}>More expense</Text>
        <View style={styles.legendCells}>
          {["DD", "A0", "70", "40", "20"].map((a) => (
            <View
              key={`e${a}`}
              style={[styles.legendCell, { backgroundColor: c.expense + a }]}
            />
          ))}
          <View style={[styles.legendCell, { backgroundColor: c.surfaceSecondary }]} />
          {["20", "40", "70", "A0", "DD"].map((a) => (
            <View
              key={`i${a}`}
              style={[styles.legendCell, { backgroundColor: c.income + a }]}
            />
          ))}
        </View>
        <Text style={[styles.legendText, { color: c.textTertiary }]}>More income</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
  tooltip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tooltipDate: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
  },
  tooltipNet: {
    fontSize: 13,
    fontFamily: "Rubik_600SemiBold",
  },
  heatmapWrap: {
    flexDirection: "row",
    overflow: "hidden",
  },
  dayLabels: {
    marginRight: 4,
  },
  dayLabel: {
    fontSize: 9,
    fontFamily: "Rubik_400Regular",
    textAlign: "right",
    width: 12,
  },
  monthLabelsRow: {
    height: 14,
    position: "relative",
  },
  monthLabel: {
    fontSize: 9,
    fontFamily: "Rubik_500Medium",
    position: "absolute",
    top: 0,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    gap: 6,
  },
  legendCells: {
    flexDirection: "row",
    gap: 2,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 9,
    fontFamily: "Rubik_400Regular",
  },
});
