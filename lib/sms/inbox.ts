/**
 * SMS Inbox Scanner
 *
 * Reads SMS from the device inbox, filters for bank-related messages,
 * parses them, creates transactions, and updates bank balances.
 */

import { Platform } from "react-native";
import { readSmsInbox } from "@/modules/sms-inbox";
import type { SmsMessage } from "@/modules/sms-inbox";
import { parseBankSms, parseSmsAutoDetect, generateSmsIdSync, hashCode } from "./parser";
import type { ParsedBankSms } from "./parser";
import { syncTransactionFromSms } from "./sync";
import * as storage from "@/lib/storage";
import { BANK_SMS_SENDERS, SHARED_SHORTCODES } from "@/constants/smsBankShortcodes";

export interface InboxSyncResult {
  imported: number;
  skipped: number;
  failed: number;
  totalRead: number;
  totalBankSms: number;
  lastBalance?: number;
}

export interface InboxSyncProgress {
  phase: "reading" | "parsing" | "done";
  current?: number;
  total?: number;
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Check if an SMS sender address could belong to a specific bank.
 */
function isSenderForBank(address: string, bankId: string): boolean {
  const normalized = address.trim().toUpperCase();
  const senders = BANK_SMS_SENDERS[bankId] || [];
  return senders.some((s) => normalized.includes(s.toUpperCase()));
}

/**
 * Check if a sender is a shared shortcode (could be from any bank).
 */
function isSharedShortcode(address: string): boolean {
  const normalized = address.trim();
  return SHARED_SHORTCODES.some((sc) => normalized === sc);
}

/**
 * Read SMS from the device inbox, parse them for a specific bank,
 * create transactions, and update the bank balance.
 *
 * @param bankId         The bank identifier (e.g. "cbe", "telebirr")
 * @param bankAccountId  The user's bank account record ID
 * @param sinceDate      ISO date string — only process SMS after this date
 * @param onProgress     Optional callback for progress updates
 */
export async function readAndSyncBankSms(
  bankId: string,
  bankAccountId: string,
  sinceDate?: string,
  onProgress?: (progress: InboxSyncProgress) => void,
): Promise<InboxSyncResult> {
  if (Platform.OS !== "android") {
    throw new Error("SMS reading is only available on Android");
  }

  onProgress?.({ phase: "reading" });

  const since = sinceDate
    ? new Date(sinceDate).getTime()
    : Date.now() - NINETY_DAYS_MS;

  // Step 1: Read SMS from device inbox
  const rawMessages = await readSmsInbox(1500, since);

  if (rawMessages.length === 0) {
    onProgress?.({ phase: "done" });
    return { imported: 0, skipped: 0, failed: 0, totalRead: 0, totalBankSms: 0 };
  }

  // Sort by date ascending (oldest first) so the most recent SMS is processed
  // last — its newBalance becomes the final bank balance.
  const allMessages = [...rawMessages].sort((a, b) => a.date - b.date);

  // Step 2: Build a set of body hashes from existing SMS-imported transactions
  //         This provides cross-method dedup (catches duplicates even if
  //         the smsId differs between listener and inbox scan)
  const existingTxns = await storage.getTransactions();
  const existingBodyHashes = new Set<number>();
  for (const txn of existingTxns) {
    if (txn.source === "bank_sms" && txn.metadata?.smsRawText) {
      existingBodyHashes.add(
        hashCode(txn.metadata.smsRawText.replace(/\s+/g, " ").trim()),
      );
    }
  }

  onProgress?.({ phase: "parsing", current: 0, total: allMessages.length });

  // Step 3: Filter & parse SMS
  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let bankSmsCount = 0;
  let lastBalance: number | undefined;

  for (let i = 0; i < allMessages.length; i++) {
    const msg = allMessages[i];

    // Quick sender filter: skip SMS clearly not from this bank
    const fromThisBank = isSenderForBank(msg.address, bankId);
    const fromSharedCode = isSharedShortcode(msg.address);
    if (!fromThisBank && !fromSharedCode) continue;

    // Body-based dedup: skip if we already imported this exact SMS body
    const bodyHash = hashCode(msg.body.replace(/\s+/g, " ").trim());
    if (existingBodyHashes.has(bodyHash)) {
      skipped++;
      continue;
    }

    const smsId = generateSmsIdSync(msg.body, msg.date);
    const smsObj = { sender: msg.address, body: msg.body, date: msg.date, id: smsId };

    let parsed: ParsedBankSms | null = null;

    if (fromThisBank) {
      // Sender matches this bank → use bank-specific parser
      parsed = parseBankSms(bankId, smsObj);
    } else {
      // Shared shortcode → auto-detect bank from body
      const auto = parseSmsAutoDetect(smsObj);
      if (auto && auto.bankId === bankId) {
        parsed = auto;
      }
    }

    if (!parsed) {
      continue;
    }

    bankSmsCount++;

    // ID-based dedup (in case body-hash somehow misses it)
    const idDuplicate = await storage.isSmsDuplicate(parsed.smsId);
    if (idDuplicate) {
      skipped++;
      continue;
    }

    // Skip per-SMS balance updates; we set the balance once at the end
    // from the most recent SMS (messages are sorted oldest→newest)
    const result = await syncTransactionFromSms(parsed, bankAccountId, { skipBalanceUpdate: true });
    if (result.added) {
      imported++;
      existingBodyHashes.add(bodyHash);
    } else if (result.skippedDuplicate) {
      skipped++;
    } else {
      failed++;
    }

    // Always track the latest balance — since sorted oldest→newest,
    // the last one with a newBalance is from the most recent SMS
    if (parsed.newBalance !== undefined) {
      lastBalance = parsed.newBalance;
    }

    // Throttle progress updates
    if (i % 50 === 0) {
      onProgress?.({ phase: "parsing", current: i, total: allMessages.length });
    }
  }

  // Step 4: Update bank balance from the most recent SMS and record sync time.
  // Since messages are sorted oldest→newest, lastBalance is from the most recent
  // SMS that had a newBalance — this is the bank's actual current balance.
  const accounts = await storage.getBankAccounts();
  const account = accounts.find((a) => a.id === bankAccountId);
  if (account) {
    const updates: Record<string, any> = {
      ...account,
      lastSmsSyncAt: new Date().toISOString(),
    };
    if (lastBalance !== undefined) {
      updates.balance = lastBalance;
    }
    await storage.updateBankAccount(updates as typeof account);
  }

  onProgress?.({ phase: "done" });

  return {
    imported,
    skipped,
    failed,
    totalRead: allMessages.length,
    totalBankSms: bankSmsCount,
    lastBalance,
  };
}
