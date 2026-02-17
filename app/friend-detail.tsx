import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/contexts/ThemeContext";
import { generateId, formatCurrency, formatDate } from "@/lib/utils";
import type { LoanDirection } from "@/lib/types";
import Colors from "@/constants/colors";

export default function FriendDetailScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    friends,
    friendTransactions,
    getNetForFriend,
    addFriendTransaction,
    deleteFriendTransaction,
    deleteFriend,
    updateFriend,
  } = useApp();

  const friend = friends.find((f) => f.id === id);
  const net = friend ? getNetForFriend(friend.id) : 0;

  const txns = useMemo(() => {
    if (!friend) return [];
    return friendTransactions
      .filter((t) => t.friendId === friend.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [friendTransactions, friend]);

  // Add entry form state
  const [showForm, setShowForm] = useState(false);
  const [direction, setDirection] = useState<LoanDirection>("lent");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAddEntry = useCallback(async () => {
    if (!friend || !amount.trim()) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Invalid amount", "Enter a positive number.");
      return;
    }
    setSaving(true);
    try {
      await addFriendTransaction({
        id: generateId(),
        friendId: friend.id,
        direction,
        amount: numAmount,
        reason: reason.trim() || undefined,
        date: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
      });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAmount("");
      setReason("");
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }, [friend, amount, reason, direction, addFriendTransaction]);

  const handleDeleteEntry = useCallback(
    (txnId: string) => {
      Alert.alert("Delete entry", "Remove this loan entry?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteFriendTransaction(txnId),
        },
      ]);
    },
    [deleteFriendTransaction],
  );

  const handleDeleteFriend = useCallback(() => {
    if (!friend) return;
    Alert.alert(
      "Delete Friend",
      `Remove "${friend.name}" and all their loan entries?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteFriend(friend.id);
            router.back();
          },
        },
      ],
    );
  }, [friend, deleteFriend]);

  const handleChangePhoto = useCallback(async () => {
    if (!friend) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      await updateFriend({ ...friend, photoUri: result.assets[0].uri });
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [friend, updateFriend]);

  if (!friend) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={c.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: c.text }]}>Friend</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyCenter}>
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>Friend not found</Text>
        </View>
      </View>
    );
  }

  const isPositive = net > 0;
  const isNeutral = net === 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, backgroundColor: c.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>{friend.name}</Text>
        <Pressable onPress={handleDeleteFriend} hitSlop={12}>
          <Ionicons name="trash-outline" size={22} color={c.expense} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Profile & Net Card */}
        <View style={styles.profileCard}>
          <Pressable onPress={handleChangePhoto} style={styles.avatarWrap}>
            {friend.photoUri ? (
              <Image source={{ uri: friend.photoUri }} style={styles.bigAvatarImage} />
            ) : (
              <View
                style={[
                  styles.bigAvatar,
                  {
                    backgroundColor: isNeutral
                      ? c.surfaceTertiary
                      : isPositive
                        ? c.incomeLight
                        : c.expenseLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.bigAvatarText,
                    {
                      color: isNeutral
                        ? c.textSecondary
                        : isPositive
                          ? c.income
                          : c.expense,
                    },
                  ]}
                >
                  {friend.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.photoBadge, { backgroundColor: c.primary, borderColor: c.background }]}>
              <Ionicons name="camera-outline" size={14} color={c.textInverse} />
            </View>
          </Pressable>
          <Text style={[styles.profileName, { color: c.text }]}>{friend.name}</Text>
          {friend.phone ? (
            <Text style={[styles.profilePhone, { color: c.textSecondary }]}>{friend.phone}</Text>
          ) : null}

          <View style={[styles.netBadge, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
            <Text
              style={[
                styles.netBadgeValue,
                {
                  color: isNeutral
                    ? c.text
                    : isPositive
                      ? c.income
                      : c.expense,
                },
              ]}
            >
              {isNeutral
                ? "Settled up"
                : isPositive
                  ? `Owes you ${formatCurrency(net)}`
                  : `You owe ${formatCurrency(Math.abs(net))}`}
            </Text>
          </View>
          {friend.note ? (
            <Text style={[styles.profileNote, { color: c.textTertiary }]}>{friend.note}</Text>
          ) : null}
        </View>

        {/* Add Entry Button / Form */}
        <View style={styles.section}>
          {!showForm ? (
            <Pressable style={[styles.addEntryBtn, { backgroundColor: c.surface, borderColor: c.primary + "30" }]} onPress={() => setShowForm(true)}>
              <Ionicons name="add-circle-outline" size={20} color={c.primary} />
              <Text style={[styles.addEntryText, { color: c.primary }]}>Add Loan Entry</Text>
            </Pressable>
          ) : (
            <View style={[styles.formCard, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
              <Text style={[styles.formTitle, { color: c.text }]}>New Entry</Text>

              {/* Direction Selector */}
              <View style={styles.directionRow}>
                <Pressable
                  style={[
                    styles.directionBtn,
                    { backgroundColor: c.surfaceSecondary, borderColor: c.border },
                    direction === "lent" && { backgroundColor: c.incomeLight, borderColor: c.income },
                  ]}
                  onPress={() => setDirection("lent")}
                >
                  <Ionicons
                    name="arrow-up-circle-outline"
                    size={18}
                    color={direction === "lent" ? c.income : c.textTertiary}
                  />
                  <Text
                    style={[
                      styles.directionText,
                      { color: c.textSecondary },
                      direction === "lent" && { color: c.income, fontFamily: "Rubik_600SemiBold" },
                    ]}
                  >
                    I lent them
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.directionBtn,
                    { backgroundColor: c.surfaceSecondary, borderColor: c.border },
                    direction === "borrowed" && { backgroundColor: c.expenseLight, borderColor: c.expense },
                  ]}
                  onPress={() => setDirection("borrowed")}
                >
                  <Ionicons
                    name="arrow-down-circle-outline"
                    size={18}
                    color={direction === "borrowed" ? c.expense : c.textTertiary}
                  />
                  <Text
                    style={[
                      styles.directionText,
                      { color: c.textSecondary },
                      direction === "borrowed" && { color: c.expense, fontFamily: "Rubik_600SemiBold" },
                    ]}
                  >
                    I borrowed
                  </Text>
                </Pressable>
              </View>

              {/* Amount */}
              <View style={[styles.amountRow, { backgroundColor: c.surfaceSecondary }]}>
                <Text style={[styles.amountPrefix, { color: c.textSecondary }]}>ETB</Text>
                <TextInput
                  style={[styles.amountInput, { color: c.text }]}
                  placeholder="0.00"
                  placeholderTextColor={c.textTertiary}
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>

              {/* Reason */}
              <TextInput
                style={[styles.reasonInput, { backgroundColor: c.surfaceSecondary, color: c.text }]}
                placeholder="Reason / note (optional)"
                placeholderTextColor={c.textTertiary}
                value={reason}
                onChangeText={setReason}
              />

              {/* Actions */}
              <View style={styles.formActions}>
                <Pressable
                  style={[styles.cancelBtn, { backgroundColor: c.surfaceSecondary }]}
                  onPress={() => {
                    setShowForm(false);
                    setAmount("");
                    setReason("");
                  }}
                >
                  <Text style={[styles.cancelBtnText, { color: c.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.saveBtn, { backgroundColor: c.primary }]} onPress={handleAddEntry} disabled={saving}>
                  <Text style={[styles.saveBtnText, { color: c.textInverse }]}>{saving ? "Saving..." : "Add"}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Transaction History */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>History ({txns.length})</Text>
          {txns.length === 0 ? (
            <View style={styles.emptyTxn}>
              <Ionicons name="swap-horizontal-outline" size={36} color={c.textTertiary} />
              <Text style={[styles.emptyTxnText, { color: c.textSecondary }]}>No entries yet</Text>
            </View>
          ) : (
            <View style={[styles.txnList, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
              {txns.map((txn) => {
                const isLent = txn.direction === "lent";
                return (
                  <Pressable
                    key={txn.id}
                    style={styles.txnItem}
                    onLongPress={() => handleDeleteEntry(txn.id)}
                  >
                    <View
                      style={[
                        styles.txnIcon,
                        { backgroundColor: isLent ? c.incomeLight : c.expenseLight },
                      ]}
                    >
                      <Ionicons
                        name={isLent ? "arrow-up" : "arrow-down"}
                        size={16}
                        color={isLent ? c.income : c.expense}
                      />
                    </View>
                    <View style={styles.txnInfo}>
                      <Text style={[styles.txnDirection, { color: c.text }]}>
                        {isLent ? "You lent" : "You borrowed"}
                      </Text>
                      {txn.reason ? (
                        <Text style={[styles.txnReason, { color: c.textSecondary }]} numberOfLines={1}>
                          {txn.reason}
                        </Text>
                      ) : null}
                      <Text style={[styles.txnDate, { color: c.textTertiary }]}>{formatDate(txn.date)}</Text>
                    </View>
                    <Text
                      style={[
                        styles.txnAmount,
                        { color: isLent ? c.income : c.expense },
                      ]}
                    >
                      {isLent ? "+" : "-"}{formatCurrency(txn.amount)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  profileCard: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 12,
  },
  bigAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  bigAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  photoBadge: {
    position: "absolute",
    bottom: 0,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  bigAvatarText: {
    fontSize: 30,
    fontFamily: "Rubik_700Bold",
  },
  profileName: {
    fontSize: 22,
    fontFamily: "Rubik_700Bold",
    color: Colors.text,
  },
  profilePhone: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  netBadge: {
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  netBadgeValue: {
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
  },
  profileNote: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    color: Colors.textTertiary,
    marginTop: 8,
    textAlign: "center",
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.text,
    marginBottom: 12,
  },
  addEntryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary + "30",
    borderStyle: "dashed",
  },
  addEntryText: {
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.primary,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  formTitle: {
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.text,
    marginBottom: 16,
  },
  directionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  directionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
  },
  directionText: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
    color: Colors.textSecondary,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  amountPrefix: {
    fontSize: 16,
    fontFamily: "Rubik_700Bold",
    color: Colors.textSecondary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontFamily: "Rubik_700Bold",
    color: Colors.text,
    paddingVertical: 12,
  },
  reasonInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: "Rubik_400Regular",
    color: Colors.text,
    marginBottom: 16,
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
  },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
    color: Colors.textInverse,
  },
  txnList: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  txnItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  txnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  txnInfo: {
    flex: 1,
    gap: 1,
  },
  txnDirection: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
    color: Colors.text,
  },
  txnReason: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    color: Colors.textSecondary,
  },
  txnDate: {
    fontSize: 11,
    fontFamily: "Rubik_400Regular",
    color: Colors.textTertiary,
  },
  txnAmount: {
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
  emptyCenter: {
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
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    color: Colors.textSecondary,
  },
});
