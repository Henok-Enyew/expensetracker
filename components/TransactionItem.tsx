import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Transaction } from "@/lib/types";
import { Category } from "@/constants/categories";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import Colors from "@/constants/colors";

interface TransactionItemProps {
  transaction: Transaction;
  category?: Category;
  onPress?: () => void;
}

export function TransactionItem({ transaction, category, onPress }: TransactionItemProps) {
  const isExpense = transaction.type === "expense";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && { backgroundColor: Colors.surfaceSecondary }]}
    >
      <View style={[styles.iconContainer, { backgroundColor: (category?.color || "#78909C") + "18" }]}>
        {category ? (
          <MaterialIcons name={category.icon as any} size={22} color={category.color} />
        ) : (
          <Ionicons name="help-circle" size={22} color="#78909C" />
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.description} numberOfLines={1}>
          {transaction.description || category?.name || "Transaction"}
        </Text>
        <Text style={styles.date}>{formatDateShort(transaction.date)}</Text>
      </View>

      <Text style={[styles.amount, { color: isExpense ? Colors.expense : Colors.income }]}>
        {isExpense ? "-" : "+"}{formatCurrency(transaction.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  description: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  date: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  amount: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
