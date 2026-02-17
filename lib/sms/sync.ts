import type { ParsedBankSms } from "./parser";
import type { Transaction, BankAccount } from "@/lib/types";
import * as storage from "@/lib/storage";
import { generateId } from "@/lib/utils";
import { getBankById } from "@/constants/banks";

const SMS_CATEGORY_ID = "other";

export interface SyncResult {
  added: boolean;
  transactionId?: string;
  feeTransactionId?: string;
  skippedDuplicate?: boolean;
}

/**
 * Sync a parsed SMS into a transaction. Handles dedup, fee creation, and balance update.
 */
export async function syncTransactionFromSms(
  parsed: ParsedBankSms,
  bankAccountId: string | null,
): Promise<SyncResult> {
  // Fast dedup via processed SMS IDs
  const isDuplicate = await storage.isSmsDuplicate(parsed.smsId);
  if (isDuplicate) {
    return { added: false, skippedDuplicate: true };
  }

  const bank = getBankById(parsed.bankId);
  const bankName = bank?.name ?? parsed.bankId;

  // Create main transaction
  const mainTxn: Transaction = {
    id: generateId(),
    amount: parsed.amount,
    type: parsed.direction === "credit" ? "income" : "expense",
    categoryId: SMS_CATEGORY_ID,
    description: parsed.description ?? (parsed.direction === "credit" ? "SMS: Credit" : "SMS: Debit"),
    date: parsed.timestamp,
    paymentMethod: bankAccountId ?? "cash",
    bankAccountId: bankAccountId ?? undefined,
    createdAt: new Date().toISOString(),
    source: "bank_sms",
    metadata: {
      smsId: parsed.smsId,
      bankName,
      smsRawText: parsed.rawText,
      accountMask: parsed.accountMask,
      refNo: parsed.refNo,
    },
  };

  await storage.addTransaction(mainTxn);

  // Create fee transaction if fees exist
  let feeTransactionId: string | undefined;
  if (parsed.fees && parsed.fees > 0) {
    const feeTxn: Transaction = {
      id: generateId(),
      amount: parsed.fees,
      type: "expense",
      categoryId: "bills",
      description: `Service charge + VAT (${bankName})`,
      date: parsed.timestamp,
      paymentMethod: bankAccountId ?? "cash",
      bankAccountId: bankAccountId ?? undefined,
      createdAt: new Date().toISOString(),
      source: "bank_sms",
      metadata: {
        smsId: `${parsed.smsId}_fee`,
        bankName,
        isFee: true,
        refNo: parsed.refNo,
      },
    };
    await storage.addTransaction(feeTxn);
    feeTransactionId = feeTxn.id;
  }

  // Update bank account balance if we have a newBalance
  if (bankAccountId && parsed.newBalance !== undefined) {
    const accounts = await storage.getBankAccounts();
    const account = accounts.find((a) => a.id === bankAccountId);
    if (account) {
      await storage.updateBankAccount({
        ...account,
        balance: parsed.newBalance,
        lastUpdated: new Date().toISOString(),
        lastSmsSyncAt: new Date().toISOString(),
      });
    }
  }

  // Mark SMS as processed
  await storage.addProcessedSmsId(parsed.smsId);
  if (parsed.fees && parsed.fees > 0) {
    await storage.addProcessedSmsId(`${parsed.smsId}_fee`);
  }

  return {
    added: true,
    transactionId: mainTxn.id,
    feeTransactionId,
  };
}

/**
 * Find a bank account for a parsed SMS based on bankId.
 * If multiple accounts exist for the same bank, returns the first match.
 */
export function findBankAccountForParsed(
  bankAccounts: BankAccount[],
  bankId: string,
): string | null {
  const match = bankAccounts.find((a) => a.bankId === bankId);
  return match ? match.id : null;
}

/**
 * Batch sync multiple parsed SMS messages.
 */
export async function syncBatchFromSms(
  parsedMessages: ParsedBankSms[],
  bankAccountId: string | null,
): Promise<{ imported: number; skipped: number; newBalance?: number }> {
  let imported = 0;
  let skipped = 0;
  let latestBalance: number | undefined;

  for (const parsed of parsedMessages) {
    const result = await syncTransactionFromSms(parsed, bankAccountId);
    if (result.added) {
      imported++;
      if (parsed.newBalance !== undefined) {
        latestBalance = parsed.newBalance;
      }
    } else {
      skipped++;
    }
  }

  return { imported, skipped, newBalance: latestBalance };
}
