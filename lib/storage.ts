import AsyncStorage from "@react-native-async-storage/async-storage";
import { Transaction, BankAccount, Budget } from "./types";
import { Category, DEFAULT_CATEGORIES } from "@/constants/categories";

const KEYS = {
  TRANSACTIONS: "@birr_transactions",
  BANK_ACCOUNTS: "@birr_bank_accounts",
  BUDGETS: "@birr_budgets",
  CATEGORIES: "@birr_categories",
  CASH_BALANCE: "@birr_cash_balance",
  PROCESSED_SMS_IDS: "@birr_processed_sms_ids",
};

async function getItem<T>(key: string, fallback: T): Promise<T> {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

async function setItem<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function getTransactions(): Promise<Transaction[]> {
  return getItem<Transaction[]>(KEYS.TRANSACTIONS, []);
}

export async function saveTransactions(txns: Transaction[]): Promise<void> {
  await setItem(KEYS.TRANSACTIONS, txns);
}

export async function addTransaction(txn: Transaction): Promise<void> {
  const txns = await getTransactions();
  txns.unshift(txn);
  await saveTransactions(txns);
}

export async function updateTransaction(txn: Transaction): Promise<void> {
  const txns = await getTransactions();
  const idx = txns.findIndex((t) => t.id === txn.id);
  if (idx !== -1) {
    txns[idx] = txn;
    await saveTransactions(txns);
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  const txns = await getTransactions();
  await saveTransactions(txns.filter((t) => t.id !== id));
}

export async function getBankAccounts(): Promise<BankAccount[]> {
  return getItem<BankAccount[]>(KEYS.BANK_ACCOUNTS, []);
}

export async function saveBankAccounts(accounts: BankAccount[]): Promise<void> {
  await setItem(KEYS.BANK_ACCOUNTS, accounts);
}

export async function addBankAccount(account: BankAccount): Promise<void> {
  const accounts = await getBankAccounts();
  accounts.push(account);
  await saveBankAccounts(accounts);
}

export async function updateBankAccount(account: BankAccount): Promise<void> {
  const accounts = await getBankAccounts();
  const idx = accounts.findIndex((a) => a.id === account.id);
  if (idx !== -1) {
    accounts[idx] = account;
    await saveBankAccounts(accounts);
  }
}

export async function deleteBankAccount(id: string): Promise<void> {
  const accounts = await getBankAccounts();
  await saveBankAccounts(accounts.filter((a) => a.id !== id));
}

export async function getBudgets(): Promise<Budget[]> {
  return getItem<Budget[]>(KEYS.BUDGETS, []);
}

export async function saveBudgets(budgets: Budget[]): Promise<void> {
  await setItem(KEYS.BUDGETS, budgets);
}

export async function getCategories(): Promise<Category[]> {
  const custom = await getItem<Category[]>(KEYS.CATEGORIES, []);
  return [...DEFAULT_CATEGORIES, ...custom];
}

export async function addCustomCategory(cat: Category): Promise<void> {
  const custom = await getItem<Category[]>(KEYS.CATEGORIES, []);
  custom.push(cat);
  await setItem(KEYS.CATEGORIES, custom);
}

export async function deleteCustomCategory(id: string): Promise<void> {
  const custom = await getItem<Category[]>(KEYS.CATEGORIES, []);
  await setItem(
    KEYS.CATEGORIES,
    custom.filter((c) => c.id !== id),
  );
}

export async function getCashBalance(): Promise<number> {
  return getItem<number>(KEYS.CASH_BALANCE, 0);
}

export async function setCashBalance(balance: number): Promise<void> {
  await setItem(KEYS.CASH_BALANCE, balance);
}

export async function getProcessedSmsIds(): Promise<Set<string>> {
  const arr = await getItem<string[]>(KEYS.PROCESSED_SMS_IDS, []);
  return new Set(arr);
}

export async function addProcessedSmsId(smsId: string): Promise<void> {
  const arr = await getItem<string[]>(KEYS.PROCESSED_SMS_IDS, []);
  if (!arr.includes(smsId)) {
    arr.push(smsId);
    await setItem(KEYS.PROCESSED_SMS_IDS, arr);
  }
}

export async function addProcessedSmsIds(ids: string[]): Promise<void> {
  const arr = await getItem<string[]>(KEYS.PROCESSED_SMS_IDS, []);
  const existing = new Set(arr);
  let changed = false;
  for (const id of ids) {
    if (!existing.has(id)) {
      arr.push(id);
      existing.add(id);
      changed = true;
    }
  }
  if (changed) await setItem(KEYS.PROCESSED_SMS_IDS, arr);
}

export async function isSmsDuplicate(smsId: string): Promise<boolean> {
  const ids = await getProcessedSmsIds();
  return ids.has(smsId);
}

export async function exportTransactionsCSV(txns: Transaction[], categories: Category[]): Promise<string> {
  const header = "Date,Type,Amount (ETB),Category,Description,Payment Method\n";
  const rows = txns.map((t) => {
    const cat = categories.find((c) => c.id === t.categoryId);
    return `${t.date},${t.type},${t.amount},${cat?.name || "Other"},${t.description.replace(/,/g, ";")},${t.paymentMethod}`;
  });
  return header + rows.join("\n");
}
