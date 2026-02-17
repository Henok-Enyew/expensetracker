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
import * as Haptics from "expo-haptics";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/contexts/ThemeContext";
import { getBankById } from "@/constants/banks";
import { TransactionItem } from "@/components/TransactionItem";
import {
  testParseSms,
  toggleBankSmsSync,
  startSmsListener,
  parseBankSms,
  generateSmsIdSync,
  syncTransactionFromSms,
} from "@/lib/sms";
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

  const [importMode, setImportMode] = useState(false);
  const [importSmsText, setImportSmsText] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [testSmsText, setTestSmsText] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  const { hasPermission, isAndroid, request: requestSmsPermission } = useSmsPermission();

  const bankTransactions = useMemo(() => {
    if (!account) return [];
    return transactions
      .filter((t) => t.bankAccountId === account.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);
  }, [transactions, account]);

  const handleToggleSync = useCallback(
    async (value: boolean) => {
      if (!account) return;
      if (value && isAndroid && !hasPermission) {
        const granted = await requestSmsPermission();
        if (!granted) {
          Alert.alert("Permission Required", "SMS permission is needed to auto-import transactions.");
          return;
        }
      }
      await toggleBankSmsSync(account.id, value);
      await refreshData();
      if (value && isAndroid) {
        const result = await startSmsListener();
        if (!result.started) {
          Alert.alert("SMS Listener", result.error ?? "Could not start listener.");
        }
      }
    },
    [account, refreshData, isAndroid, hasPermission, requestSmsPermission],
  );

  // Import SMS as real transaction
  const handleImportSms = useCallback(async () => {
    if (!account || !importSmsText.trim()) {
      setImportResult("Please paste an SMS message to import.");
      return;
    }

    setImporting(true);
    setImportResult(null);
    try {
      // Split by double newline to handle multiple SMS pasted at once
      const smsTexts = importSmsText
        .split(/\n{2,}/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      let imported = 0;
      let skipped = 0;
      let failed = 0;
      let lastBalance: number | undefined;

      for (const smsBody of smsTexts) {
        const smsId = generateSmsIdSync(smsBody, Date.now() + imported);
        const smsObj = { sender: account.bankId, body: smsBody, date: Date.now(), id: smsId };
        const parsed = parseBankSms(account.bankId, smsObj);

        if (!parsed) {
          failed++;
          continue;
        }

        const result = await syncTransactionFromSms(parsed, account.id);
        if (result.added) {
          imported++;
          if (parsed.newBalance !== undefined) {
            lastBalance = parsed.newBalance;
          }
        } else if (result.skippedDuplicate) {
          skipped++;
        } else {
          failed++;
        }
      }

      await refreshData();

      if (Platform.OS !== "web" && imported > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      let msg = "";
      if (imported > 0) msg += `Imported ${imported} transaction${imported > 1 ? "s" : ""}`;
      if (skipped > 0) msg += `${msg ? "\n" : ""}Skipped ${skipped} duplicate${skipped > 1 ? "s" : ""}`;
      if (failed > 0) msg += `${msg ? "\n" : ""}Failed to parse ${failed} message${failed > 1 ? "s" : ""}`;
      if (lastBalance !== undefined) msg += `\nBalance updated: ETB ${lastBalance.toFixed(2)}`;
      if (!msg) msg = "Could not parse the SMS. Check the format.";

      setImportResult(msg);
      if (imported > 0) setImportSmsText("");
    } catch (e) {
      setImportResult(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setImporting(false);
    }
  }, [account, importSmsText, refreshData]);

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
      `Delete "${account.accountName}"? Transactions will remain but the bank link will be removed.`,
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
        <View style={[styles.bankCard, { backgroundColor: bank.color + "10", borderColor: bank.color + "25" }]}>
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
                />
              </View>
              {account.smsSyncEnabled && (
                <View style={[styles.syncActiveHint, { borderTopColor: c.borderLight }]}>
                  <View style={[styles.syncDot, { backgroundColor: c.income }]} />
                  <Text style={[styles.syncActiveText, { color: c.income }]}>
                    Listener active — new SMS will be auto-imported
                  </Text>
                </View>
              )}
              {!hasPermission && isAndroid && (
                <Text style={[styles.permWarning, { color: c.expense }]}>
                  Grant SMS permission in Settings to enable sync.
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Import SMS Section */}
        <View style={styles.section}>
          <Pressable
            style={styles.sectionToggle}
            onPress={() => { setImportMode(!importMode); setImportResult(null); }}
          >
            <View style={styles.sectionToggleLeft}>
              <Ionicons name="download-outline" size={20} color={c.primary} />
              <Text style={[styles.sectionTitle, { color: c.text, marginBottom: 0 }]}>IMPORT SMS</Text>
            </View>
            <Ionicons
              name={importMode ? "chevron-up" : "chevron-down"}
              size={18}
              color={c.textTertiary}
            />
          </Pressable>

          {importMode && (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.borderLight, marginTop: 10 }]}>
              <Text style={[styles.importHint, { color: c.textSecondary }]}>
                Paste a bank SMS message below to import it as a transaction. You can paste multiple messages separated by a blank line.
              </Text>
              <TextInput
                style={[styles.smsInput, { borderColor: c.border, color: c.text, backgroundColor: c.surfaceSecondary }]}
                multiline
                numberOfLines={6}
                placeholder={`Paste your ${bank.shortName} SMS here...\n\nExample:\nDear Henok your Account 1*****7365 has been Credited with ETB 500.00 from Atsede Desalegn, on 16/02/2026 at 20:39:29 with Ref No FT26048VF0ST Your Current Balance is ETB 1,149.83.`}
                placeholderTextColor={c.textTertiary}
                value={importSmsText}
                onChangeText={setImportSmsText}
                textAlignVertical="top"
              />
              <Pressable
                style={[styles.importBtn, { backgroundColor: c.primary }, importing && { opacity: 0.6 }]}
                onPress={handleImportSms}
                disabled={importing || !importSmsText.trim()}
              >
                {importing ? (
                  <ActivityIndicator size="small" color={c.textInverse} />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color={c.textInverse} />
                    <Text style={[styles.importBtnText, { color: c.textInverse }]}>Import as Transaction</Text>
                  </>
                )}
              </Pressable>
              {importResult && (
                <View style={[
                  styles.resultBox,
                  { backgroundColor: importResult.includes("Imported") ? c.income + "15" : c.surfaceSecondary },
                ]}>
                  <Ionicons
                    name={importResult.includes("Imported") ? "checkmark-circle-outline" : "information-circle-outline"}
                    size={18}
                    color={importResult.includes("Imported") ? c.income : c.textSecondary}
                  />
                  <Text style={[styles.resultText, { color: importResult.includes("Imported") ? c.income : c.text }]}>
                    {importResult}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Test SMS Parser (debug) */}
        <View style={styles.section}>
          <Pressable
            style={styles.sectionToggle}
            onPress={() => setTestMode(!testMode)}
          >
            <View style={styles.sectionToggleLeft}>
              <Ionicons name="flask-outline" size={20} color={c.textTertiary} />
              <Text style={[styles.sectionTitle, { color: c.textTertiary, marginBottom: 0 }]}>TEST PARSER</Text>
            </View>
            <Ionicons
              name={testMode ? "chevron-up" : "chevron-down"}
              size={18}
              color={c.textTertiary}
            />
          </Pressable>

          {testMode && (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.borderLight, marginTop: 10 }]}>
              <Text style={[styles.importHint, { color: c.textSecondary }]}>
                Test if an SMS parses correctly for {bank.shortName}. This does NOT import — it only shows the parsed result.
              </Text>
              <TextInput
                style={[styles.smsInput, { borderColor: c.border, color: c.text, backgroundColor: c.surfaceSecondary }]}
                multiline
                numberOfLines={4}
                placeholder="Paste SMS body here..."
                placeholderTextColor={c.textTertiary}
                value={testSmsText}
                onChangeText={setTestSmsText}
                textAlignVertical="top"
              />
              <Pressable style={[styles.testBtn, { backgroundColor: c.surfaceTertiary }]} onPress={handleTestParse}>
                <Text style={[styles.testBtnText, { color: c.text }]}>Test Parse</Text>
              </Pressable>
              {testResult && (
                <View style={[styles.resultBox, { backgroundColor: c.surfaceSecondary }]}>
                  <Text style={[styles.resultText, { color: c.text }]}>{testResult}</Text>
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
                  ? "Enable SMS sync or import SMS above to get started"
                  : "Import SMS above to get started"}
              </Text>
            </View>
          ) : (
            <View style={[styles.txnList, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
              {bankTransactions.map((txn) => (
                <TransactionItem
                  key={txn.id}
                  transaction={txn}
                  category={categories.find((ct) => ct.id === txn.categoryId)}
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
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
  sectionToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  syncActiveHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncActiveText: {
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
  },
  permWarning: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    color: Colors.expense,
    marginTop: 10,
  },
  importHint: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  smsInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    color: Colors.text,
    minHeight: 120,
    backgroundColor: Colors.surfaceSecondary,
  },
  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 12,
  },
  importBtnText: {
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.textInverse,
  },
  testBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  testBtnText: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
  },
  resultBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  resultText: {
    flex: 1,
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
    paddingHorizontal: 20,
  },
  txnList: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
});
