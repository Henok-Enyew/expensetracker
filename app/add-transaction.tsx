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
import { generateId, getToday } from "@/lib/utils";
import { getBankById } from "@/constants/banks";
import Colors from "@/constants/colors";

export default function AddTransactionScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { categories, bankAccounts, addTransaction } = useApp();
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    if (!categoryId) return;

    setSaving(true);
    try {
      await addTransaction({
        id: generateId(),
        amount: numAmount,
        type,
        categoryId,
        description: description.trim(),
        date: getToday(),
        paymentMethod,
        bankAccountId: paymentMethod !== "cash" ? paymentMethod : undefined,
        createdAt: new Date().toISOString(),
      });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      setSaving(false);
    }
  };

  const canSave = parseFloat(amount) > 0 && categoryId;

  return (
    <View style={[styles.outerContainer, { paddingTop: insets.top, backgroundColor: c.background }]}>
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={24} color={c.text} />
          </Pressable>
          <Text style={[styles.title, { color: c.text }]}>Add Transaction</Text>
          <Pressable
            onPress={handleSave}
            disabled={!canSave || saving}
            hitSlop={12}
            style={({ pressed }) => [{ opacity: canSave && !saving ? (pressed ? 0.7 : 1) : 0.4 }]}
          >
            <Ionicons name="checkmark" size={24} color={c.primary} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.typeRow}>
            <Pressable
              onPress={() => setType("expense")}
              style={[
                styles.typeBtn,
                { borderColor: c.border, backgroundColor: c.surface },
                type === "expense" && { backgroundColor: c.expense, borderColor: c.expense },
              ]}
            >
              <Ionicons name="arrow-up" size={16} color={type === "expense" ? "#FFF" : c.textSecondary} />
              <Text style={[styles.typeText, { color: c.textSecondary }, type === "expense" && { color: "#FFF" }]}>Expense</Text>
            </Pressable>
            <Pressable
              onPress={() => setType("income")}
              style={[
                styles.typeBtn,
                { borderColor: c.border, backgroundColor: c.surface },
                type === "income" && { backgroundColor: c.income, borderColor: c.income },
              ]}
            >
              <Ionicons name="arrow-down" size={16} color={type === "income" ? "#FFF" : c.textSecondary} />
              <Text style={[styles.typeText, { color: c.textSecondary }, type === "income" && { color: "#FFF" }]}>Income</Text>
            </Pressable>
          </View>

          <View style={styles.amountContainer}>
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

          <TextInput
            style={[styles.descInput, { color: c.text, backgroundColor: c.surfaceSecondary }]}
            placeholder="Description (optional)"
            placeholderTextColor={c.textTertiary}
            value={description}
            onChangeText={setDescription}
          />

          <Text style={[styles.sectionLabel, { color: c.text }]}>Category</Text>
          <CategoryPicker categories={categories} selectedId={categoryId} onSelect={setCategoryId} />

          <Text style={[styles.sectionLabel, { color: c.text }]}>Payment Method</Text>
          <View style={styles.paymentRow}>
            <Pressable
              onPress={() => setPaymentMethod("cash")}
              style={[
                styles.paymentChip,
                { borderColor: c.border, backgroundColor: c.surface },
                paymentMethod === "cash" && { borderColor: c.primary, backgroundColor: c.primary + "10" },
              ]}
            >
              <Ionicons name="cash-outline" size={16} color={paymentMethod === "cash" ? c.primary : c.textSecondary} />
              <Text style={[
                styles.paymentText,
                { color: c.textSecondary },
                paymentMethod === "cash" && { color: c.primary, fontFamily: "Rubik_600SemiBold" },
              ]}>
                Cash
              </Text>
            </Pressable>
            {bankAccounts.map((acc) => {
              const bank = getBankById(acc.bankId);
              const isSelected = paymentMethod === acc.id;
              return (
                <Pressable
                  key={acc.id}
                  onPress={() => setPaymentMethod(acc.id)}
                  style={[
                    styles.paymentChip,
                    { borderColor: c.border, backgroundColor: c.surface },
                    isSelected && { borderColor: c.primary, backgroundColor: c.primary + "10" },
                  ]}
                >
                  <View style={[styles.bankDot, { backgroundColor: bank?.color || "#666" }]} />
                  <Text style={[
                    styles.paymentText,
                    { color: c.textSecondary },
                    isSelected && { color: c.primary, fontFamily: "Rubik_600SemiBold" },
                  ]}>
                    {bank?.shortName || acc.accountName}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={[styles.saveBtn, { backgroundColor: c.primary }, !canSave && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={!canSave || saving}
          >
            <Text style={[styles.saveBtnText, { color: c.textInverse }]}>{saving ? "Saving..." : "Save Transaction"}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    width: "100%",
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    width: "100%",
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
  typeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeText: {
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.textSecondary,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  currency: {
    fontSize: 20,
    fontFamily: "Rubik_700Bold",
    color: Colors.textSecondary,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontFamily: "Rubik_700Bold",
    color: Colors.text,
  },
  descInput: {
    fontSize: 15,
    fontFamily: "Rubik_400Regular",
    color: Colors.text,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.text,
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  paymentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  paymentChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "10",
  },
  paymentText: {
    fontSize: 13,
    fontFamily: "Rubik_500Medium",
    color: Colors.textSecondary,
  },
  paymentTextActive: {
    color: Colors.primary,
    fontFamily: "Rubik_600SemiBold",
  },
  bankDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.textInverse,
  },
});
