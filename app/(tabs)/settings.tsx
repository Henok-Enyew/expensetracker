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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useApp } from "@/contexts/AppContext";
import { exportTransactionsCSV } from "@/lib/storage";
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
  const [exporting, setExporting] = useState(false);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

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
});
