import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  Share,
  Switch,
  Modal,
  TextInput,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as Updates from "expo-updates";
import { useApp } from "@/contexts/AppContext";
import { useSecurity } from "@/contexts/SecurityContext";
import { useSmsPermission } from "@/hooks/useSmsPermission";
import { buildTransactionsPdfHtml } from "@/lib/pdfExport";
import { getToday, getCurrentMonth, getLast7DaysRange, getThisYearRange } from "@/lib/utils";
import { useTheme, useColors } from "@/contexts/ThemeContext";
import Colors from "@/constants/colors";

type ExportDatePreset = "today" | "last7" | "month" | "year" | "custom";

interface SettingItemProps {
  icon: string;
  iconFamily?: "Ionicons" | "MaterialIcons";
  label: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
  colors: ReturnType<typeof useColors>;
}

function SettingItem({ icon, iconFamily = "Ionicons", label, subtitle, onPress, danger, colors }: SettingItemProps) {
  const c = colors;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.settingItem, pressed && { backgroundColor: c.surfaceSecondary }]}
    >
      <View style={[styles.settingIcon, { backgroundColor: danger ? c.expenseLight : c.primary + "15" }]}>
        {iconFamily === "MaterialIcons" ? (
          <MaterialIcons name={icon as any} size={20} color={danger ? c.expense : c.primary} />
        ) : (
          <Ionicons name={icon as any} size={20} color={danger ? c.expense : c.primary} />
        )}
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: c.text }, danger && { color: c.expense }]}>{label}</Text>
        {subtitle && <Text style={[styles.settingSubtitle, { color: c.textSecondary }]}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { transactions, categories, bankAccounts, totalBalance, overallNetBalance, refreshData } = useApp();
  const {
    hasPermission: smsPermission,
    checking: smsChecking,
    isAndroid,
    request: requestSmsPermission,
    openAppSettings,
  } = useSmsPermission();
  const { mode: themeMode, setMode: setThemeMode, isDark } = useTheme();
  const [smsError, setSmsError] = useState<string | null>(null);
  const {
    appLockEnabled,
    setAppLockEnabled,
    setPin,
    hasBiometric,
    hasPin,
    unlockWithBiometric,
    unlockWithPin,
  } = useSecurity();
  const [exporting, setExporting] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinStep, setPinStep] = useState<"set" | "confirm">("set");
  const [pinValue, setPinValue] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [disablePinModalVisible, setDisablePinModalVisible] = useState(false);
  const [disablePinValue, setDisablePinValue] = useState("");
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportBankMode, setExportBankMode] = useState<"all" | "selected">("all");
  const [exportSelectedBankIds, setExportSelectedBankIds] = useState<Set<string>>(new Set());
  const [exportDatePreset, setExportDatePreset] = useState<ExportDatePreset>("month");
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");
  const [updateChecking, setUpdateChecking] = useState(false);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  // SMS listener callback is now managed globally by SmsListenerProvider

  const handleRequestSmsPermission = async () => {
    setSmsError(null);
    const ok = await requestSmsPermission();
    if (!ok) {
      Alert.alert(
        "Permission denied",
        "Open Settings to grant SMS permission for bank transaction import.",
        [{ text: "Cancel", style: "cancel" }, { text: "Open Settings", onPress: openAppSettings }],
      );
    }
  };

  const handleAppLockToggle = async (value: boolean) => {
    if (value) {
      if (hasBiometric) {
        try {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: "Authenticate to enable App Lock",
            fallbackLabel: "Use PIN",
            disableDeviceFallback: false,
          });
          if (result.success) {
            await setAppLockEnabled(true);
            return;
          }
        } catch {
          // fall through to PIN
        }
      }
      setPinValue("");
      setPinConfirm("");
      setPinStep("set");
      setPinModalVisible(true);
    } else {
      if (hasBiometric) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Authenticate to disable App Lock",
          fallbackLabel: "Use PIN",
          disableDeviceFallback: false,
        });
        if (result.success) {
          await setAppLockEnabled(false);
        }
        return;
      }
      if (hasPin) {
        setDisablePinValue("");
        setDisablePinModalVisible(true);
      } else {
        await setAppLockEnabled(false);
      }
    }
  };

  const handlePinModalSubmit = async () => {
    if (pinStep === "set") {
      if (pinValue.length < 4) {
        Alert.alert("PIN too short", "Use at least 4 digits.");
        return;
      }
      setPinStep("confirm");
      setPinConfirm("");
      return;
    }
    if (pinValue !== pinConfirm) {
      Alert.alert("PINs don't match", "Try again.");
      return;
    }
    await setPin(pinValue);
    await setAppLockEnabled(true);
    setPinModalVisible(false);
    setPinValue("");
    setPinConfirm("");
    setPinStep("set");
  };

  const handleDisablePinSubmit = async () => {
    const ok = await unlockWithPin(disablePinValue);
    if (ok) {
      await setAppLockEnabled(false);
      setDisablePinModalVisible(false);
      setDisablePinValue("");
    } else {
      Alert.alert("Wrong PIN", "Try again.");
    }
  };

  const getExportDateRange = (): { start: string; end: string } => {
    const today = getToday();
    switch (exportDatePreset) {
      case "today":
        return { start: today, end: today };
      case "last7":
        return getLast7DaysRange();
      case "month": {
        const month = getCurrentMonth();
        const [y, m] = month.split("-").map(Number);
        const lastDay = new Date(y, m, 0);
        const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
        return { start: `${month}-01`, end };
      }
      case "year":
        return getThisYearRange();
      case "custom":
        return { start: exportDateFrom || today, end: exportDateTo || today };
      default:
        return { start: today, end: today };
    }
  };

  const handleGeneratePdfFromFilters = async () => {
    const { start, end } = getExportDateRange();
    let filtered = transactions.filter((t) => t.date >= start && t.date <= end);
    if (exportBankMode === "selected" && exportSelectedBankIds.size > 0) {
      const includeCash = exportSelectedBankIds.has("__cash__");
      const bankIds = [...exportSelectedBankIds].filter((id) => id !== "__cash__");
      filtered = filtered.filter((t) => {
        if (t.bankAccountId == null) return includeCash;
        return bankIds.includes(t.bankAccountId);
      });
    }
    if (filtered.length === 0) {
      Alert.alert("No Data", "No transactions match the selected filters.");
      return;
    }
    setExportModalVisible(false);
    setExporting(true);
    try {
      const totalIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const totalExpense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      const dateLabel =
        exportDatePreset === "custom"
          ? `${exportDateFrom} to ${exportDateTo}`
          : exportDatePreset === "today"
            ? "Today"
            : exportDatePreset === "last7"
              ? "Last 7 days"
              : exportDatePreset === "month"
                ? "This month"
                : "This year";
      const bankLabel =
        exportBankMode === "all"
          ? "All banks"
          : (bankAccounts.filter((a) => exportSelectedBankIds.has(a.id)).map((a) => a.accountName).join(", ") +
            (exportSelectedBankIds.has("__cash__") ? " + Cash" : "")) || "None selected";
      const filterLabel = `Banks: ${bankLabel}. Date: ${dateLabel}.`;

      let logoBase64: string | null = null;
      try {
        const asset = Asset.fromModule(require("@/assets/images/icon.png"));
        await asset.downloadAsync();
        if (asset.localUri) {
          logoBase64 = await FileSystem.readAsStringAsync(asset.localUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
      } catch {
        // Logo optional
      }
      const html = buildTransactionsPdfHtml(
        {
          transactions: filtered,
          categories,
          totalBalance,
          overallNetBalance,
          totalIncome,
          totalExpense,
        },
        logoBase64,
        { filterLabel },
      );
      if (Platform.OS === "web") {
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(html);
          win.document.close();
          Alert.alert("Export", "Use your browser's Print (Ctrl+P / Cmd+P) and choose \"Save as PDF\" to download.");
        } else {
          Alert.alert("Export Failed", "Please allow pop-ups and try again.");
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: "Export transactions as PDF",
          });
        } else {
          await Share.share({
            url: uri,
            type: "application/pdf",
            title: "Birr Track Transactions",
            message: "Transactions export (PDF)",
          });
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not export transactions.";
      Alert.alert("Export Failed", msg);
    } finally {
      setExporting(false);
    }
  };

  const toggleExportBankSelection = (id: string) => {
    setExportSelectedBankIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will permanently delete all your transactions, bank accounts, budgets, and categories. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
            await AsyncStorage.clear();
            refreshData();
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset, backgroundColor: c.background }]}>
      <Text style={[styles.title, { color: c.text }]}>Settings</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <Text style={[styles.sectionLabel, { color: c.textTertiary }]}>SECURITY</Text>
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
          <View style={styles.settingItem}>
            <View style={[styles.settingIcon, { backgroundColor: c.primary + "15" }]}>
              <Ionicons name="lock-closed-outline" size={20} color={c.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: c.text }]}>App Lock</Text>
              <Text style={[styles.settingSubtitle, { color: c.textSecondary }]}>
                Lock app with biometrics or PIN when backgrounded
              </Text>
            </View>
            <Switch
              value={appLockEnabled}
              onValueChange={handleAppLockToggle}
              trackColor={{ false: c.textTertiary + "50", true: c.primary + "60" }}
              thumbColor={appLockEnabled ? c.primary : c.textSecondary}
            />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: c.textTertiary }]}>{isAndroid ? "SMS IMPORT (ANDROID)" : "SMS IMPORT"}</Text>
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
          {isAndroid ? (
            <>
              <Pressable
                style={styles.settingItem}
                onPress={handleRequestSmsPermission}
                disabled={smsChecking}
              >
                <View style={[styles.settingIcon, { backgroundColor: c.primary + "15" }]}>
                  <Ionicons name="chatbubble-outline" size={20} color={c.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingLabel, { color: c.text }]}>SMS Permission</Text>
                  <Text style={[styles.settingSubtitle, { color: c.textSecondary }]}>
                    {smsChecking
                      ? "Checking…"
                      : smsPermission
                        ? "Permission granted — manage SMS sync per bank"
                        : "Grant permission to read bank SMS"}
                  </Text>
                </View>
                {smsPermission && <Ionicons name="checkmark-circle-outline" size={22} color={c.income} />}
              </Pressable>
              <View style={[styles.smsHintWrap, { borderTopColor: c.borderLight }]}>
                <Ionicons name="information-circle-outline" size={16} color={c.textTertiary} />
                <Text style={[styles.smsHintText, { color: c.textTertiary }]}>
                  Tap a bank account on the Home screen to configure SMS sync for each bank individually.
                </Text>
              </View>
              {smsError ? (
                <View style={[styles.smsErrorWrap, { borderTopColor: c.border }]}>
                  <Text style={[styles.smsError, { color: c.expense }]}>{smsError}</Text>
                  <Text style={[styles.smsErrorHint, { color: c.textTertiary }]}>Use a development build (not Expo Go) for SMS.</Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.settingItem}>
              <View style={[styles.settingIcon, { backgroundColor: c.surfaceSecondary }]}>
                <Ionicons name="chatbubble-outline" size={20} color={c.textTertiary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: c.text }]}>SMS import</Text>
                <Text style={[styles.settingSubtitle, { color: c.textSecondary }]}>Available on Android only</Text>
              </View>
            </View>
          )}
        </View>

        <Text style={[styles.sectionLabel, { color: c.textTertiary }]}>DATA</Text>
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
          <SettingItem
            icon="download-outline"
            label="Export Transactions"
            subtitle="Export as PDF file"
            onPress={() => {
              if (transactions.length === 0) {
                Alert.alert("No Data", "There are no transactions to export.");
              } else {
                setExportModalVisible(true);
              }
            }}
            colors={c}
          />
          <SettingItem
            icon="refresh-outline"
            label="Refresh Data"
            subtitle="Reload all data from storage"
            onPress={refreshData}
            colors={c}
          />
        </View>

        <Text style={[styles.sectionLabel, { color: c.textTertiary }]}>APPEARANCE</Text>
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
          <View style={styles.settingItem}>
            <View style={[styles.settingIcon, { backgroundColor: c.primary + "15" }]}>
              <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={20} color={c.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: c.text }]}>Theme</Text>
              <Text style={[styles.settingSubtitle, { color: c.textSecondary }]}>
                {themeMode === "system" ? "Follow system" : themeMode === "dark" ? "Dark mode" : "Light mode"}
              </Text>
            </View>
          </View>
          <View style={styles.themeRow}>
            {(["system", "light", "dark"] as const).map((m) => (
              <Pressable
                key={m}
                style={[
                  styles.themeOption,
                  { backgroundColor: c.surfaceSecondary },
                  themeMode === m && { borderColor: c.primary, backgroundColor: c.primary + "10" },
                ]}
                onPress={() => setThemeMode(m)}
              >
                <Ionicons
                  name={m === "system" ? "phone-portrait-outline" : m === "light" ? "sunny-outline" : "moon-outline"}
                  size={18}
                  color={themeMode === m ? c.primary : c.textTertiary}
                />
                <Text style={[styles.themeOptionText, { color: c.textSecondary }, themeMode === m && { color: c.primary }]}>
                  {m === "system" ? "System" : m === "light" ? "Light" : "Dark"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: c.textTertiary }]}>GENERAL</Text>
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
          <SettingItem
            icon="cash-outline"
            label="Currency"
            subtitle="Ethiopian Birr (ETB)"
            onPress={() => setCurrencyModalVisible(true)}
            colors={c}
          />
          {!__DEV__ && (
            <SettingItem
              icon="cloud-download-outline"
              label="Check for updates"
              subtitle={updateChecking ? "Checking…" : "Get the latest app version without reinstalling"}
              onPress={async () => {
                setUpdateChecking(true);
                try {
                  const update = await Updates.checkForUpdateAsync();
                  if (update.isAvailable) {
                    await Updates.fetchUpdateAsync();
                    Alert.alert(
                      "Update ready",
                      "Restart the app now to use the latest version? Your data will be kept.",
                      [
                        { text: "Later", style: "cancel" },
                        { text: "Restart", onPress: () => Updates.reloadAsync() },
                      ],
                    );
                  } else {
                    Alert.alert("Up to date", "You're already on the latest version.");
                  }
                } catch (e) {
                  Alert.alert("Update check failed", e instanceof Error ? e.message : "Could not check for updates.");
                } finally {
                  setUpdateChecking(false);
                }
              }}
              colors={c}
            />
          )}
          <SettingItem
            icon="information-circle-outline"
            label="About"
            subtitle="Birr Track v1.0.0"
            onPress={() => router.push("/about")}
            colors={c}
          />
        </View>

        <Text style={[styles.sectionLabel, { color: c.textTertiary }]}>DANGER ZONE</Text>
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
          <SettingItem
            icon="trash-outline"
            label="Clear All Data"
            subtitle="Delete all transactions and settings"
            onPress={handleClearData}
            danger
            colors={c}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: c.primary }]}>Birr Track</Text>
          <Text style={[styles.footerSubtext, { color: c.textSecondary }]}>Ethiopian Expense Tracker</Text>
          <Text style={[styles.footerVersion, { color: c.textTertiary }]}>Version 1.0.0</Text>
          <View style={styles.builtByRow}>
            <Text style={[styles.builtByText, { color: c.textTertiary }]}>Built by </Text>
            <Pressable onPress={() => Linking.openURL("https://henokenyew.me")}>
              <Text style={[styles.builtByLink, { color: c.primary }]}>Henok Enyew</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal visible={pinModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setPinModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: c.surface, borderColor: c.border }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: c.text }]}>
              {pinStep === "set" ? "Set PIN" : "Confirm PIN"}
            </Text>
            <Text style={[styles.modalSubtitle, { color: c.textSecondary }]}>
              {pinStep === "set"
                ? "Enter a 4–6 digit PIN to unlock the app."
                : "Re-enter your PIN."}
            </Text>
            <TextInput
              style={[styles.modalInput, { borderColor: c.border, color: c.text }]}
              value={pinStep === "set" ? pinValue : pinConfirm}
              onChangeText={pinStep === "set" ? setPinValue : setPinConfirm}
              placeholder="PIN"
              placeholderTextColor={c.textTertiary}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButtonSecondary} onPress={() => setPinModalVisible(false)}>
                <Text style={[styles.modalButtonSecondaryText, { color: c.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalButtonPrimary, { backgroundColor: c.primary }]} onPress={handlePinModalSubmit}>
                <Text style={[styles.modalButtonPrimaryText, { color: c.textInverse }]}>
                  {pinStep === "confirm" ? "Enable" : "Next"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={disablePinModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setDisablePinModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: c.surface, borderColor: c.border }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Enter PIN to disable</Text>
            <Text style={[styles.modalSubtitle, { color: c.textSecondary }]}>Enter your app lock PIN.</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: c.border, color: c.text }]}
              value={disablePinValue}
              onChangeText={setDisablePinValue}
              placeholder="PIN"
              placeholderTextColor={c.textTertiary}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalButtonSecondary}
                onPress={() => setDisablePinModalVisible(false)}
              >
                <Text style={[styles.modalButtonSecondaryText, { color: c.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalButtonPrimary, { backgroundColor: c.primary }]} onPress={handleDisablePinSubmit}>
                <Text style={[styles.modalButtonPrimaryText, { color: c.textInverse }]}>Disable</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={currencyModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setCurrencyModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: c.surface, borderColor: c.border }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Select Currency</Text>
            <Text style={[styles.modalSubtitle, { color: c.textSecondary }]}>
              More currencies coming soon.
            </Text>
            <Pressable
              style={[styles.currencyOption, { backgroundColor: c.primary + "10", borderColor: c.primary + "30" }]}
              onPress={() => setCurrencyModalVisible(false)}
            >
              <View style={[styles.currencyFlag, { backgroundColor: c.primary + "20" }]}>
                <Text style={styles.currencyFlagText}>🇪🇹</Text>
              </View>
              <View style={styles.currencyInfo}>
                <Text style={[styles.currencyName, { color: c.text }]}>Ethiopian Birr</Text>
                <Text style={[styles.currencyCode, { color: c.textSecondary }]}>ETB</Text>
              </View>
              <Ionicons name="checkmark-circle" size={24} color={c.primary} />
            </Pressable>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButtonPrimary, { backgroundColor: c.primary, flex: 1 }]}
                onPress={() => setCurrencyModalVisible(false)}
              >
                <Text style={[styles.modalButtonPrimaryText, { color: c.textInverse, textAlign: "center" }]}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={exportModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setExportModalVisible(false)}>
          <Pressable
            style={[styles.exportModalContent, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: c.text }]}>Export PDF</Text>
            <Text style={[styles.modalSubtitle, { color: c.textSecondary, marginBottom: 16 }]}>
              Choose banks and date range for the report.
            </Text>

            <Text style={[styles.exportFilterLabel, { color: c.text }]}>Banks</Text>
            <View style={styles.exportFilterRow}>
              <Pressable
                style={[
                  styles.exportChip,
                  { borderColor: c.borderLight, backgroundColor: exportBankMode === "all" ? c.primary + "15" : c.surface },
                ]}
                onPress={() => setExportBankMode("all")}
              >
                <Text style={[styles.exportChipText, { color: exportBankMode === "all" ? c.primary : c.textSecondary }]}>All banks</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.exportChip,
                  { borderColor: c.borderLight, backgroundColor: exportBankMode === "selected" ? c.primary + "15" : c.surface },
                ]}
                onPress={() => setExportBankMode("selected")}
              >
                <Text style={[styles.exportChipText, { color: exportBankMode === "selected" ? c.primary : c.textSecondary }]}>Selected</Text>
              </Pressable>
            </View>
            {exportBankMode === "selected" && (
              <ScrollView style={styles.exportBankList} nestedScrollEnabled>
                {bankAccounts.map((acc) => (
                  <Pressable
                    key={acc.id}
                    style={styles.exportBankRow}
                    onPress={() => toggleExportBankSelection(acc.id)}
                  >
                    <Ionicons
                      name={exportSelectedBankIds.has(acc.id) ? "checkbox" : "square-outline"}
                      size={22}
                      color={exportSelectedBankIds.has(acc.id) ? c.primary : c.textTertiary}
                    />
                    <Text style={[styles.exportBankName, { color: c.text }]}>{acc.accountName}</Text>
                  </Pressable>
                ))}
                <Pressable
                  style={styles.exportBankRow}
                  onPress={() => toggleExportBankSelection("__cash__")}
                >
                  <Ionicons
                    name={exportSelectedBankIds.has("__cash__") ? "checkbox" : "square-outline"}
                    size={22}
                    color={exportSelectedBankIds.has("__cash__") ? c.primary : c.textTertiary}
                  />
                  <Text style={[styles.exportBankName, { color: c.text }]}>Cash</Text>
                </Pressable>
              </ScrollView>
            )}

            <Text style={[styles.exportFilterLabel, { color: c.text, marginTop: 16 }]}>Date range</Text>
            <View style={styles.exportFilterRow}>
              {(["today", "last7", "month", "year"] as const).map((preset) => (
                <Pressable
                  key={preset}
                  style={[
                    styles.exportChipSmall,
                    { borderColor: c.borderLight, backgroundColor: exportDatePreset === preset ? c.primary + "15" : c.surface },
                  ]}
                  onPress={() => setExportDatePreset(preset)}
                >
                  <Text style={[styles.exportChipTextSmall, { color: exportDatePreset === preset ? c.primary : c.textSecondary }]}>
                    {preset === "today" ? "Today" : preset === "last7" ? "Last 7d" : preset === "month" ? "Month" : "Year"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[
                styles.exportChip,
                { borderColor: c.borderLight, backgroundColor: exportDatePreset === "custom" ? c.primary + "15" : c.surface, marginTop: 6 },
              ]}
              onPress={() => setExportDatePreset("custom")}
            >
              <Text style={[styles.exportChipText, { color: exportDatePreset === "custom" ? c.primary : c.textSecondary }]}>Custom range</Text>
            </Pressable>
            {exportDatePreset === "custom" && (
              <View style={styles.exportCustomRow}>
                <TextInput
                  style={[styles.exportDateInput, { borderColor: c.border, color: c.text }]}
                  value={exportDateFrom}
                  onChangeText={setExportDateFrom}
                  placeholder="From (YYYY-MM-DD)"
                  placeholderTextColor={c.textTertiary}
                />
                <TextInput
                  style={[styles.exportDateInput, { borderColor: c.border, color: c.text }]}
                  value={exportDateTo}
                  onChangeText={setExportDateTo}
                  placeholder="To (YYYY-MM-DD)"
                  placeholderTextColor={c.textTertiary}
                />
              </View>
            )}

            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButtonSecondary} onPress={() => setExportModalVisible(false)}>
                <Text style={[styles.modalButtonSecondaryText, { color: c.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButtonPrimary, { backgroundColor: c.primary }]}
                onPress={handleGeneratePdfFromFilters}
                disabled={exporting}
              >
                <Text style={[styles.modalButtonPrimaryText, { color: c.textInverse }]}>{exporting ? "Generating…" : "Generate PDF"}</Text>
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
  title: {
    fontSize: 26,
    fontFamily: "Rubik_700Bold",
    color: Colors.text,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.textTertiary,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  section: {
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingContent: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: "Rubik_500Medium",
    color: Colors.text,
  },
  settingSubtitle: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    color: Colors.textSecondary,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 4,
  },
  footerText: {
    fontSize: 16,
    fontFamily: "Rubik_700Bold",
    color: Colors.primary,
  },
  footerSubtext: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    color: Colors.textSecondary,
  },
  footerVersion: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    color: Colors.textTertiary,
    marginTop: 4,
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
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exportModalContent: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "85%",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exportFilterLabel: {
    fontSize: 13,
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 8,
  },
  exportFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  exportChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  exportChipText: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
  },
  exportChipSmall: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  exportChipTextSmall: {
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
  },
  exportBankList: {
    maxHeight: 140,
    marginTop: 8,
  },
  exportBankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  exportBankName: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
  },
  exportCustomRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  exportDateInput: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Rubik_700Bold",
    color: Colors.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  modalInput: {
    height: 48,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "Rubik_500Medium",
    color: Colors.text,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  modalButtonSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.textSecondary,
  },
  modalButtonPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.textInverse,
  },
  themeRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  themeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  themeOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "10",
  },
  themeOptionText: {
    fontSize: 13,
    fontFamily: "Rubik_500Medium",
    color: Colors.textSecondary,
  },
  themeOptionTextActive: {
    color: Colors.primary,
    fontFamily: "Rubik_600SemiBold",
  },
  smsHintWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  smsHintText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    color: Colors.textTertiary,
    lineHeight: 18,
  },
  smsErrorWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  smsError: {
    fontSize: 13,
    fontFamily: "Rubik_500Medium",
    color: Colors.expense,
  },
  smsErrorHint: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    color: Colors.textTertiary,
    marginTop: 4,
  },
  builtByRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  builtByText: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
  },
  builtByLink: {
    fontSize: 13,
    fontFamily: "Rubik_600SemiBold",
    textDecorationLine: "underline",
  },
  currencyOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 20,
  },
  currencyFlag: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  currencyFlagText: {
    fontSize: 22,
  },
  currencyInfo: {
    flex: 1,
    gap: 1,
  },
  currencyName: {
    fontSize: 15,
    fontFamily: "Rubik_500Medium",
  },
  currencyCode: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
  },
});
