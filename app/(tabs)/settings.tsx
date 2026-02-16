import React, { useState, useEffect } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { useApp } from "@/contexts/AppContext";
import { useSecurity } from "@/contexts/SecurityContext";
import { useSmsPermission } from "@/hooks/useSmsPermission";
import { exportTransactionsCSV } from "@/lib/storage";
import { setSmsImportedCallback, startSmsListener } from "@/lib/sms";
import Colors from "@/constants/colors";

interface SettingItemProps {
  icon: string;
  iconFamily?: "Ionicons" | "MaterialIcons";
  label: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}

function SettingItem({ icon, iconFamily = "Ionicons", label, subtitle, onPress, danger }: SettingItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.settingItem, pressed && { backgroundColor: Colors.surfaceSecondary }]}
    >
      <View style={[styles.settingIcon, { backgroundColor: danger ? Colors.expenseLight : Colors.primary + "15" }]}>
        {iconFamily === "MaterialIcons" ? (
          <MaterialIcons name={icon as any} size={20} color={danger ? Colors.expense : Colors.primary} />
        ) : (
          <Ionicons name={icon as any} size={20} color={danger ? Colors.expense : Colors.primary} />
        )}
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, danger && { color: Colors.expense }]}>{label}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { transactions, categories, refreshData } = useApp();
  const {
    hasPermission: smsPermission,
    checking: smsChecking,
    isAndroid,
    request: requestSmsPermission,
    openAppSettings,
  } = useSmsPermission();
  const [smsListening, setSmsListening] = useState(false);
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
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  useEffect(() => {
    setSmsImportedCallback(refreshData);
    return () => setSmsImportedCallback(null);
  }, [refreshData]);

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

  const handleStartSmsListening = async () => {
    setSmsError(null);
    const result = await startSmsListener();
    if (result.started) {
      setSmsListening(true);
    } else {
      setSmsError(result.error ?? "Failed to start");
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

  const handleStartSmsListening = async () => {
    setSmsError(null);
    const result = await startSmsListener();
    if (result.started) {
      setSmsListening(true);
    } else {
      setSmsError(result.error ?? "Failed to start");
    }
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

  const handleExport = async () => {
    if (transactions.length === 0) {
      Alert.alert("No Data", "There are no transactions to export.");
      return;
    }
    setExporting(true);
    try {
      const csv = await exportTransactionsCSV(transactions, categories);
      if (Platform.OS === "web") {
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "birr-track-transactions.csv";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          message: csv,
          title: "Birr Track Transactions",
        });
      }
    } catch (e) {
      Alert.alert("Export Failed", "Could not export transactions.");
    } finally {
      setExporting(false);
    }
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
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <Text style={styles.title}>Settings</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <Text style={styles.sectionLabel}>SECURITY</Text>
        <View style={styles.section}>
          <View style={styles.settingItem}>
            <View style={[styles.settingIcon, { backgroundColor: Colors.primary + "15" }]}>
              <Ionicons name="lock-closed" size={20} color={Colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>App Lock</Text>
              <Text style={styles.settingSubtitle}>
                Lock app with biometrics or PIN when backgrounded
              </Text>
            </View>
            <Switch
              value={appLockEnabled}
              onValueChange={handleAppLockToggle}
              trackColor={{ false: Colors.border, true: Colors.primary + "60" }}
              thumbColor={appLockEnabled ? Colors.primary : Colors.surface}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>{isAndroid ? "SMS IMPORT (ANDROID)" : "SMS IMPORT"}</Text>
        <View style={styles.section}>
          {isAndroid ? (
            <>
              <Pressable
                style={styles.settingItem}
                onPress={handleRequestSmsPermission}
                disabled={smsChecking}
              >
                <View style={[styles.settingIcon, { backgroundColor: Colors.primary + "15" }]}>
                  <Ionicons name="chatbubble-outline" size={20} color={Colors.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingLabel}>Enable SMS import</Text>
                  <Text style={styles.settingSubtitle}>
                    {smsChecking
                      ? "Checking…"
                      : smsPermission
                        ? "Permission granted"
                        : "Grant permission to read bank SMS"}
                  </Text>
                </View>
                {smsPermission && <Ionicons name="checkmark-circle" size={22} color={Colors.income} />}
              </Pressable>
              <Pressable
                style={styles.settingItem}
                onPress={handleStartSmsListening}
                disabled={!smsPermission || smsListening}
              >
                <View style={[styles.settingIcon, { backgroundColor: Colors.primary + "15" }]}>
                  <Ionicons name="phone-portrait-outline" size={20} color={Colors.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingLabel}>Listen for new bank SMS</Text>
                  <Text style={styles.settingSubtitle}>
                    {smsListening
                      ? "Listening… new bank SMS will be imported automatically"
                      : "Start listening for incoming bank messages"}
                  </Text>
                </View>
              </Pressable>
              <SettingItem
                icon="document-text-outline"
                label="Scan past bank SMS"
                subtitle="Import from existing bank messages"
                onPress={() =>
                  Alert.alert(
                    "Historical scan",
                    "Reading past SMS requires a development build (npx expo run:android). Use 'Listen for new bank SMS' to import new messages automatically.",
                    [{ text: "OK" }],
                  )
                }
              />
              {smsError ? (
                <View style={styles.smsErrorWrap}>
                  <Text style={styles.smsError}>{smsError}</Text>
                  <Text style={styles.smsErrorHint}>Use a development build (not Expo Go) for SMS.</Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.settingItem}>
              <View style={[styles.settingIcon, { backgroundColor: Colors.surfaceSecondary }]}>
                <Ionicons name="chatbubble-outline" size={20} color={Colors.textTertiary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>SMS import</Text>
                <Text style={styles.settingSubtitle}>Available on Android only</Text>
              </View>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>DATA</Text>
        <View style={styles.section}>
          <SettingItem
            icon="download-outline"
            label="Export Transactions"
            subtitle="Export as CSV file"
            onPress={handleExport}
          />
          <SettingItem
            icon="refresh"
            label="Refresh Data"
            subtitle="Reload all data from storage"
            onPress={refreshData}
          />
        </View>

        <Text style={styles.sectionLabel}>GENERAL</Text>
        <View style={styles.section}>
          <SettingItem
            icon="cash-outline"
            label="Currency"
            subtitle="Ethiopian Birr (ETB)"
            onPress={() => {}}
          />
          <SettingItem
            icon="information-circle-outline"
            label="About"
            subtitle="Birr Track v1.0.0"
            onPress={() => {}}
          />
        </View>

        <Text style={styles.sectionLabel}>DANGER ZONE</Text>
        <View style={styles.section}>
          <SettingItem
            icon="trash-outline"
            label="Clear All Data"
            subtitle="Delete all transactions and settings"
            onPress={handleClearData}
            danger
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Birr Track</Text>
          <Text style={styles.footerSubtext}>Ethiopian Expense Tracker</Text>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      <Modal visible={pinModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setPinModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {pinStep === "set" ? "Set PIN" : "Confirm PIN"}
            </Text>
            <Text style={styles.modalSubtitle}>
              {pinStep === "set"
                ? "Enter a 4–6 digit PIN to unlock the app."
                : "Re-enter your PIN."}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={pinStep === "set" ? pinValue : pinConfirm}
              onChangeText={pinStep === "set" ? setPinValue : setPinConfirm}
              placeholder="PIN"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButtonSecondary} onPress={() => setPinModalVisible(false)}>
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalButtonPrimary} onPress={handlePinModalSubmit}>
                <Text style={styles.modalButtonPrimaryText}>
                  {pinStep === "confirm" ? "Enable" : "Next"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={disablePinModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setDisablePinModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Enter PIN to disable</Text>
            <Text style={styles.modalSubtitle}>Enter your app lock PIN.</Text>
            <TextInput
              style={styles.modalInput}
              value={disablePinValue}
              onChangeText={setDisablePinValue}
              placeholder="PIN"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalButtonSecondary}
                onPress={() => setDisablePinModalVisible(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalButtonPrimary} onPress={handleDisablePinSubmit}>
                <Text style={styles.modalButtonPrimaryText}>Disable</Text>
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
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
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
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  settingSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 4,
  },
  footerText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  footerSubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  footerVersion: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
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
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
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
    fontFamily: "Inter_500Medium",
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
    fontFamily: "Inter_600SemiBold",
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
    fontFamily: "Inter_600SemiBold",
    color: Colors.textInverse,
  },
  smsErrorWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  smsError: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.expense,
  },
  smsErrorHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 4,
  },
});
