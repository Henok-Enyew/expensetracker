import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/contexts/ThemeContext";
import { formatCurrency } from "@/lib/utils";
import Colors from "@/constants/colors";

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const {
    friends,
    friendsNet,
    getNetForFriend,
    refreshData,
    isLoading,
  } = useApp();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      const netA = Math.abs(getNetForFriend(a.id));
      const netB = Math.abs(getNetForFriend(b.id));
      return netB - netA;
    });
  }, [friends, getNetForFriend]);

  const handleAddFriend = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/add-friend");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset, backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Friends</Text>
        <Pressable onPress={handleAddFriend} style={[styles.addBtn, { backgroundColor: c.primary }]}>
          <Ionicons name="person-add" size={18} color={c.textInverse} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refreshData} tintColor={c.primary} />}
      >
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderLeftColor: c.income, backgroundColor: c.surface, borderColor: c.borderLight }]}>
            <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>Owed to you</Text>
            <Text style={[styles.summaryValue, { color: c.income }]}>
              {formatCurrency(friendsNet.totalOwedToMe)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: c.expense, backgroundColor: c.surface, borderColor: c.borderLight }]}>
            <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>You owe</Text>
            <Text style={[styles.summaryValue, { color: c.expense }]}>
              {formatCurrency(friendsNet.totalIOwe)}
            </Text>
          </View>
        </View>

        {/* Net Card */}
        <View style={[styles.netCard, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
          <Text style={[styles.netLabel, { color: c.textSecondary }]}>Net with friends</Text>
          <Text
            style={[
              styles.netValue,
              {
                color:
                  friendsNet.netWithFriends > 0
                    ? c.income
                    : friendsNet.netWithFriends < 0
                      ? c.expense
                      : c.text,
              },
            ]}
          >
            {friendsNet.netWithFriends >= 0 ? "+" : ""}
            {formatCurrency(Math.abs(friendsNet.netWithFriends))}
          </Text>
          {friendsNet.netWithFriends !== 0 && (
            <Text style={[styles.netHint, { color: c.textTertiary }]}>
              {friendsNet.netWithFriends > 0
                ? "Friends owe you overall"
                : "You owe friends overall"}
            </Text>
          )}
        </View>

        {/* Friends List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>
            {friends.length > 0 ? `All Friends (${friends.length})` : "No friends yet"}
          </Text>

          {sortedFriends.length === 0 ? (
            <Pressable style={styles.emptyState} onPress={handleAddFriend}>
              <Ionicons name="people-outline" size={48} color={c.textTertiary} />
              <Text style={[styles.emptyTitle, { color: c.text }]}>Track loans & debts</Text>
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                Add a friend to start tracking money lent or borrowed
              </Text>
            </Pressable>
          ) : (
            <View style={[styles.friendsList, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
              {sortedFriends.map((friend) => {
                const net = getNetForFriend(friend.id);
                const isPositive = net > 0;
                const isNeutral = net === 0;
                return (
                  <Pressable
                    key={friend.id}
                    style={({ pressed }) => [
                      styles.friendItem,
                      pressed && { backgroundColor: c.surfaceSecondary },
                    ]}
                    onPress={() =>
                      router.push({ pathname: "/friend-detail", params: { id: friend.id } })
                    }
                  >
                    <View
                      style={[
                        styles.avatar,
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
                          styles.avatarText,
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

                    <View style={styles.friendInfo}>
                      <Text style={[styles.friendName, { color: c.text }]}>{friend.name}</Text>
                      <Text style={[styles.friendSub, { color: c.textSecondary }]}>
                        {isNeutral
                          ? "Settled up"
                          : isPositive
                            ? `Owes you ${formatCurrency(net)}`
                            : `You owe ${formatCurrency(Math.abs(net))}`}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.friendNet,
                        {
                          color: isNeutral
                            ? c.textTertiary
                            : isPositive
                              ? c.income
                              : c.expense,
                        },
                      ]}
                    >
                      {isNeutral ? "—" : `${isPositive ? "+" : "-"}${formatCurrency(Math.abs(net))}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Pressable style={[styles.fab, { backgroundColor: c.primary, shadowColor: c.primary }]} onPress={handleAddFriend}>
        <Ionicons name="person-add" size={24} color={c.textInverse} />
      </Pressable>
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
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  netCard: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  netLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  netValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  netHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 4,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 12,
  },
  friendsList: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  friendInfo: {
    flex: 1,
    gap: 2,
  },
  friendName: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  friendSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  friendNet: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
});
