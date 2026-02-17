/**
 * SMS Service: orchestrates per-bank SMS operations.
 * Coordinates parsers, sync, and the native SMS listener.
 */

import { parseBankSms, parseSmsAutoDetect, generateSmsIdSync } from "./parser";
import type { ParsedBankSms } from "./parser";
import { syncTransactionFromSms, findBankAccountForParsed, syncBatchFromSms } from "./sync";
import * as storage from "@/lib/storage";
import type { BankAccount } from "@/lib/types";

export interface TestParseResult {
  success: boolean;
  parsed?: ParsedBankSms;
  error?: string;
}

/**
 * Test-parse an SMS body for a specific bank. Used by the "Test SMS Parser" UI.
 */
export function testParseSms(bankId: string, smsBody: string): TestParseResult {
  try {
    const sms = {
      sender: bankId,
      body: smsBody,
      date: Date.now(),
      id: generateSmsIdSync(smsBody, Date.now()),
    };
    const parsed = parseBankSms(bankId, sms);
    if (parsed) {
      return { success: true, parsed };
    }
    return { success: false, error: "Could not parse this SMS. Check the format." };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Parse error" };
  }
}

/**
 * Auto-detect and parse an SMS. Used when bank is unknown.
 */
export function autoDetectParseSms(smsBody: string): TestParseResult {
  try {
    const sms = {
      sender: "unknown",
      body: smsBody,
      date: Date.now(),
      id: generateSmsIdSync(smsBody, Date.now()),
    };
    const parsed = parseSmsAutoDetect(sms);
    if (parsed) {
      return { success: true, parsed };
    }
    return { success: false, error: "No parser matched this SMS." };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Parse error" };
  }
}

/**
 * Process a single incoming SMS for a specific bank account.
 * Called by the listener when a new SMS arrives.
 */
export async function processIncomingSms(
  bankId: string,
  sender: string,
  body: string,
  dateMs: number,
): Promise<{ imported: boolean; error?: string }> {
  try {
    const smsId = generateSmsIdSync(body, dateMs);
    const sms = { sender, body, date: dateMs, id: smsId };
    const parsed = parseBankSms(bankId, sms);

    if (!parsed) {
      return { imported: false, error: "SMS could not be parsed" };
    }

    const accounts = await storage.getBankAccounts();
    const bankAccountId = findBankAccountForParsed(accounts, bankId);

    if (!bankAccountId) {
      return { imported: false, error: `No bank account found for ${bankId}` };
    }

    const result = await syncTransactionFromSms(parsed, bankAccountId);
    return { imported: result.added };
  } catch (e) {
    return { imported: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/**
 * Get all bank accounts that have SMS sync enabled.
 */
export async function getSyncEnabledBanks(): Promise<BankAccount[]> {
  const accounts = await storage.getBankAccounts();
  return accounts.filter((a) => a.smsSyncEnabled);
}

/**
 * Toggle SMS sync for a bank account.
 */
export async function toggleBankSmsSync(
  accountId: string,
  enabled: boolean,
): Promise<void> {
  const accounts = await storage.getBankAccounts();
  const account = accounts.find((a) => a.id === accountId);
  if (account) {
    await storage.updateBankAccount({
      ...account,
      smsSyncEnabled: enabled,
      lastSmsSyncAt: enabled ? account.lastSmsSyncAt : undefined,
    });
  }
}
