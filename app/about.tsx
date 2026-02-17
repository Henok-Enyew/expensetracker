import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/contexts/ThemeContext";

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>About</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={[styles.logoCard, { backgroundColor: c.primary + "10", borderColor: c.primary + "25" }]}>
          <View style={[styles.logoCircle, { backgroundColor: c.primary }]}>
            <Text style={styles.logoText}>B</Text>
          </View>
          <Text style={[styles.appName, { color: c.text }]}>Birr Track</Text>
          <Text style={[styles.version, { color: c.textSecondary }]}>Version 1.0.0</Text>
        </View>

        <View style={[styles.messageCard, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
          <Text style={[styles.messageText, { color: c.text }]}>
            I built this app because I couldn't find the perfect app for my needs to manage my expenses and to track my loans and debts with my friends.
          </Text>
          <Text style={[styles.messageText, { color: c.text, marginTop: 16 }]}>
            Feel free to reach me out for any bug fixes and feature requests.
          </Text>
        </View>

        <Pressable
          style={[styles.contactCard, { backgroundColor: c.primary + "10", borderColor: c.primary + "25" }]}
          onPress={() => Linking.openURL("https://henokenyew.me")}
        >
          <View style={[styles.contactIcon, { backgroundColor: c.primary + "20" }]}>
            <Ionicons name="globe-outline" size={22} color={c.primary} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={[styles.contactName, { color: c.text }]}>Henok Enyew</Text>
            <Text style={[styles.contactLink, { color: c.primary }]}>henokenyew.me</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={c.primary} />
        </Pressable>

        <View style={styles.footer}>
          <Text style={[styles.copyright, { color: c.textTertiary }]}>
            © 2026 Ethiopia. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  logoCard: {
    alignItems: "center",
    paddingVertical: 32,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logoText: {
    fontSize: 32,
    fontFamily: "Rubik_700Bold",
    color: "#FFFFFF",
  },
  appName: {
    fontSize: 22,
    fontFamily: "Rubik_700Bold",
  },
  version: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    marginTop: 4,
  },
  messageCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginTop: 20,
  },
  messageText: {
    fontSize: 15,
    fontFamily: "Rubik_400Regular",
    lineHeight: 24,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 20,
    gap: 14,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  contactInfo: {
    flex: 1,
    gap: 2,
  },
  contactName: {
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
  contactLink: {
    fontSize: 13,
    fontFamily: "Rubik_500Medium",
  },
  footer: {
    alignItems: "center",
    marginTop: 40,
  },
  copyright: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
