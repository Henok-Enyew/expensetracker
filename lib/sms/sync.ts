import type { ParsedSms } from "./parser";
import type { Transaction, BankAccount } from "@/lib/types";
import * as storage from "@/lib/storage";
import { generateId } from "@/lib/utils";

const SMS_CATEGORY_ID = "other";

function dedupeKey(txn: Transaction): string {
  return `${txn.date}|${txn.amount}|${txn.bankAccountId ?? "cash"}`;
}

export async function syncTransactionFromSms(
  parsed: ParsedSms,
  bankAccountId: string | null,
): Promise<{ added: boolean }> {
  const existingTxns = await storage.getTransactions();
  const accounts = await storage.getBankAccounts();

  const newTxn: Transaction = {
    id: generateId(),
    amount: parsed.amount,
    type: parsed.type,
    categoryId: SMS_CATEGORY_ID,
    description: parsed.recipient
      ? `SMS: ${parsed.recipient}`
      : parsed.type === "income"
        ? "SMS: Credit"
        : "SMS: Debit",
    date: parsed.date,
    paymentMethod: bankAccountId ?? "cash",
    bankAccountId: bankAccountId ?? undefined,
    createdAt: new Date().toISOString(),
  };

  const key = dedupeKey(newTxn);
  if (existingTxns.some((t) => dedupeKey(t) === key)) {
    return { added: false };
  }

  await storage.addTransaction(newTxn);

  if (bankAccountId) {
    const account = accounts.find((a) => a.id === bankAccountId);
    if (account) {
      await storage.updateBankAccount({
        ...account,
        balance: parsed.balance,
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  return { added: true };
}

export function findBankAccountForParsed(
  bankAccounts: BankAccount[],
  bankId: string,
): string | null {
  const match = bankAccounts.find((a) => a.bankId === bankId);
  return match ? match.id : null;
}
