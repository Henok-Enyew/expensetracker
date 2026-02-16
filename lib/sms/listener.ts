import { Platform } from "react-native";
import { parseSmsFromSender, syncTransactionFromSms, findBankAccountForParsed } from "./index";
import * as storage from "@/lib/storage";

let onImported: (() => void) | null = null;

export function setSmsImportedCallback(cb: (() => void) | null) {
  onImported = cb;
}

function parseSmsPayload(sms: unknown): { address: string; body: string } | null {
  if (Array.isArray(sms) && sms.length >= 2) {
    return { address: String(sms[0]), body: String(sms[1]) };
  }
  if (typeof sms === "string") {
    const match = /^\s*\[\s*["']?([^"'\]]+)["']?\s*,\s*["']?([\s\S]*)["']?\s*\]\s*$/.exec(sms);
    if (match) return { address: match[1].trim(), body: match[2].trim() };
  }
  return null;
}

export async function startSmsListener(): Promise<{ started: boolean; error?: string }> {
  if (Platform.OS !== "android") {
    return { started: false, error: "SMS import is only available on Android." };
  }
  try {
    const { startReadSMS, checkIfHasSMSPermission } = await import(
      "@maniac-tech/react-native-expo-read-sms"
    );
    const perm = await checkIfHasSMSPermission();
    if (!perm?.hasReadSmsPermission || !perm?.hasReceiveSmsPermission) {
      return { started: false, error: "SMS permission required." };
    }
    startReadSMS(async (status: string, sms: unknown) => {
      if (status !== "success") return;
      const parsed = parseSmsPayload(sms);
      if (!parsed) return;
      const { address, body } = parsed;
      const parsedTxn = parseSmsFromSender(address, body);
      if (!parsedTxn) return;
      const accounts = await storage.getBankAccounts();
      const bankAccountId = findBankAccountForParsed(accounts, parsedTxn.bankId);
      await syncTransactionFromSms(parsedTxn, bankAccountId);
      onImported?.();
    });
    return { started: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { started: false, error: message };
  }
}

export function stopSmsListener(): void {
  if (Platform.OS === "android") {
    try {
      const { stopReadSMS } = require("@maniac-tech/react-native-expo-read-sms");
      stopReadSMS();
    } catch {
      // ignore
    }
  }
}
