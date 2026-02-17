import React, { useState } from "react";
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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/contexts/ThemeContext";
import { CategoryPicker } from "@/components/CategoryPicker";
import { generateId, getCurrentMonth, getMonthName } from "@/lib/utils";
import Colors from "@/constants/colors";

export default function AddBudgetScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { categories, budgets, saveBudgets } = useApp();
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const currentMonth = getCurrentMonth();

  const existingBudgetCats = budgets.filter((b) => b.month === currentMonth).map((b) => b.categoryId);
  const availableCategories = categories.filter((c) => !existingBudgetCats.includes(c.id));

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0 || !categoryId) return;

    setSaving(true);
    try {
      const newBudget = {
        id: generateId(),
        categoryId,
        amount: numAmount,
        month: currentMonth,
      };
      await saveBudgets([...budgets, newBudget]);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      setSaving(false);
    }
  };

  const canSave = parseFloat(amount) > 0 && categoryId;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.title, { color: c.text }]}>Add Budget</Text>
        <Pressable
          onPress={handleSave}
          disabled={!canSave || saving}
          style={({ pressed }) => [{ opacity: canSave && !saving ? (pressed ? 0.7 : 1) : 0.4 }]}
        >
          <Ionicons name="checkmark" size={24} color={c.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={[styles.monthLabel, { color: c.textSecondary }]}>{getMonthName(currentMonth)}</Text>

        <Text style={[styles.sectionLabel, { color: c.text }]}>Budget Amount (ETB)</Text>
        <View style={styles.amountRow}>
          <Text style={[styles.currency, { color: c.textSecondary }]}>ETB</Text>
          <TextInput
            style={[styles.amountInput, { color: c.text }]}
            placeholder="0.00"
            placeholderTextColor={c.textTertiary}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            autoFocus
          />
        </View>

        <Text style={[styles.sectionLabel, { color: c.text }]}>Category</Text>
        {availableCategories.length > 0 ? (
          <CategoryPicker categories={availableCategories} selectedId={categoryId} onSelect={setCategoryId} />
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>All categories already have budgets set</Text>
          </View>
        )}

        <Pressable
          style={[styles.saveBtn, { backgroundColor: c.primary }, !canSave && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          <Text style={[styles.saveBtnText, { color: c.textInverse }]}>{saving ? "Saving..." : "Set Budget"}</Text>
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
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  monthLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currency: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.textSecondary,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textInverse,
  },
  emptyState: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
});
