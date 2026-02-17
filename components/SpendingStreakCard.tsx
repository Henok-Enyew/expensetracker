import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/contexts/ThemeContext";
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

interface StreakProps {
  transactions: Transaction[];
}

function AnimatedStat({
  label,
  value,
  color,
  icon,
  delay,
}: {
  label: string;
  value: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  delay: number;
}) {
  const c = useColors();
  const translateY = useSharedValue(20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withSpring(0, { damping: 14, stiffness: 120 }),
    );
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 400 }),
    );
  }, [delay, translateY, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.statCard, { backgroundColor: color + "10", borderColor: color + "20" }, animStyle]}>
      <View style={[styles.statIconWrap, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.textSecondary }]}>{label}</Text>
    </Animated.View>
  );
}

export function SpendingStreakCard({ transactions }: StreakProps) {
  const c = useColors();

  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Count savings streak (consecutive days with positive net)
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayTxns = transactions.filter((t) => t.date === dateStr);
      if (dayTxns.length === 0 && i > 0) break;
      const net = dayTxns.reduce(
        (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
        0,
      );
      if (net >= 0 && dayTxns.length > 0) streak++;
      else if (dayTxns.length > 0) break;
    }

    // Average daily spending (last 30 days)
    let totalExpense = 0;
    let daysWithData = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayTxns = transactions.filter((t) => t.date === dateStr && t.type === "expense");
      if (dayTxns.length > 0) {
        totalExpense += dayTxns.reduce((sum, t) => sum + t.amount, 0);
        daysWithData++;
      }
    }
    const avgDaily = daysWithData > 0 ? totalExpense / daysWithData : 0;

    // Best saving day in last 30 days
    let bestDay = "";
    let bestNet = -Infinity;
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayTxns = transactions.filter((t) => t.date === dateStr);
      const net = dayTxns.reduce(
        (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
        0,
      );
      if (net > bestNet && dayTxns.length > 0) {
        bestNet = net;
        bestDay = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
    }

    // Total transactions today
    const todayCount = transactions.filter((t) => t.date === today).length;

    return { streak, avgDaily, bestDay, bestNet, todayCount };
  }, [transactions]);

  return (
    <View style={[styles.container, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
      <Text style={[styles.title, { color: c.text }]}>Quick Insights</Text>
      <View style={styles.statsGrid}>
        <AnimatedStat
          label="Saving Streak"
          value={`${stats.streak} day${stats.streak !== 1 ? "s" : ""}`}
          color={c.income}
          icon="flame-outline"
          delay={0}
        />
        <AnimatedStat
          label="Avg Daily Spend"
          value={formatCurrency(stats.avgDaily)}
          color={c.expense}
          icon="trending-down-outline"
          delay={100}
        />
        <AnimatedStat
          label="Best Day"
          value={stats.bestDay || "—"}
          color="#E8734A"
          icon="trophy-outline"
          delay={200}
        />
        <AnimatedStat
          label="Today's Txns"
          value={String(stats.todayCount)}
          color={c.primary}
          icon="receipt-outline"
          delay={300}
        />
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
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 15,
    fontFamily: "Rubik_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Rubik_400Regular",
  },
});
