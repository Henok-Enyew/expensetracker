import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/contexts/AppContext";
import { BalanceCard } from "@/components/BalanceCard";
import { BankAccountCard } from "@/components/BankAccountCard";
import { TransactionItem } from "@/components/TransactionItem";
import { getToday, getCurrentMonth } from "@/lib/utils";
import Colors from "@/constants/colors";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { transactions, bankAccounts, categories, totalBalance, cashBalance, refreshData, isLoading } = useApp();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const monthlyStats = useMemo(() => {
    const month = getCurrentMonth();
    const monthTxns = transactions.filter((t) => t.date.startsWith(month));
    const income = monthTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = monthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { income, expense };
  }, [transactions]);

  const todayTxns = useMemo(() => {
    const today = getToday();
    return transactions.filter((t) => t.date === today);
  }, [transactions]);

  const recentTxns = useMemo(() => transactions.slice(0, 15), [transactions]);

  const handleAddTransaction = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/add-transaction");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Birr Track</Text>
          <Text style={styles.subtitle}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </Text>
        </View>
        <Pressable onPress={handleAddTransaction} style={styles.addBtn}>
          <Ionicons name="add" size={22} color={Colors.textInverse} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refreshData} tintColor={Colors.primary} />}
      >
        <BalanceCard
          totalBalance={totalBalance}
          income={monthlyStats.income}
          expense={monthlyStats.expense}
        />

        {bankAccounts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Accounts</Text>
              <Pressable onPress={() => router.push("/add-bank")}>
                <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountsRow}>
              <Pressable
                style={styles.cashCard}
                onPress={() => {}}
              >
                <View style={[styles.cashIcon]}>
                  <Ionicons name="cash" size={22} color={Colors.primary} />
                </View>
                <Text style={styles.cashLabel}>Cash</Text>
                <Text style={styles.cashBalance}>ETB {cashBalance.toLocaleString()}</Text>
              </Pressable>
              {bankAccounts.map((acc) => (
                <BankAccountCard key={acc.id} account={acc} />
              ))}
            </ScrollView>
          </View>
        )}

        {bankAccounts.length === 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Accounts</Text>
            </View>
            <Pressable style={styles.emptyAccounts} onPress={() => router.push("/add-bank")}>
              <Ionicons name="add-circle" size={36} color={Colors.primary} />
              <Text style={styles.emptyAccountsText}>Add your first bank account</Text>
            </Pressable>
          </View>
        )}

        {todayTxns.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today</Text>
            <View style={styles.todaySummary}>
              <View style={styles.todayStat}>
                <Ionicons name="arrow-down-circle" size={18} color={Colors.income} />
                <Text style={styles.todayStatText}>
                  +ETB {todayTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.todayStat}>
                <Ionicons name="arrow-up-circle" size={18} color={Colors.expense} />
                <Text style={styles.todayStatText}>
                  -ETB {todayTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {transactions.length > 0 && (
              <Pressable onPress={() => router.push("/(tabs)/transactions")}>
                <Text style={styles.seeAll}>See All</Text>
              </Pressable>
            )}
          </View>

          {recentTxns.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptyText}>Tap + to add your first transaction</Text>
            </View>
          ) : (
            <View style={styles.txnList}>
              {recentTxns.map((txn) => (
                <TransactionItem
                  key={txn.id}
                  transaction={txn}
                  category={categories.find((c) => c.id === txn.categoryId)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Pressable
        style={styles.fab}
        onPress={handleAddTransaction}
      >
        <Ionicons name="add" size={28} color={Colors.textInverse} />
      </Pressable>
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
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  accountsRow: {
    gap: 10,
    paddingRight: 20,
  },
  cashCard: {
    width: 120,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cashIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  cashLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  cashBalance: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  emptyAccounts: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary + "30",
    borderStyle: "dashed",
  },
  emptyAccountsText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  todaySummary: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  todayStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  todayStatText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  txnList: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
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
  fab: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
});
