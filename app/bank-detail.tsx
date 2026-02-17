import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/contexts/ThemeContext";
import { getBankById } from "@/constants/banks";
import { TransactionItem } from "@/components/TransactionItem";
import { testParseSms, toggleBankSmsSync, startSmsListener } from "@/lib/sms";
import { useSmsPermission } from "@/hooks/useSmsPermission";
import { formatCurrency, formatDate } from "@/lib/utils";
import Colors from "@/constants/colors";

export default function BankDetailScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    bankAccounts,
    transactions,
    categories,
    updateBankAccount,
    deleteBankAccount,
    refreshData,
  } = useApp();

  const account = bankAccounts.find((a) => a.id === id);
  const bank = account ? getBankById(account.bankId) : undefined;

  const [testMode, setTestMode] = useState(false);
  const [testSmsText, setTestSmsText] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { hasPermission, isAndroid } = useSmsPermission();

  const bankTransactions = useMemo(() => {
    if (!account) return [];
    return transactions
      .filter((t) => t.bankAccountId === account.id)
      .slice(0, 50);
  }, [transactions, account]);

  const handleToggleSync = useCallback(
    async (value: boolean) => {
      if (!account) return;
      await toggleBankSmsSync(account.id, value);
      await refreshData();
      if (value && isAndroid && hasPermission) {
        const result = await startSmsListener();
        if (!result.started) {
          Alert.alert("SMS Listener", result.error ?? "Could not start listener");
        }
      }
    },
    [account, refreshData, isAndroid, hasPermission],
  );

  const handleTestParse = useCallback(() => {
    if (!account || !testSmsText.trim()) {
      setTestResult("Please paste an SMS body to test.");
      return;
    }
    const result = testParseSms(account.bankId, testSmsText.trim());
    if (result.success && result.parsed) {
      const p = result.parsed;
      setTestResult(
        `Parsed successfully!\n` +
        `Direction: ${p.direction}\n` +
        `Amount: ETB ${p.amount.toFixed(2)}\n` +
        `${p.fees ? `Fees: ETB ${p.fees.toFixed(2)}\n` : ""}` +
        `Balance: ${p.newBalance !== undefined ? `ETB ${p.newBalance.toFixed(2)}` : "N/A"}\n` +
        `Description: ${p.description ?? "N/A"}\n` +
        `Account: ${p.accountMask ?? "N/A"}\n` +
        `Date: ${p.timestamp}`,
      );
    } else {
      setTestResult(`Parse failed: ${result.error}`);
    }
  }, [account, testSmsText]);

  const handleDelete = useCallback(() => {
    if (!account) return;
    Alert.alert(
      "Delete Bank Account",
      `Delete "${account.accountName}"? Transactions from this account will remain but the bank link will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteBankAccount(account.id);
            router.back();
          },
        },
      ],
    );
  }, [account, deleteBankAccount]);

  if (!account || !bank) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={c.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: c.text }]}>Bank Account</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>Account not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>{bank.shortName}</Text>
        <Pressable onPress={handleDelete} hitSlop={12}>
          <Ionicons name="trash-outline" size={22} color={c.expense} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Bank Info Card */}
        <View style={[styles.bankCard, { borderLeftColor: bank.color, backgroundColor: c.surface, borderColor: c.borderLight }]}>
          {bank.logo ? (
            <Image source={bank.logo} style={styles.bankLogoImage} resizeMode="contain" />
          ) : (
            <View style={[styles.bankLogo, { backgroundColor: bank.color }]}>
              <Text style={styles.bankLogoText}>{bank.iconLetter}</Text>
            </View>
          )}
          <View style={styles.bankInfo}>
            <Text style={[styles.bankName, { color: c.text }]}>{bank.name}</Text>
            <Text style={[styles.accountName, { color: c.textSecondary }]}>{account.accountName}</Text>
          </View>
          <View style={styles.balanceCol}>
            <Text style={[styles.balanceLabel, { color: c.textTertiary }]}>Balance</Text>
            <Text style={[styles.balanceValue, { color: c.text }]}>{formatCurrency(account.balance)}</Text>
          </View>
        </View>

        {/* Sync Info */}
        {account.lastSmsSyncAt && (
          <Text style={[styles.syncInfo, { color: c.textTertiary }]}>
            Last synced: {formatDate(account.lastSmsSyncAt)}
          </Text>
        )}

        {/* SMS Controls */}
        {isAndroid && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>SMS SYNC</Text>
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Ionicons name="chatbubble-outline" size={20} color={c.primary} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={[styles.toggleLabel, { color: c.text }]}>Auto-import SMS</Text>
                    <Text style={[styles.toggleSubtitle, { color: c.textSecondary }]}>
                      {account.smsSyncEnabled
                        ? "Listening for new bank SMS"
                        : "Tap to enable live SMS import"}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={!!account.smsSyncEnabled}
                  onValueChange={handleToggleSync}
                  trackColor={{ false: c.border, true: c.primary + "60" }}
                  thumbColor={account.smsSyncEnabled ? c.primary : c.surface}
                  disabled={!hasPermission}
                />
              </View>
              {!hasPermission && (
                <Text style={[styles.permWarning, { color: c.expense }]}>
                  Grant SMS permission in Settings to enable sync.
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Test SMS Parser */}
        <View style={styles.section}>
          <Pressable
            style={styles.testToggle}
            onPress={() => setTestMode(!testMode)}
          >
            <View style={styles.testToggleLeft}>
              <Ionicons name="flask-outline" size={20} color={c.primary} />
              <Text style={[styles.sectionTitle, { color: c.textTertiary, marginBottom: 0 }]}>TEST SMS PARSER</Text>
            </View>
            <Ionicons
              name={testMode ? "chevron-up" : "chevron-down"}
              size={18}
              color={c.textTertiary}
            />
          </Pressable>

          {testMode && (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
              <Text style={[styles.testHint, { color: c.textSecondary }]}>
                Paste a bank SMS below to test if it parses correctly for {bank.shortName}.
              </Text>
              <TextInput
                style={[styles.testInput, { borderColor: c.border, color: c.text, backgroundColor: c.surfaceSecondary }]}
                multiline
                numberOfLines={5}
                placeholder="Paste SMS body here..."
                placeholderTextColor={c.textTertiary}
                value={testSmsText}
                onChangeText={setTestSmsText}
                textAlignVertical="top"
              />
              <Pressable style={[styles.testBtn, { backgroundColor: c.primary }]} onPress={handleTestParse}>
                <Text style={[styles.testBtnText, { color: c.textInverse }]}>Parse SMS</Text>
              </Pressable>
              {testResult && (
                <View style={[styles.testResultBox, { backgroundColor: c.surfaceSecondary }]}>
                  <Text style={[styles.testResultText, { color: c.text }]}>{testResult}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>
            TRANSACTIONS ({bankTransactions.length})
          </Text>
          {bankTransactions.length === 0 ? (
            <View style={styles.emptyTxn}>
              <Ionicons name="receipt-outline" size={36} color={c.textTertiary} />
              <Text style={[styles.emptyTxnText, { color: c.text }]}>No transactions for this bank yet</Text>
              <Text style={[styles.emptyTxnHint, { color: c.textSecondary }]}>
                {isAndroid
                  ? "Enable SMS sync above or add transactions manually"
                  : "Add transactions manually"}
              </Text>
            </View>
          ) : (
            <View style={[styles.txnList, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
              {bankTransactions.map((txn) => (
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
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.text,
  },
  bankCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 14,
  },
  bankLogoImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  bankLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bankLogoText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: "Rubik_700Bold",
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.text,
  },
  accountName: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  balanceCol: {
    alignItems: "flex-end",
  },
  balanceLabel: {
    fontSize: 11,
    fontFamily: "Rubik_400Regular",
    color: Colors.textTertiary,
  },
  balanceValue: {
    fontSize: 16,
    fontFamily: "Rubik_700Bold",
    color: Colors.text,
    marginTop: 2,
  },
  syncInfo: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    color: Colors.textTertiary,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.textTertiary,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontFamily: "Rubik_500Medium",
    color: Colors.text,
  },
  toggleSubtitle: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  permWarning: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    color: Colors.expense,
    marginTop: 10,
  },
  testToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
  },
  testToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  testHint: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  testInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    color: Colors.text,
    minHeight: 100,
    backgroundColor: Colors.surfaceSecondary,
  },
  testBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  testBtnText: {
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.textInverse,
  },
  testResultBox: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  testResultText: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    color: Colors.text,
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Rubik_500Medium",
    color: Colors.textSecondary,
  },
  emptyTxn: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyTxnText: {
    fontSize: 15,
    fontFamily: "Rubik_500Medium",
    color: Colors.text,
  },
  emptyTxnHint: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  txnList: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
});
