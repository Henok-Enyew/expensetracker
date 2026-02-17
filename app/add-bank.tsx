import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/contexts/ThemeContext";
import { BANKS, BankInfo } from "@/constants/banks";
import { generateId } from "@/lib/utils";
import { useSmsPermission } from "@/hooks/useSmsPermission";
import Colors from "@/constants/colors";

export default function AddBankScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { addBankAccount } = useApp();
  const { hasPermission, isAndroid, request: requestSmsPermission } = useSmsPermission();
  const [selectedBank, setSelectedBank] = useState<BankInfo | null>(null);
  const [accountName, setAccountName] = useState("");
  const [balance, setBalance] = useState("");
  const [enableSmsSync, setEnableSmsSync] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedBank) return;
    const numBalance = parseFloat(balance) || 0;

    setSaving(true);
    try {
      const accountId = generateId();
      await addBankAccount({
        id: accountId,
        bankId: selectedBank.id,
        accountName: accountName.trim() || selectedBank.shortName,
        balance: numBalance,
        lastUpdated: new Date().toISOString(),
        smsSyncEnabled: enableSmsSync,
      });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (enableSmsSync) {
        router.replace({ pathname: "/bank-detail", params: { id: accountId } });
      } else {
        router.back();
      }
    } catch {
      setSaving(false);
    }
  };

  const handleToggleSmsSync = async (value: boolean) => {
    if (value && isAndroid && !hasPermission) {
      const granted = await requestSmsPermission();
      if (!granted) return;
    }
    setEnableSmsSync(value);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.title, { color: c.text }]}>Add Bank Account</Text>
        <Pressable
          onPress={handleSave}
          disabled={!selectedBank || saving}
          style={({ pressed }) => [{ opacity: selectedBank && !saving ? (pressed ? 0.7 : 1) : 0.4 }]}
        >
          <Ionicons name="checkmark" size={24} color={c.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={[styles.sectionLabel, { color: c.text }]}>Select Bank</Text>
        <View style={styles.bankGrid}>
          {BANKS.map((bank) => {
            const isSelected = selectedBank?.id === bank.id;
            return (
              <Pressable
                key={bank.id}
                onPress={() => setSelectedBank(bank)}
                style={[
                  styles.bankItem,
                  { borderColor: c.border, backgroundColor: c.surface },
                  isSelected && { borderColor: bank.color, backgroundColor: bank.color + "10" },
                ]}
              >
                {bank.logo ? (
                  <Image source={bank.logo} style={styles.bankLogoImage} resizeMode="contain" />
                ) : (
                  <View style={[styles.bankLogo, { backgroundColor: bank.color }]}>
                    <Text style={styles.bankLogoText}>{bank.iconLetter}</Text>
                  </View>
                )}
                <Text style={[styles.bankName, { color: c.text }, isSelected && { fontFamily: "Inter_600SemiBold" as const }]} numberOfLines={1}>
                  {bank.shortName}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {selectedBank && (
          <>
            <Text style={[styles.sectionLabel, { color: c.text }]}>Account Name (optional)</Text>
            <TextInput
              style={[styles.input, { color: c.text, backgroundColor: c.surfaceSecondary }]}
              placeholder={`${selectedBank.shortName} Account`}
              placeholderTextColor={c.textTertiary}
              value={accountName}
              onChangeText={setAccountName}
            />

            <Text style={[styles.sectionLabel, { color: c.text }]}>Current Balance (ETB)</Text>
            <View style={[styles.balanceRow, { backgroundColor: c.surfaceSecondary }]}>
              <Text style={[styles.currencyLabel, { color: c.textSecondary }]}>ETB</Text>
              <TextInput
                style={[styles.balanceInput, { color: c.text }]}
                placeholder="0.00"
                placeholderTextColor={c.textTertiary}
                keyboardType="decimal-pad"
                value={balance}
                onChangeText={setBalance}
              />
            </View>

            {/* SMS Sync Option */}
            {isAndroid && (
              <View style={styles.smsSection}>
                <Text style={[styles.sectionLabel, { color: c.text }]}>SMS Import</Text>
                <View style={[styles.smsCard, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
                  <View style={styles.smsRow}>
                    <View style={styles.smsInfo}>
                      <Ionicons name="chatbubble-outline" size={20} color={c.primary} />
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={[styles.smsTitle, { color: c.text }]}>Enable SMS Parsing</Text>
                        <Text style={[styles.smsSubtitle, { color: c.textSecondary }]}>
                          Auto-import transactions from {selectedBank.shortName} SMS messages to get your balance and history
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={enableSmsSync}
                      onValueChange={handleToggleSmsSync}
                      trackColor={{ false: c.border, true: c.primary + "60" }}
                      thumbColor={enableSmsSync ? c.primary : c.surface}
                    />
                  </View>
                  {enableSmsSync && (
                    <View style={[styles.smsEnabledHint, { borderTopColor: c.borderLight }]}>
                      <Ionicons name="information-circle-outline" size={15} color={c.income} />
                      <Text style={[styles.smsHintText, { color: c.income }]}>
                        After adding the account, you'll be taken to the bank detail screen where you can manage sync and test SMS parsing.
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            <Pressable style={[styles.saveBtn, { backgroundColor: c.primary }]} onPress={handleSave} disabled={saving}>
              <Text style={[styles.saveBtnText, { color: c.textInverse }]}>
                {saving ? "Saving..." : enableSmsSync ? "Add & Configure SMS" : "Add Account"}
              </Text>
            </Pressable>
          </>
        )}
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
  sectionLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 10,
    marginTop: 16,
  },
  bankGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bankItem: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    width: "30%" as any,
    minWidth: 90,
  },
  bankLogoImage: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  bankLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bankLogoText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  bankName: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    textAlign: "center",
  },
  input: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  currencyLabel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textSecondary,
  },
  balanceInput: {
    flex: 1,
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    paddingVertical: 14,
  },
  smsSection: {
    marginTop: 8,
  },
  smsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  smsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  smsInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  smsTitle: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  smsSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  smsEnabledHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  smsHintText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.income,
    lineHeight: 17,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textInverse,
  },
});
