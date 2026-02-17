import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/contexts/ThemeContext";
import { TransactionItem } from "@/components/TransactionItem";
import { Transaction } from "@/lib/types";
import Colors from "@/constants/colors";

type FilterType = "all" | "expense" | "income";

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { transactions, categories, deleteTransaction } = useApp();
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const filtered = useMemo(() => {
    let result = transactions;
    if (filter !== "all") {
      result = result.filter((t) => t.type === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          categories.find((c) => c.id === t.categoryId)?.name.toLowerCase().includes(q),
      );
    }
    return result;
  }, [transactions, filter, search, categories]);

  const handleDelete = (txn: Transaction) => {
    if (Platform.OS === "web") {
      deleteTransaction(txn.id);
      return;
    }
    Alert.alert("Delete Transaction", "Are you sure you want to delete this transaction?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          deleteTransaction(txn.id);
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Transaction }) => (
    <TransactionItem
      transaction={item}
      category={categories.find((c) => c.id === item.categoryId)}
      onPress={() => handleDelete(item)}
    />
  );

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "expense", label: "Expenses" },
    { key: "income", label: "Income" },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset, backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Transactions</Text>
        <Pressable onPress={() => router.push("/add-transaction")}>
          <Ionicons name="add-circle" size={28} color={c.primary} />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: c.surfaceSecondary }]}>
          <Ionicons name="search" size={18} color={c.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: c.text }]}
            placeholder="Search transactions..."
            placeholderTextColor={c.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={c.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filterRow}>
        {filters.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[
              styles.filterChip,
              { backgroundColor: c.surfaceSecondary },
              filter === f.key && { backgroundColor: c.primary },
            ]}
          >
            <Text style={[
              styles.filterText,
              { color: c.textSecondary },
              filter === f.key && { color: c.textInverse },
            ]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, filtered.length === 0 && { flex: 1 }]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={c.textTertiary} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>No transactions found</Text>
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>
              {search ? "Try a different search" : "Add your first transaction"}
            </Text>
          </View>
        }
      />
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
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  searchRow: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.textInverse,
  },
  list: {
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
});
