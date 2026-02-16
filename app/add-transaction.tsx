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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/contexts/AppContext";
import { CategoryPicker } from "@/components/CategoryPicker";
import { generateId, getToday } from "@/lib/utils";
import { getBankById } from "@/constants/banks";
import Colors from "@/constants/colors";

export default function AddTransactionScreen() {
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Add Transaction</Text>
        <Pressable
          onPress={handleSave}
          disabled={!canSave || saving}
          style={({ pressed }) => [{ opacity: canSave && !saving ? (pressed ? 0.7 : 1) : 0.4 }]}
        >
          <Ionicons name="checkmark" size={24} color={Colors.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.typeRow}>
          <Pressable
            onPress={() => setType("expense")}
            style={[
              styles.typeBtn,
              type === "expense" && { backgroundColor: Colors.expense, borderColor: Colors.expense },
            ]}
          >
            <Ionicons name="arrow-up" size={16} color={type === "expense" ? "#FFF" : Colors.textSecondary} />
            <Text style={[styles.typeText, type === "expense" && { color: "#FFF" }]}>Expense</Text>
          </Pressable>
          <Pressable
            onPress={() => setType("income")}
            style={[
              styles.typeBtn,
              type === "income" && { backgroundColor: Colors.income, borderColor: Colors.income },
            ]}
          >
            <Ionicons name="arrow-down" size={16} color={type === "income" ? "#FFF" : Colors.textSecondary} />
            <Text style={[styles.typeText, type === "income" && { color: "#FFF" }]}>Income</Text>
          </Pressable>
        </View>

        <View style={styles.amountContainer}>
          <Text style={styles.currency}>ETB</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            autoFocus
          />
        </View>

        <TextInput
          style={styles.descInput}
          placeholder="Description (optional)"
          placeholderTextColor={Colors.textTertiary}
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.sectionLabel}>Category</Text>
        <CategoryPicker categories={categories} selectedId={categoryId} onSelect={setCategoryId} />

        <Text style={styles.sectionLabel}>Payment Method</Text>
        <View style={styles.paymentRow}>
          <Pressable
            onPress={() => setPaymentMethod("cash")}
            style={[styles.paymentChip, paymentMethod === "cash" && styles.paymentChipActive]}
          >
            <Ionicons name="cash" size={16} color={paymentMethod === "cash" ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.paymentText, paymentMethod === "cash" && styles.paymentTextActive]}>
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
                style={[styles.paymentChip, isSelected && styles.paymentChipActive]}
              >
                <View style={[styles.bankDot, { backgroundColor: bank?.color || "#666" }]} />
                <Text style={[styles.paymentText, isSelected && styles.paymentTextActive]}>
                  {bank?.shortName || acc.accountName}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.saveBtn, !canSave && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Transaction"}</Text>
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
    fontFamily: "Inter_600SemiBold",
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
    fontFamily: "Inter_700Bold",
    color: Colors.textSecondary,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  descInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
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
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  paymentTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
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
    fontFamily: "Inter_600SemiBold",
    color: Colors.textInverse,
  },
});
