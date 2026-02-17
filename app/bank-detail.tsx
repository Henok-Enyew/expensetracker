import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
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
  toggleBankSmsSync,
  startSmsListener,
  readAndSyncBankSms,
} from "@/lib/sms";
import type { InboxSyncResult, InboxSyncProgress } from "@/lib/sms";
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

  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<InboxSyncProgress | null>(null);
  const [syncResult, setSyncResult] = useState<InboxSyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

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

  const handleScanSms = useCallback(async () => {
    if (!account || !bank) return;

    // Ensure we have SMS permission
    if (isAndroid && !hasPermission) {
      const granted = await requestSmsPermission();
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "SMS read permission is needed to scan your inbox. Please grant it in Settings.",
        );
        return;
      }
    }

    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    setSyncProgress({ phase: "reading" });

    try {
      const result = await readAndSyncBankSms(
        account.bankId,
        account.id,
        account.lastSmsSyncAt,
        (progress) => setSyncProgress(progress),
      );

      setSyncResult(result);
      await refreshData();

      if (Platform.OS !== "web" && result.imported > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setSyncError(msg);
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  }, [account, bank, refreshData, isAndroid, hasPermission, requestSmsPermission]);

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

  const progressText = syncProgress
    ? syncProgress.phase === "reading"
      ? "Reading SMS inbox..."
      : syncProgress.phase === "parsing"
        ? `Scanning messages${syncProgress.total ? ` (${syncProgress.current ?? 0}/${syncProgress.total})` : ""}...`
        : ""
    : "";

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

        {/* SMS Auto-Import Toggle (Android only) */}
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

        {/* Scan & Import SMS from Inbox */}
        {isAndroid && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>IMPORT SMS</Text>
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
              <View style={styles.scanHeader}>
                <View style={[styles.scanIconBg, { backgroundColor: c.primary + "15" }]}>
                  <Ionicons name="phone-portrait-outline" size={22} color={c.primary} />
                </View>
                <View style={styles.scanHeaderText}>
                  <Text style={[styles.scanTitle, { color: c.text }]}>
                    Scan Device SMS
                  </Text>
                  <Text style={[styles.scanSubtitle, { color: c.textSecondary }]}>
                    Reads your inbox and imports {bank.shortName} transactions automatically
                  </Text>
                </View>
              </View>

              <Pressable
                style={[
                  styles.scanBtn,
                  { backgroundColor: c.primary },
                  syncing && { opacity: 0.7 },
                ]}
                onPress={handleScanSms}
                disabled={syncing}
              >
                {syncing ? (
                  <View style={styles.scanBtnContent}>
                    <ActivityIndicator size="small" color={c.textInverse} />
                    <Text style={[styles.scanBtnText, { color: c.textInverse }]}>
                      {progressText || "Scanning..."}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.scanBtnContent}>
                    <Ionicons name="scan-outline" size={20} color={c.textInverse} />
                    <Text style={[styles.scanBtnText, { color: c.textInverse }]}>
                      Scan & Import
                    </Text>
                  </View>
                )}
              </Pressable>

              {/* Sync Result */}
              {syncResult && !syncing && (
                <View
                  style={[
                    styles.resultCard,
                    {
                      backgroundColor:
                        syncResult.imported > 0 ? c.income + "12" : c.surfaceSecondary,
                      borderColor:
                        syncResult.imported > 0 ? c.income + "30" : c.borderLight,
                    },
                  ]}
                >
                  <Ionicons
                    name={syncResult.imported > 0 ? "checkmark-circle" : "information-circle-outline"}
                    size={22}
                    color={syncResult.imported > 0 ? c.income : c.textSecondary}
                  />
                  <View style={styles.resultContent}>
                    {syncResult.imported > 0 && (
                      <Text style={[styles.resultLine, { color: c.income, fontFamily: "Rubik_600SemiBold" }]}>
                        Imported {syncResult.imported} transaction{syncResult.imported > 1 ? "s" : ""}
                      </Text>
                    )}
                    {syncResult.skipped > 0 && (
                      <Text style={[styles.resultLine, { color: c.textSecondary }]}>
                        {syncResult.skipped} already imported (skipped)
                      </Text>
                    )}
                    {syncResult.imported === 0 && syncResult.skipped === 0 && (
                      <Text style={[styles.resultLine, { color: c.textSecondary }]}>
                        No new {bank.shortName} transactions found in SMS
                      </Text>
                    )}
                    {syncResult.lastBalance !== undefined && (
                      <Text style={[styles.resultLine, { color: c.text, fontFamily: "Rubik_600SemiBold" }]}>
                        Balance updated: {formatCurrency(syncResult.lastBalance)}
                      </Text>
                    )}
                    <Text style={[styles.resultMeta, { color: c.textTertiary }]}>
                      Scanned {syncResult.totalRead} SMS
                      {syncResult.totalBankSms > 0
                        ? ` — found ${syncResult.totalBankSms} from ${bank.shortName}`
                        : ""}
                    </Text>
                  </View>
                </View>
              )}

              {/* Error */}
              {syncError && !syncing && (
                <View style={[styles.resultCard, { backgroundColor: c.expense + "12", borderColor: c.expense + "30" }]}>
                  <Ionicons name="alert-circle-outline" size={22} color={c.expense} />
                  <View style={styles.resultContent}>
                    <Text style={[styles.resultLine, { color: c.expense }]}>{syncError}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

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
                  ? 'Tap "Scan & Import" above to read your SMS and import transactions'
                  : "SMS import is only available on Android devices"}
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
  scanHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  scanIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  scanHeaderText: {
    flex: 1,
  },
  scanTitle: {
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.text,
  },
  scanSubtitle: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
  scanBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  scanBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  scanBtnText: {
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
  },
  resultContent: {
    flex: 1,
    gap: 3,
  },
  resultLine: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    lineHeight: 19,
  },
  resultMeta: {
    fontSize: 11,
    fontFamily: "Rubik_400Regular",
    marginTop: 4,
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
