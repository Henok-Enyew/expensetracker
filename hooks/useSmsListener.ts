import { useEffect, useRef, useCallback } from "react";
import { Platform, AppState } from "react-native";
import { startSmsListener, stopSmsListener, setSmsImportedCallback } from "@/lib/sms";
import { useApp } from "@/contexts/AppContext";
import * as storage from "@/lib/storage";

/**
 * Global hook that starts the SMS listener when any bank has sync enabled.
 * Should be mounted once near the root of the app.
 */
export function useSmsListener() {
  const { refreshData, bankAccounts } = useApp();
  const listenerStarted = useRef(false);

  const hasSyncEnabled = bankAccounts.some((a) => a.smsSyncEnabled);

  const startListener = useCallback(async () => {
    if (Platform.OS !== "android") return;
    if (listenerStarted.current) return;

    // Check if any bank has sync enabled (from storage, not just state,
    // to handle first-load race conditions)
    let shouldStart = hasSyncEnabled;
    if (!shouldStart) {
      const accounts = await storage.getBankAccounts();
      shouldStart = accounts.some((a) => a.smsSyncEnabled);
    }

    if (!shouldStart) return;

    const result = await startSmsListener();
    if (result.started) {
      listenerStarted.current = true;
    }
  }, [hasSyncEnabled]);

  // Set the import callback so the listener triggers refreshData
  useEffect(() => {
    setSmsImportedCallback(refreshData);
    return () => setSmsImportedCallback(null);
  }, [refreshData]);

  // Start listener on mount and when sync is enabled
  useEffect(() => {
    if (hasSyncEnabled) {
      startListener();
    }
  }, [hasSyncEnabled, startListener]);

  // Restart listener when app comes to foreground (in case it was killed)
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && hasSyncEnabled) {
        startListener();
      }
    });
    return () => sub.remove();
  }, [hasSyncEnabled, startListener]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (listenerStarted.current) {
        stopSmsListener();
        listenerStarted.current = false;
      }
    };
  }, []);

  return { listenerStarted: listenerStarted.current };
}
