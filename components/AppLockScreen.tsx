import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSecurity } from "@/contexts/SecurityContext";
import { useColors } from "@/contexts/ThemeContext";
import Colors from "@/constants/colors";

const PIN_LENGTH = 6;

export function AppLockScreen() {
  const c = useColors();
  const { unlockWithBiometric, unlockWithPin, hasBiometric, hasPin } = useSecurity();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [tryingBiometric, setTryingBiometric] = useState(false);

  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      unlockWithPin(pin).then((ok) => {
        if (ok) setPin("");
        else {
          setError("Wrong PIN");
          setPin("");
        }
      });
    } else {
      setError("");
    }
  }, [pin, unlockWithPin]);

  useEffect(() => {
    if (!hasBiometric || tryingBiometric) return;
    setTryingBiometric(true);
    unlockWithBiometric()
      .then(() => {})
      .catch(() => {})
      .finally(() => setTryingBiometric(false));
  }, [hasBiometric]);

  const handleUnlockWithBiometric = async () => {
    setError("");
    const ok = await unlockWithBiometric();
    if (!ok) setError("Authentication failed");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: c.primary + "18" }]}>
          <Ionicons name="lock-closed" size={48} color={c.primary} />
        </View>
        <Text style={[styles.title, { color: c.text }]}>Birr Track is locked</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>Unlock to continue</Text>

        {hasPin && (
          <>
            <TextInput
              style={[styles.pinInput, { borderColor: c.border, color: c.text }]}
              value={pin}
              onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, PIN_LENGTH))}
              placeholder="Enter PIN"
              placeholderTextColor={c.textTertiary}
              keyboardType="number-pad"
              maxLength={PIN_LENGTH}
              secureTextEntry
              autoFocus={!hasBiometric}
            />
            {error ? <Text style={[styles.error, { color: c.expense }]}>{error}</Text> : null}
          </>
        )}

        {hasBiometric && !tryingBiometric && (
          <Pressable
            style={({ pressed }) => [styles.biometricBtn, { backgroundColor: c.primary }, pressed && { opacity: 0.8 }]}
            onPress={handleUnlockWithBiometric}
          >
            <Ionicons name="finger-print" size={28} color={c.textInverse} />
            <Text style={[styles.biometricBtnText, { color: c.textInverse }]}>Unlock with biometrics</Text>
          </Pressable>
        )}

        {tryingBiometric && (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color={c.primary} />
            <Text style={[styles.loadingText, { color: c.textSecondary }]}>Checking biometrics…</Text>
          </View>
        )}

        {!hasPin && !hasBiometric && (
          <Text style={[styles.hint, { color: c.textTertiary }]}>Set up app lock and PIN in Settings.</Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    width: "100%",
    maxWidth: 320,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  pinInput: {
    width: "100%",
    height: 52,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 8,
  },
  error: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.expense,
    marginBottom: 16,
  },
  biometricBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 8,
  },
  biometricBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textInverse,
  },
  loading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  hint: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 16,
  },
});
