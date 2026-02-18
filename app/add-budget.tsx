import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/contexts/ThemeContext";
import { CategoryPicker } from "@/components/CategoryPicker";
import { generateId, getPeriodLabel } from "@/lib/utils";
import type { BudgetPeriod } from "@/lib/types";
import Colors from "@/constants/colors";

const PERIODS: BudgetPeriod[] = ["daily", "weekly", "monthly", "yearly"];

export default function AddBudgetScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const params = useLocalSearchParams<{ defaultPeriod?: string; editId?: string }>();
  const { categories, budgets, saveBudgets } = useApp();

  const editingBudget = params.editId ? budgets.find((b) => b.id === params.editId) : null;

  const [period, setPeriod] = useState<BudgetPeriod>(
    editingBudget?.period ?? (params.defaultPeriod as BudgetPeriod) ?? "monthly",
  );
  const [budgetType, setBudgetType] = useState<"overall" | "category">(
    editingBudget ? (editingBudget.categoryId === null ? "overall" : "category") : "overall",
  );
  const [categoryId, setCategoryId] = useState(editingBudget?.categoryId ?? "");
  const [amount, setAmount] = useState(editingBudget ? editingBudget.amount.toString() : "");
  const [saving, setSaving] = useState(false);

  const existingBudgetCats = useMemo(() => {
    return budgets
      .filter((b) => b.period === period && b.id !== editingBudget?.id)
      .filter((b) => b.categoryId !== null)
      .map((b) => b.categoryId!);
  }, [budgets, period, editingBudget]);

  const hasOverallForPeriod = useMemo(() => {
    return budgets.some((b) => b.period === period && b.categoryId === null && b.id !== editingBudget?.id);
  }, [budgets, period, editingBudget]);

  const availableCategories = useMemo(() => {
    return categories.filter((ct) => !existingBudgetCats.includes(ct.id));
  }, [categories, existingBudgetCats]);

  const canSave = useMemo(() => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return false;
    if (budgetType === "category" && !categoryId) return false;
    if (budgetType === "overall" && hasOverallForPeriod) return false;
    return true;
  }, [amount, budgetType, categoryId, hasOverallForPeriod]);

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    if (budgetType === "category" && !categoryId) return;

    setSaving(true);
    try {
      if (editingBudget) {
        const updated = budgets.map((b) =>
          b.id === editingBudget.id
            ? { ...b, amount: numAmount, period, categoryId: budgetType === "overall" ? null : categoryId }
            : b,
        );
        await saveBudgets(updated);
      } else {
        const newBudget = {
          id: generateId(),
          categoryId: budgetType === "overall" ? null : categoryId,
          amount: numAmount,
          period,
          createdAt: new Date().toISOString(),
        };
        await saveBudgets([...budgets, newBudget]);
      }
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      setSaving(false);
    }
  };

  const isEditing = !!editingBudget;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.title, { color: c.text }]}>{isEditing ? "Edit Budget" : "Add Budget"}</Text>
        <Pressable
          onPress={handleSave}
          disabled={!canSave || saving}
          style={({ pressed }) => [{ opacity: canSave && !saving ? (pressed ? 0.7 : 1) : 0.4 }]}
        >
          <Ionicons name="checkmark" size={24} color={c.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Period Selector */}
        <Text style={[styles.sectionLabel, { color: c.text }]}>Budget Period</Text>
        <View style={styles.chipRow}>
          {PERIODS.map((p) => {
            const active = period === p;
            return (
              <Pressable
                key={p}
                onPress={() => setPeriod(p)}
                style={[
                  styles.chip,
                  { backgroundColor: c.surfaceSecondary, borderColor: "transparent" },
                  active && { backgroundColor: c.primary + "12", borderColor: c.primary },
                ]}
              >
                <Text style={[styles.chipText, { color: c.textSecondary }, active && { color: c.primary, fontFamily: "Rubik_600SemiBold" }]}>
                  {getPeriodLabel(p)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Budget Type */}
        <Text style={[styles.sectionLabel, { color: c.text }]}>Budget Type</Text>
        <View style={styles.typeRow}>
          <Pressable
            onPress={() => setBudgetType("overall")}
            style={[
              styles.typeCard,
              { backgroundColor: c.surface, borderColor: c.borderLight },
              budgetType === "overall" && { borderColor: c.primary, backgroundColor: c.primary + "08" },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={24}
              color={budgetType === "overall" ? c.primary : c.textTertiary}
            />
            <Text style={[styles.typeTitle, { color: c.text }, budgetType === "overall" && { color: c.primary }]}>
              Overall
            </Text>
            <Text style={[styles.typeDesc, { color: c.textSecondary }]}>
              Total spending limit
            </Text>
            {hasOverallForPeriod && !isEditing && (
              <Text style={[styles.typeWarn, { color: c.expense }]}>Already set</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => setBudgetType("category")}
            style={[
              styles.typeCard,
              { backgroundColor: c.surface, borderColor: c.borderLight },
              budgetType === "category" && { borderColor: c.primary, backgroundColor: c.primary + "08" },
            ]}
          >
            <Ionicons
              name="grid-outline"
              size={24}
              color={budgetType === "category" ? c.primary : c.textTertiary}
            />
            <Text style={[styles.typeTitle, { color: c.text }, budgetType === "category" && { color: c.primary }]}>
              Category
            </Text>
            <Text style={[styles.typeDesc, { color: c.textSecondary }]}>
              Per-category limit
            </Text>
          </Pressable>
        </View>

        {/* Amount */}
        <Text style={[styles.sectionLabel, { color: c.text }]}>Amount (ETB)</Text>
        <View style={[styles.amountRow, { backgroundColor: c.surfaceSecondary }]}>
          <Text style={[styles.currency, { color: c.textSecondary }]}>ETB</Text>
          <TextInput
            style={[styles.amountInput, { color: c.text }]}
            placeholder="0.00"
            placeholderTextColor={c.textTertiary}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        {/* Category Picker */}
        {budgetType === "category" && (
          <>
            <Text style={[styles.sectionLabel, { color: c.text }]}>Category</Text>
            {availableCategories.length > 0 ? (
              <CategoryPicker categories={availableCategories} selectedId={categoryId} onSelect={setCategoryId} />
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                  All categories already have {getPeriodLabel(period).toLowerCase()} budgets
                </Text>
              </View>
            )}
          </>
        )}

        <Pressable
          style={[styles.saveBtn, { backgroundColor: c.primary }, !canSave && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          <Text style={[styles.saveBtnText, { color: c.textInverse }]}>
            {saving ? "Saving..." : isEditing ? "Update Budget" : "Set Budget"}
          </Text>
        </Pressable>
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
    paddingVertical: 16,
  },
  title: {
    fontSize: 17,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.text,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.text,
    marginBottom: 10,
    marginTop: 20,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Rubik_500Medium",
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
  },
  typeCard: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  typeTitle: {
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
  },
  typeDesc: {
    fontSize: 11,
    fontFamily: "Rubik_400Regular",
    textAlign: "center",
  },
  typeWarn: {
    fontSize: 11,
    fontFamily: "Rubik_500Medium",
    marginTop: 2,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  currency: {
    fontSize: 18,
    fontFamily: "Rubik_700Bold",
    color: Colors.textSecondary,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontFamily: "Rubik_700Bold",
    color: Colors.text,
    paddingVertical: 14,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.textInverse,
  },
  emptyState: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
