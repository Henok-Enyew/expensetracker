import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  RefreshControl,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/contexts/ThemeContext";
import { BalanceCard } from "@/components/BalanceCard";
import { BankAccountCard } from "@/components/BankAccountCard";
import { TransactionItem } from "@/components/TransactionItem";
import { getToday, getCurrentMonth } from "@/lib/utils";
import Colors from "@/constants/colors";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const {
    transactions,
    bankAccounts,
    categories,
    totalBalance,
    cashBalance,
    friendsNet,
    overallNetBalance,
    friends,
    refreshData,
    isLoading,
    setCashBalance,
  } = useApp();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [cashModalVisible, setCashModalVisible] = useState(false);
  const [cashInput, setCashInput] = useState("");
  const [amountsVisible, setAmountsVisible] = useState(false);

  const handleOpenCashModal = () => {
    setCashInput(cashBalance > 0 ? cashBalance.toString() : "");
    setCashModalVisible(true);
  };

  const handleSaveCash = async () => {
    const num = parseFloat(cashInput) || 0;
    await setCashBalance(num);
    setCashModalVisible(false);
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const monthlyStats = useMemo(() => {
    const month = getCurrentMonth();
    const monthTxns = transactions.filter((t) => t.date.startsWith(month));
    const income = monthTxns
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expense = monthTxns
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    return { income, expense };
  }, [transactions]);

  const todayTxns = useMemo(() => {
    const today = getToday();
    return transactions.filter((t) => t.date === today);
  }, [transactions]);

  const recentTxns = useMemo(() => transactions.slice(0, 15), [transactions]);

  const handleAddTransaction = () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/add-transaction");
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + webTopInset, backgroundColor: c.background },
      ]}
    >
      <View style={styles.header}>
        <View>
          <View style={styles.headerTitleRow}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={[styles.greeting, { color: c.text }]}>Birr Track</Text>
          </View>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setAmountsVisible((v) => !v)}
            style={[styles.eyeBtn, { backgroundColor: c.surface }]}
            hitSlop={8}
          >
            <Ionicons
              name={amountsVisible ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={c.text}
            />
          </Pressable>
          <Pressable
            onPress={handleAddTransaction}
            style={[styles.addBtn, { backgroundColor: c.primary }]}
          >
            <Ionicons name="add" size={22} color={c.textInverse} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshData}
            tintColor={c.primary}
          />
        }
      >
        <BalanceCard
          totalBalance={totalBalance}
          income={monthlyStats.income}
          expense={monthlyStats.expense}
          amountsVisible={amountsVisible}
        />

        {bankAccounts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>
                Accounts
              </Text>
              <Pressable onPress={() => router.push("/add-bank")}>
                <Ionicons
                  name="add-circle-outline"
                  size={22}
                  color={c.primary}
                />
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.accountsRow}
            >
              <Pressable
                style={[
                  styles.cashCard,
                  { backgroundColor: c.surface, borderColor: c.borderLight },
                ]}
                onPress={handleOpenCashModal}
              >
                <View
                  style={[
                    styles.cashIcon,
                    { backgroundColor: c.primary + "15" },
                  ]}
                >
                  <Ionicons name="cash-outline" size={22} color={c.primary} />
                </View>
                <Text style={[styles.cashLabel, { color: c.text }]}>Cash</Text>
                <Text style={[styles.cashBalance, { color: c.textSecondary }]}>
                  {amountsVisible ? `ETB ${cashBalance.toLocaleString()}` : "••••••"}
                </Text>
              </Pressable>
              {bankAccounts.map((acc) => (
                <BankAccountCard
                  key={acc.id}
                  account={acc}
                  onPress={() =>
                    router.push({
                      pathname: "/bank-detail",
                      params: { id: acc.id },
                    })
                  }
                />
              ))}
            </ScrollView>
          </View>
        )}

        {bankAccounts.length === 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Accounts</Text>
            </View>
            <Pressable
              style={styles.emptyAccounts}
              onPress={() => router.push("/add-bank")}
            >
              <Ionicons
                name="add-circle-outline"
                size={36}
                color={Colors.primary}
              />
              <Text style={styles.emptyAccountsText}>
                Add your first bank account
              </Text>
            </Pressable>
          </View>
        )}

        {/* Friends / Loans Net */}
        {friends.length > 0 && friendsNet.netWithFriends !== 0 && (
          <Pressable
            style={[
              styles.friendsCard,
              {
                backgroundColor:
                  (friendsNet.netWithFriends > 0 ? c.income : c.expense) + "10",
                borderColor:
                  (friendsNet.netWithFriends > 0 ? c.income : c.expense) + "25",
              },
            ]}
            onPress={() => router.push("/(tabs)/friends")}
          >
            <View style={styles.friendsCardLeft}>
              <Ionicons
                name="people-outline"
                size={18}
                color={friendsNet.netWithFriends > 0 ? c.income : c.expense}
              />
              <Text style={[styles.friendsCardLabel, { color: c.text }]}>
                Net with friends
              </Text>
            </View>
            <Text
              style={[
                styles.friendsCardValue,
                {
                  color: friendsNet.netWithFriends > 0 ? c.income : c.expense,
                },
              ]}
            >
              {amountsVisible
                ? `${friendsNet.netWithFriends >= 0 ? "+" : "−"}ETB ${Math.abs(friendsNet.netWithFriends).toLocaleString()}`
                : "••••••"}
            </Text>
          </Pressable>
        )}

        {todayTxns.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Today</Text>
            <View style={styles.todaySummary}>
              <View style={styles.todayStat}>
                <Ionicons
                  name="arrow-down-circle-outline"
                  size={18}
                  color={Colors.income}
                />
                <Text style={[styles.todayStatText, { color: c.text }]}>
                  +ETB{" "}
                  {todayTxns
                    .filter((t) => t.type === "income")
                    .reduce((s, t) => s + t.amount, 0)
                    .toLocaleString()}
                </Text>
              </View>
              <View style={styles.todayStat}>
                <Ionicons
                  name="arrow-up-circle-outline"
                  size={18}
                  color={Colors.expense}
                />
                <Text style={[styles.todayStatText, { color: c.text }]}>
                  -ETB{" "}
                  {todayTxns
                    .filter((t) => t.type === "expense")
                    .reduce((s, t) => s + t.amount, 0)
                    .toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>
              Recent Transactions
            </Text>
            {transactions.length > 0 && (
              <Pressable
                style={styles.historyBtn}
                onPress={() => router.push("/(tabs)/transactions")}
              >
                <Ionicons name="time-outline" size={16} color={c.primary} />
                <Text style={[styles.seeAll, { color: c.primary }]}>
                  History
                </Text>
              </Pressable>
            )}
          </View>

          {recentTxns.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="receipt-outline"
                size={48}
                color={c.textTertiary}
              />
              <Text style={[styles.emptyTitle, { color: c.text }]}>
                No transactions yet
              </Text>
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                Tap + to add your first transaction
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.txnList,
                { backgroundColor: c.surface, borderColor: c.borderLight },
              ]}
            >
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
        style={[styles.fab, { backgroundColor: c.primary }]}
        onPress={handleAddTransaction}
      >
        <Ionicons name="add" size={28} color={c.textInverse} />
      </Pressable>

      <Modal visible={cashModalVisible} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCashModalVisible(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: c.text }]}>
              Edit Cash Balance
            </Text>
            <Text style={[styles.modalSubtitle, { color: c.textSecondary }]}>
              Set your current cash on hand
            </Text>
            <View
              style={[
                styles.modalBalanceRow,
                { backgroundColor: c.surfaceSecondary },
              ]}
            >
              <Text style={[styles.modalCurrency, { color: c.textSecondary }]}>
                ETB
              </Text>
              <TextInput
                style={[styles.modalBalanceInput, { color: c.text }]}
                value={cashInput}
                onChangeText={setCashInput}
                placeholder="0.00"
                placeholderTextColor={c.textTertiary}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalBtnSecondary}
                onPress={() => setCashModalVisible(false)}
              >
                <Text
                  style={[
                    styles.modalBtnSecondaryText,
                    { color: c.textSecondary },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtnPrimary, { backgroundColor: c.primary }]}
                onPress={handleSaveCash}
              >
                <Text
                  style={[styles.modalBtnPrimaryText, { color: c.textInverse }]}
                >
                  Save
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerLogo: {
    width: 28,
    height: 28,
  },
  greeting: {
    fontSize: 26,
    fontFamily: "Rubik_700Bold",
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  eyeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
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
    fontFamily: "Rubik_600SemiBold",
    color: Colors.text,
  },
  historyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
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
    fontFamily: "Rubik_500Medium",
    color: Colors.text,
  },
  cashBalance: {
    fontSize: 12,
    fontFamily: "Rubik_600SemiBold",
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
    fontFamily: "Rubik_500Medium",
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
    fontFamily: "Rubik_600SemiBold",
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
    fontFamily: "Rubik_600SemiBold",
    color: Colors.text,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    color: Colors.textSecondary,
  },
  friendsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  friendsCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  friendsCardLabel: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
    color: Colors.text,
  },
  friendsCardValue: {
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Rubik_700Bold",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    marginBottom: 20,
  },
  modalBalanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  modalCurrency: {
    fontSize: 16,
    fontFamily: "Rubik_700Bold",
  },
  modalBalanceInput: {
    flex: 1,
    fontSize: 24,
    fontFamily: "Rubik_700Bold",
    paddingVertical: 14,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  modalBtnSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  modalBtnSecondaryText: {
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
  },
  modalBtnPrimary: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  modalBtnPrimaryText: {
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
  },
});
