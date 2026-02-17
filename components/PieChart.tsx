import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { useColors } from "@/contexts/ThemeContext";
import Colors from "@/constants/colors";

interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieSlice[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function createArcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} L ${cx} ${cy} Z`;
}

export function PieChart({ data, size = 180, centerLabel, centerValue }: PieChartProps) {
  const c = useColors();
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  const innerR = r * 0.6;

  if (total === 0) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cy} r={r} fill={c.surfaceTertiary} />
          <Circle cx={cx} cy={cy} r={innerR} fill={c.surface} />
        </Svg>
        <View style={styles.centerOverlay}>
          <Text style={[styles.centerLabel, { color: c.textSecondary }]}>No Data</Text>
        </View>
      </View>
    );
  }

  let currentAngle = 0;
  const paths = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const sliceAngle = (d.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;

      if (sliceAngle >= 359.99) {
        return (
          <React.Fragment key={d.label}>
            <Circle cx={cx} cy={cy} r={r} fill={d.color} />
          </React.Fragment>
        );
      }

      return <Path key={d.label} d={createArcPath(cx, cy, r, startAngle, endAngle)} fill={d.color} />;
    });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {paths}
        <Circle cx={cx} cy={cy} r={innerR} fill={c.surface} />
      </Svg>
      {(centerLabel || centerValue) && (
        <View style={styles.centerOverlay}>
          {centerValue && <Text style={[styles.centerValue, { color: c.text }]}>{centerValue}</Text>}
          {centerLabel && <Text style={[styles.centerLabel, { color: c.textSecondary }]}>{centerLabel}</Text>}
        </View>
      )}
    </View>
  );
}

export function PieChartLegend({ data }: { data: PieSlice[] }) {
  const c = useColors();
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const sorted = [...data].filter((d) => d.value > 0).sort((a, b) => b.value - a.value);

  return (
    <View style={styles.legend}>
      {sorted.map((d) => (
        <View key={d.label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: d.color }]} />
          <Text style={[styles.legendLabel, { color: c.text }]} numberOfLines={1}>{d.label}</Text>
          <Text style={[styles.legendPercent, { color: c.textSecondary }]}>{total > 0 ? Math.round((d.value / total) * 100) : 0}%</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  centerOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  centerValue: {
    fontSize: 18,
    fontFamily: "Rubik_700Bold",
    color: Colors.text,
  },
  centerLabel: {
    fontSize: 11,
    fontFamily: "Rubik_400Regular",
    color: Colors.textSecondary,
  },
  legend: {
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    color: Colors.text,
  },
  legendPercent: {
    fontSize: 13,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.textSecondary,
  },
});
