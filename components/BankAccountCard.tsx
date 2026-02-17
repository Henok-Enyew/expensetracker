import React from "react";
import { View, Text, Image, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BankAccount } from "@/lib/types";
import { getBankById } from "@/constants/banks";
import { formatCurrencyShort } from "@/lib/utils";
import { useColors } from "@/contexts/ThemeContext";
import Colors from "@/constants/colors";

interface BankAccountCardProps {
  account: BankAccount;
  onPress?: () => void;
}

export function BankAccountCard({ account, onPress }: BankAccountCardProps) {
  const c = useColors();
  const bank = getBankById(account.bankId);
  if (!bank) return null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: c.surface, borderColor: c.borderLight, shadowColor: c.cardShadow },
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
    >
      {account.smsSyncEnabled && (
        <View style={styles.syncBadge}>
          <Ionicons name="sync-circle" size={14} color={c.primary} />
        </View>
      )}
      {bank.logo ? (
        <Image source={bank.logo} style={styles.logoImage} resizeMode="contain" />
      ) : (
        <View style={[styles.logo, { backgroundColor: bank.color }]}>
          <Text style={styles.logoText}>{bank.iconLetter}</Text>
        </View>
      )}
      <Text style={[styles.bankName, { color: c.text }]} numberOfLines={1}>{bank.shortName}</Text>
      <Text style={[styles.balance, { color: c.textSecondary }]}>{formatCurrencyShort(account.balance)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 8,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    position: "relative",
  },
  syncBadge: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  logoImage: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  bankName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  balance: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
});
