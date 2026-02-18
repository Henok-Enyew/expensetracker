import { useEffect, useRef, useCallback } from "react";
import { Platform, AppState, PermissionsAndroid } from "react-native";
import { startSmsListener, stopSmsListener, setSmsImportedCallback, readAndSyncBankSms } from "@/lib/sms";
import { useApp } from "@/contexts/AppContext";
import * as storage from "@/lib/storage";

/**
 * Global hook that starts the SMS listener when any bank has sync enabled,
 * and auto-syncs all enabled banks on app startup to catch SMS received
 * while the app was closed.
 */
export function useSmsListener() {
  const { refreshData, bankAccounts, isLoading } = useApp();
  const listenerStarted = useRef(false);
  const autoSyncDone = useRef(false);

  const hasSyncEnabled = bankAccounts.some((a) => a.smsSyncEnabled);

  const startListener = useCallback(async () => {
    if (Platform.OS !== "android") return;
    if (listenerStarted.current) return;

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

  // Auto-sync: scan the inbox for each sync-enabled bank once on startup.
  // This catches any SMS that arrived while the app was closed.
  const runAutoSync = useCallback(async () => {
    if (Platform.OS !== "android") return;
    if (autoSyncDone.current) return;
    autoSyncDone.current = true;

    try {
      const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
      if (!granted) return;

      const accounts = await storage.getBankAccounts();
      const syncEnabled = accounts.filter((a) => a.smsSyncEnabled);
      if (syncEnabled.length === 0) return;

      let anyImported = false;
      for (const account of syncEnabled) {
        try {
          const result = await readAndSyncBankSms(
            account.bankId,
            account.id,
            account.lastSmsSyncAt,
          );
          if (result.imported > 0) anyImported = true;
        } catch (e) {
          console.warn(`[AutoSync] Failed for ${account.bankId}:`, e);
        }
      }

      if (anyImported) {
        await refreshData();
      }
    } catch (e) {
      console.warn("[AutoSync] Error:", e);
    }
  }, [refreshData]);

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

  // Run auto-sync once after initial data load completes
  useEffect(() => {
    if (!isLoading && hasSyncEnabled && !autoSyncDone.current) {
      runAutoSync();
    }
  }, [isLoading, hasSyncEnabled, runAutoSync]);

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
