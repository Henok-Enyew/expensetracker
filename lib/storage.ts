import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Transaction,
  BankAccount,
  Budget,
  Friend,
  FriendTransaction,
} from "./types";
import { Category, DEFAULT_CATEGORIES } from "@/constants/categories";

const KEYS = {
  TRANSACTIONS: "@birr_transactions",
  BANK_ACCOUNTS: "@birr_bank_accounts",
  BUDGETS: "@birr_budgets",
  CATEGORIES: "@birr_categories",
  CASH_BALANCE: "@birr_cash_balance",
  PROCESSED_SMS_IDS: "@birr_processed_sms_ids",
  FRIENDS: "@birr_friends",
  FRIEND_TRANSACTIONS: "@birr_friend_transactions",
  THEME_MODE: "@birr_theme_mode",
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
  const raw = await getItem<any[]>(KEYS.BUDGETS, []);
  let needsSave = false;
  const migrated: Budget[] = raw.map((b) => {
    if (b.month && !b.period) {
      needsSave = true;
      const { month, ...rest } = b;
      return {
        ...rest,
        period: "monthly" as const,
        createdAt: b.createdAt || new Date().toISOString(),
      };
    }
    if (!b.createdAt) {
      needsSave = true;
      return { ...b, createdAt: new Date().toISOString() };
    }
    return b as Budget;
  });
  if (needsSave) {
    await setItem(KEYS.BUDGETS, migrated);
  }
  return migrated;
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

// --- Friends ---

export async function getFriends(): Promise<Friend[]> {
  return getItem<Friend[]>(KEYS.FRIENDS, []);
}

export async function saveFriends(friends: Friend[]): Promise<void> {
  await setItem(KEYS.FRIENDS, friends);
}

export async function addFriend(friend: Friend): Promise<void> {
  const friends = await getFriends();
  friends.push(friend);
  await saveFriends(friends);
}

export async function updateFriend(friend: Friend): Promise<void> {
  const friends = await getFriends();
  const idx = friends.findIndex((f) => f.id === friend.id);
  if (idx !== -1) {
    friends[idx] = friend;
    await saveFriends(friends);
  }
}

export async function deleteFriend(id: string): Promise<void> {
  const friends = await getFriends();
  await saveFriends(friends.filter((f) => f.id !== id));
  const txns = await getFriendTransactions();
  await saveFriendTransactions(txns.filter((t) => t.friendId !== id));
}

// --- Friend Transactions ---

export async function getFriendTransactions(): Promise<FriendTransaction[]> {
  return getItem<FriendTransaction[]>(KEYS.FRIEND_TRANSACTIONS, []);
}

export async function saveFriendTransactions(
  txns: FriendTransaction[],
): Promise<void> {
  await setItem(KEYS.FRIEND_TRANSACTIONS, txns);
}

export async function addFriendTransaction(
  txn: FriendTransaction,
): Promise<void> {
  const txns = await getFriendTransactions();
  txns.unshift(txn);
  await saveFriendTransactions(txns);
}

export async function deleteFriendTransaction(id: string): Promise<void> {
  const txns = await getFriendTransactions();
  await saveFriendTransactions(txns.filter((t) => t.id !== id));
}

// --- Theme ---

export type ThemeMode = "system" | "light" | "dark";

export async function getThemeMode(): Promise<ThemeMode> {
  return getItem<ThemeMode>(KEYS.THEME_MODE, "system");
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  await setItem(KEYS.THEME_MODE, mode);
}

// --- Export ---

export async function exportTransactionsCSV(
  txns: Transaction[],
  categories: Category[],
): Promise<string> {
  const header = "Date,Type,Amount (ETB),Category,Description,Payment Method\n";
  const rows = txns.map((t) => {
    const cat = categories.find((c) => c.id === t.categoryId);
    return `${t.date},${t.type},${t.amount},${cat?.name || "Other"},${t.description.replace(/,/g, ";")},${t.paymentMethod}`;
  });
  return header + rows.join("\n");
}
