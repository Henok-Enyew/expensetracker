import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/contexts/AppContext";
import { BANKS, BankInfo } from "@/constants/banks";
import { generateId } from "@/lib/utils";
import Colors from "@/constants/colors";

export default function AddBankScreen() {
  const insets = useSafeAreaInsets();
  const { addBankAccount } = useApp();
  const [selectedBank, setSelectedBank] = useState<BankInfo | null>(null);
  const [accountName, setAccountName] = useState("");
  const [balance, setBalance] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedBank) return;
    const numBalance = parseFloat(balance) || 0;

    setSaving(true);
    try {
      await addBankAccount({
        id: generateId(),
        bankId: selectedBank.id,
        accountName: accountName.trim() || selectedBank.shortName,
        balance: numBalance,
        lastUpdated: new Date().toISOString(),
      });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Add Bank Account</Text>
        <Pressable
          onPress={handleSave}
          disabled={!selectedBank || saving}
          style={({ pressed }) => [{ opacity: selectedBank && !saving ? (pressed ? 0.7 : 1) : 0.4 }]}
        >
          <Ionicons name="checkmark" size={24} color={Colors.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Select Bank</Text>
        <View style={styles.bankGrid}>
          {BANKS.map((bank) => {
            const isSelected = selectedBank?.id === bank.id;
            return (
              <Pressable
                key={bank.id}
                onPress={() => setSelectedBank(bank)}
                style={[styles.bankItem, isSelected && { borderColor: bank.color, backgroundColor: bank.color + "10" }]}
              >
                <View style={[styles.bankLogo, { backgroundColor: bank.color }]}>
                  <Text style={styles.bankLogoText}>{bank.iconLetter}</Text>
                </View>
                <Text style={[styles.bankName, isSelected && { fontFamily: "Inter_600SemiBold" as const }]} numberOfLines={1}>
                  {bank.shortName}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {selectedBank && (
          <>
            <Text style={styles.sectionLabel}>Account Name (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder={`${selectedBank.shortName} Account`}
              placeholderTextColor={Colors.textTertiary}
              value={accountName}
              onChangeText={setAccountName}
            />

            <Text style={styles.sectionLabel}>Current Balance (ETB)</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.currencyLabel}>ETB</Text>
              <TextInput
                style={styles.balanceInput}
                placeholder="0.00"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="decimal-pad"
                value={balance}
                onChangeText={setBalance}
              />
            </View>

            <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Add Account"}</Text>
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
