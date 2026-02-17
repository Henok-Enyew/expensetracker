import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from "react-native-svg";
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

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface FlowChartProps {
  transactions: Transaction[];
  period: "daily" | "monthly" | "yearly";
  height?: number;
}

interface DataPoint {
  label: string;
  value: number;
}

function AnimatedLine({
  d,
  stroke,
  strokeWidth,
  delay,
}: {
  d: string;
  stroke: string;
  strokeWidth: number;
  delay: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) }),
    );
  }, [delay, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: 2000 * (1 - progress.value),
  }));

  return (
    <AnimatedPath
      d={d}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="2000"
      animatedProps={animatedProps}
    />
  );
}

function AnimatedDot({
  cx,
  cy,
  r,
  fill,
  delay,
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  delay: number;
}) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withTiming(r, { duration: 400, easing: Easing.out(Easing.back(2)) }),
    );
  }, [delay, r, scale]);

  const animatedProps = useAnimatedProps(() => ({
    r: scale.value,
  }));

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      fill={fill}
      animatedProps={animatedProps}
    />
  );
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

export function SpendingFlowChart({ transactions, period, height = 180 }: FlowChartProps) {
  const c = useColors();

  const dataPoints = useMemo((): DataPoint[] => {
    const now = new Date();

    if (period === "daily") {
      // Last 7 days cumulative net
      const points: DataPoint[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const dayTxns = transactions.filter((t) => t.date === dateStr);
        const net = dayTxns.reduce(
          (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
          0,
        );
        points.push({
          label: d.toLocaleDateString("en-US", { weekday: "short" }),
          value: net,
        });
      }
      return points;
    } else if (period === "monthly") {
      // Daily net for current month
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const currentDay = now.getDate();
      const points: DataPoint[] = [];
      const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

      let cumulative = 0;
      for (let d = 1; d <= Math.min(currentDay, daysInMonth); d++) {
        const dateStr = `${monthStr}-${String(d).padStart(2, "0")}`;
        const dayTxns = transactions.filter((t) => t.date === dateStr);
        const net = dayTxns.reduce(
          (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
          0,
        );
        cumulative += net;
        if (d % 3 === 1 || d === currentDay) {
          points.push({
            label: String(d),
            value: cumulative,
          });
        }
      }
      return points;
    } else {
      // Monthly net for the year
      const year = String(now.getFullYear());
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const points: DataPoint[] = [];
      let cumulative = 0;

      for (let m = 0; m < 12; m++) {
        const monthStr = `${year}-${String(m + 1).padStart(2, "0")}`;
        const monthTxns = transactions.filter((t) => t.date.startsWith(monthStr));
        const net = monthTxns.reduce(
          (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
          0,
        );
        cumulative += net;
        points.push({ label: monthNames[m], value: cumulative });
      }
      return points;
    }
  }, [transactions, period]);

  const padding = { top: 24, bottom: 28, left: 8, right: 8 };
  const chartWidth = 300;
  const chartHeight = height - padding.top - padding.bottom;

  const { minVal, maxVal, points, zeroY, areaPath, linePath } = useMemo(() => {
    if (dataPoints.length === 0) return { minVal: 0, maxVal: 0, points: [], zeroY: 0, areaPath: "", linePath: "" };

    let minVal = Infinity;
    let maxVal = -Infinity;
    dataPoints.forEach((d) => {
      minVal = Math.min(minVal, d.value);
      maxVal = Math.max(maxVal, d.value);
    });

    const range = maxVal - minVal || 1;
    const extraPad = range * 0.1;
    const adjMin = minVal - extraPad;
    const adjMax = maxVal + extraPad;
    const adjRange = adjMax - adjMin;

    const points = dataPoints.map((d, i) => ({
      x: padding.left + (i / Math.max(dataPoints.length - 1, 1)) * (chartWidth - padding.left - padding.right),
      y: padding.top + chartHeight - ((d.value - adjMin) / adjRange) * chartHeight,
      value: d.value,
    }));

    const zeroY = padding.top + chartHeight - ((0 - adjMin) / adjRange) * chartHeight;

    const linePath = buildSmoothPath(points);

    // Area under curve
    let areaPath = linePath;
    if (points.length > 0) {
      const lastPt = points[points.length - 1];
      const firstPt = points[0];
      areaPath += ` L ${lastPt.x} ${zeroY} L ${firstPt.x} ${zeroY} Z`;
    }

    return { minVal, maxVal, points, zeroY, areaPath, linePath };
  }, [dataPoints, chartWidth, chartHeight, padding]);

  const isPositive = dataPoints.length > 0 && dataPoints[dataPoints.length - 1].value >= 0;
  const lineColor = isPositive ? c.income : c.expense;
  const gradientId = isPositive ? "gradGreen" : "gradRed";

  return (
    <View style={[styles.container, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: c.text }]}>
          {period === "monthly" || period === "yearly" ? "Cumulative Flow" : "Daily Net"}
        </Text>
        <Text style={[styles.headerValue, { color: lineColor }]}>
          {dataPoints.length > 0
            ? formatCurrencyShort(dataPoints[dataPoints.length - 1].value)
            : "ETB 0"}
        </Text>
      </View>

      {dataPoints.length > 1 ? (
        <View style={{ height, overflow: "hidden" }}>
          <Svg width={chartWidth} height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
                <Stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
              </LinearGradient>
            </Defs>

            {/* Zero line */}
            {zeroY > padding.top && zeroY < height - padding.bottom && (
              <Line
                x1={padding.left}
                y1={zeroY}
                x2={chartWidth - padding.right}
                y2={zeroY}
                stroke={c.textTertiary}
                strokeWidth={0.5}
                strokeDasharray="4,4"
                opacity={0.5}
              />
            )}

            {/* Gradient area */}
            <Path d={areaPath} fill={`url(#${gradientId})`} opacity={0.7} />

            {/* Animated line */}
            <AnimatedLine d={linePath} stroke={lineColor} strokeWidth={2.5} delay={100} />

            {/* Dots */}
            {points.map((pt, i) => (
              <AnimatedDot
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={3}
                fill={lineColor}
                delay={200 + i * 50}
              />
            ))}
          </Svg>

          {/* X labels */}
          <View style={[styles.xLabels, { width: chartWidth }]}>
            {dataPoints.map((d, i) => {
              // Show fewer labels to avoid overlap
              const showLabel =
                dataPoints.length <= 8 ||
                i === 0 ||
                i === dataPoints.length - 1 ||
                i % Math.ceil(dataPoints.length / 6) === 0;

              if (!showLabel) return <View key={i} style={{ flex: 1 }} />;
              return (
                <Text
                  key={i}
                  style={[styles.xLabel, { color: c.textTertiary }]}
                >
                  {d.label}
                </Text>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={[styles.emptyState, { height: height - 40 }]}>
          <Text style={[styles.emptyText, { color: c.textTertiary }]}>Not enough data</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
  headerValue: {
    fontSize: 15,
    fontFamily: "Rubik_700Bold",
  },
  xLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 4,
  },
  xLabel: {
    fontSize: 9,
    fontFamily: "Rubik_500Medium",
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
  },
});
