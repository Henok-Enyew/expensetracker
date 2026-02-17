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
import { useColors } from "@/contexts/ThemeContext";
import { generateId } from "@/lib/utils";
import Colors from "@/constants/colors";

export default function AddFriendScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { addFriend } = useApp();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const friendId = generateId();
      await addFriend({
        id: friendId,
        name: name.trim(),
        phone: phone.trim() || undefined,
        note: note.trim() || undefined,
        createdAt: new Date().toISOString(),
      });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: "/friend-detail", params: { id: friendId } });
    } catch {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.title, { color: c.text }]}>Add Friend</Text>
        <Pressable
          onPress={handleSave}
          disabled={!name.trim() || saving}
          style={({ pressed }) => [{ opacity: name.trim() && !saving ? (pressed ? 0.7 : 1) : 0.4 }]}
        >
          <Ionicons name="checkmark" size={24} color={c.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Avatar Preview */}
        <View style={styles.avatarPreview}>
          <View style={[styles.avatar, { backgroundColor: c.primary + "15" }]}>
            <Text style={[styles.avatarText, { color: c.primary }]}>
              {name.trim() ? name.charAt(0).toUpperCase() : "?"}
            </Text>
          </View>
        </View>

        <Text style={[styles.label, { color: c.text }]}>Name *</Text>
        <TextInput
          style={[styles.input, { color: c.text, backgroundColor: c.surfaceSecondary }]}
          placeholder="Friend's name"
          placeholderTextColor={c.textTertiary}
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <Text style={[styles.label, { color: c.text }]}>Phone (optional)</Text>
        <TextInput
          style={[styles.input, { color: c.text, backgroundColor: c.surfaceSecondary }]}
          placeholder="+251 9XX XXX XXXX"
          placeholderTextColor={c.textTertiary}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <Text style={[styles.label, { color: c.text }]}>Note (optional)</Text>
        <TextInput
          style={[styles.input, styles.noteInput, { color: c.text, backgroundColor: c.surfaceSecondary }]}
          placeholder="e.g. Roommate, Colleague"
          placeholderTextColor={c.textTertiary}
          value={note}
          onChangeText={setNote}
          multiline
        />

        <Pressable style={[styles.saveBtn, { backgroundColor: c.primary }]} onPress={handleSave} disabled={!name.trim() || saving}>
          <Text style={[styles.saveBtnText, { color: c.textInverse }]}>{saving ? "Saving..." : "Add Friend"}</Text>
        </Pressable>
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
  avatarPreview: {
    alignItems: "center",
    paddingVertical: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
  },
  noteInput: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textInverse,
  },
});
