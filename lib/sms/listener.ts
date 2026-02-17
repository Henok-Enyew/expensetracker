import { Platform } from "react-native";
import { parseSmsAutoDetect, parseBankSms, generateSmsIdSync } from "./parser";
import { syncTransactionFromSms, findBankAccountForParsed } from "./sync";
import * as storage from "@/lib/storage";
import { getBankIdBySender, isPotentialBankSender } from "@/constants/smsBankShortcodes";

let onImported: (() => void) | null = null;
let listenerRunning = false;

export function setSmsImportedCallback(cb: (() => void) | null) {
  onImported = cb;
}

function parseSmsPayload(sms: unknown): { address: string; body: string } | null {
  // Handle array format: [address, body]
  if (Array.isArray(sms) && sms.length >= 2) {
    return { address: String(sms[0]), body: String(sms[1]) };
  }
  // Handle object format: { originatingAddress, body }
  if (sms && typeof sms === "object") {
    const obj = sms as Record<string, unknown>;
    if (obj.originatingAddress && obj.body) {
      return { address: String(obj.originatingAddress), body: String(obj.body) };
    }
    if (obj.address && obj.body) {
      return { address: String(obj.address), body: String(obj.body) };
    }
  }
  // Handle string format
  if (typeof sms === "string") {
    // Try JSON parse first
    try {
      const parsed = JSON.parse(sms);
      if (Array.isArray(parsed) && parsed.length >= 2) {
        return { address: String(parsed[0]), body: String(parsed[1]) };
      }
    } catch {
      // not JSON
    }
    const match = /^\s*\[\s*["']?([^"'\]]+)["']?\s*,\s*["']?([\s\S]*)["']?\s*\]\s*$/.exec(sms);
    if (match) return { address: match[1].trim(), body: match[2].trim() };
    // If it's just a raw SMS body with no address
    if (sms.length > 20) {
      return { address: "unknown", body: sms.trim() };
    }
  }
  return null;
}

export async function startSmsListener(): Promise<{ started: boolean; error?: string }> {
  if (Platform.OS !== "android") {
    return { started: false, error: "SMS import is only available on Android." };
  }

  // Don't start multiple listeners
  if (listenerRunning) {
    return { started: true };
  }

  try {
    const { startReadSMS, checkIfHasSMSPermission } = await import(
      "@maniac-tech/react-native-expo-read-sms"
    );
    const perm = await checkIfHasSMSPermission();
    if (!perm?.hasReadSmsPermission || !perm?.hasReceiveSmsPermission) {
      return { started: false, error: "SMS permission required." };
    }

    startReadSMS(async (status: string, sms: unknown, error: unknown) => {
      if (status !== "success") {
        console.warn("[SMS Listener] Error:", error);
        return;
      }

      try {
        const payload = parseSmsPayload(sms);
        if (!payload) {
          console.warn("[SMS Listener] Could not parse SMS payload:", typeof sms);
          return;
        }

        const { address, body } = payload;

        // Load bank accounts to check which banks have sync enabled
        const accounts = await storage.getBankAccounts();
        const syncEnabledAccounts = accounts.filter((a) => a.smsSyncEnabled);

        if (syncEnabledAccounts.length === 0) return;

        const smsId = generateSmsIdSync(body, Date.now());
        const smsObj = { sender: address, body, date: Date.now(), id: smsId };

        // Strategy 1: Try sender-based detection
        const senderBankId = getBankIdBySender(address);
        if (senderBankId) {
          const matchingAccount = syncEnabledAccounts.find((a) => a.bankId === senderBankId);
          if (matchingAccount) {
            const parsed = parseBankSms(senderBankId, smsObj);
            if (parsed) {
              await syncTransactionFromSms(parsed, matchingAccount.id);
              onImported?.();
              return;
            }
          }
        }

        // Strategy 2: Try auto-detect from body
        const parsed = parseSmsAutoDetect(smsObj);
        if (!parsed) return;

        // Find matching account with sync enabled
        const bankAccountId = findBankAccountForParsed(syncEnabledAccounts, parsed.bankId);
        if (!bankAccountId) return;

        await syncTransactionFromSms(parsed, bankAccountId);
        onImported?.();
      } catch (e) {
        console.error("[SMS Listener] Processing error:", e);
      }
    });

    listenerRunning = true;
    return { started: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { started: false, error: message };
  }
}

export function stopSmsListener(): void {
  if (Platform.OS === "android" && listenerRunning) {
    try {
      const { stopReadSMS } = require("@maniac-tech/react-native-expo-read-sms");
      stopReadSMS();
      listenerRunning = false;
    } catch {
      // ignore
    }
  }
}
