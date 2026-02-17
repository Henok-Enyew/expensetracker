import { Platform } from "react-native";
import {
  startSmsListening,
  stopSmsListening,
  addSmsReceivedListener,
} from "@/modules/sms-inbox";
import type { IncomingSms } from "@/modules/sms-inbox";
import { parseSmsAutoDetect, parseBankSms, generateSmsIdSync } from "./parser";
import { syncTransactionFromSms, findBankAccountForParsed } from "./sync";
import * as storage from "@/lib/storage";
import { getBankIdBySender } from "@/constants/smsBankShortcodes";

let onImported: (() => void) | null = null;
let listenerRunning = false;
let subscription: { remove: () => void } | null = null;

export function setSmsImportedCallback(cb: (() => void) | null) {
  onImported = cb;
}

async function handleIncomingSms(sms: IncomingSms) {
  try {
    const { address, body } = sms;
    if (!address || !body) return;

    const accounts = await storage.getBankAccounts();
    const syncEnabledAccounts = accounts.filter((a) => a.smsSyncEnabled);
    if (syncEnabledAccounts.length === 0) return;

    const smsId = generateSmsIdSync(body, Date.now());
    const smsObj = { sender: address, body, date: Date.now(), id: smsId };

    // Strategy 1: Try sender-based detection
    const senderBankId = getBankIdBySender(address);
    if (senderBankId) {
      const matchingAccount = syncEnabledAccounts.find(
        (a) => a.bankId === senderBankId,
      );
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

    const bankAccountId = findBankAccountForParsed(
      syncEnabledAccounts,
      parsed.bankId,
    );
    if (!bankAccountId) return;

    await syncTransactionFromSms(parsed, bankAccountId);
    onImported?.();
  } catch (e) {
    console.error("[SMS Listener] Processing error:", e);
  }
}

export async function startSmsListener(): Promise<{
  started: boolean;
  error?: string;
}> {
  if (Platform.OS !== "android") {
    return { started: false, error: "SMS import is only available on Android." };
  }

  if (listenerRunning) {
    return { started: true };
  }

  try {
    const started = await startSmsListening();
    if (!started) {
      return { started: false, error: "Failed to start SMS listener." };
    }

    subscription = addSmsReceivedListener(handleIncomingSms);
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
      subscription?.remove();
      subscription = null;
      stopSmsListening();
      listenerRunning = false;
    } catch {
      // ignore
    }
  }
}
