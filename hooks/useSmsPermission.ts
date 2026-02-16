import { useState, useCallback, useEffect } from "react";
import { Platform, Linking, AppState } from "react-native";

const isAndroid = Platform.OS === "android";

async function checkSmsPermission(): Promise<boolean> {
  if (!isAndroid) return false;
  try {
    const { checkIfHasSMSPermission } = await import("@maniac-tech/react-native-expo-read-sms");
    const result = await checkIfHasSMSPermission();
    return !!(result?.hasReadSmsPermission && result?.hasReceiveSmsPermission);
  } catch {
    return false;
  }
}

async function requestSmsPermission(): Promise<boolean> {
  if (!isAndroid) return false;
  try {
    const { requestReadSMSPermission } = await import("@maniac-tech/react-native-expo-read-sms");
    const granted = await requestReadSMSPermission();
    return !!granted;
  } catch {
    return false;
  }
}

export function useSmsPermission() {
  const [hasPermission, setHasPermission] = useState(false);
  const [checking, setChecking] = useState(true);

  const check = useCallback(async () => {
    if (!isAndroid) {
      setHasPermission(false);
      setChecking(false);
      return false;
    }
    setChecking(true);
    try {
      const ok = await checkSmsPermission();
      setHasPermission(ok);
      return ok;
    } finally {
      setChecking(false);
    }
  }, []);

  const request = useCallback(async () => {
    if (!isAndroid) return false;
    const ok = await requestSmsPermission();
    setHasPermission(ok);
    return ok;
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => sub.remove();
  }, [check]);

  const openAppSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  return {
    hasPermission,
    checking,
    isAndroid,
    check,
    request,
    openAppSettings,
  };
}
