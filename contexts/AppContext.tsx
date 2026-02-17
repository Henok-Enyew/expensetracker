import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { Transaction, BankAccount, Budget, Friend, FriendTransaction } from "@/lib/types";
import { Category } from "@/constants/categories";
import * as storage from "@/lib/storage";

interface FriendsNetInfo {
  totalOwedToMe: number;
  totalIOwe: number;
  netWithFriends: number;
}

interface AppContextValue {
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  budgets: Budget[];
  categories: Category[];
  cashBalance: number;
  isLoading: boolean;
  totalBalance: number;

  friends: Friend[];
  friendTransactions: FriendTransaction[];
  friendsNet: FriendsNetInfo;
  overallNetBalance: number;

  addTransaction: (txn: Transaction) => Promise<void>;
  updateTransaction: (txn: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  addBankAccount: (account: BankAccount) => Promise<void>;
  updateBankAccount: (account: BankAccount) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<void>;

  saveBudgets: (budgets: Budget[]) => Promise<void>;
  addCustomCategory: (cat: Category) => Promise<void>;
  deleteCustomCategory: (id: string) => Promise<void>;
  setCashBalance: (balance: number) => Promise<void>;

  addFriend: (friend: Friend) => Promise<void>;
  updateFriend: (friend: Friend) => Promise<void>;
  deleteFriend: (id: string) => Promise<void>;
  addFriendTransaction: (txn: FriendTransaction) => Promise<void>;
  deleteFriendTransaction: (id: string) => Promise<void>;
  getNetForFriend: (friendId: string) => number;

  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cashBalance, setCashBalanceState] = useState(0);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendTransactions, setFriendTransactions] = useState<FriendTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [txns, accounts, bds, cats, cash, frs, fTxns] = await Promise.all([
        storage.getTransactions(),
        storage.getBankAccounts(),
        storage.getBudgets(),
        storage.getCategories(),
        storage.getCashBalance(),
        storage.getFriends(),
        storage.getFriendTransactions(),
      ]);
      setTransactions(txns);
      setBankAccounts(accounts);
      setBudgets(bds);
      setCategories(cats);
      setCashBalanceState(cash);
      setFriends(frs);
      setFriendTransactions(fTxns);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Transactions
  const addTxn = useCallback(async (txn: Transaction) => {
    await storage.addTransaction(txn);
    setTransactions((prev) => [txn, ...prev]);
  }, []);

  const updateTxn = useCallback(async (txn: Transaction) => {
    await storage.updateTransaction(txn);
    setTransactions((prev) => prev.map((t) => (t.id === txn.id ? txn : t)));
  }, []);

  const deleteTxn = useCallback(async (id: string) => {
    await storage.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Bank accounts
  const addAccount = useCallback(async (account: BankAccount) => {
    await storage.addBankAccount(account);
    setBankAccounts((prev) => [...prev, account]);
  }, []);

  const updateAccount = useCallback(async (account: BankAccount) => {
    await storage.updateBankAccount(account);
    setBankAccounts((prev) => prev.map((a) => (a.id === account.id ? account : a)));
  }, []);

  const deleteAccount = useCallback(async (id: string) => {
    await storage.deleteBankAccount(id);
    setBankAccounts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Budgets & categories
  const saveBdgs = useCallback(async (bdgs: Budget[]) => {
    await storage.saveBudgets(bdgs);
    setBudgets(bdgs);
  }, []);

  const addCat = useCallback(async (cat: Category) => {
    await storage.addCustomCategory(cat);
    setCategories((prev) => [...prev, cat]);
  }, []);

  const deleteCat = useCallback(async (id: string) => {
    await storage.deleteCustomCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const setCash = useCallback(async (balance: number) => {
    await storage.setCashBalance(balance);
    setCashBalanceState(balance);
  }, []);

  // Friends
  const addFr = useCallback(async (friend: Friend) => {
    await storage.addFriend(friend);
    setFriends((prev) => [...prev, friend]);
  }, []);

  const updateFr = useCallback(async (friend: Friend) => {
    await storage.updateFriend(friend);
    setFriends((prev) => prev.map((f) => (f.id === friend.id ? friend : f)));
  }, []);

  const deleteFr = useCallback(async (id: string) => {
    await storage.deleteFriend(id);
    setFriends((prev) => prev.filter((f) => f.id !== id));
    setFriendTransactions((prev) => prev.filter((t) => t.friendId !== id));
  }, []);

  const addFrTxn = useCallback(async (txn: FriendTransaction) => {
    await storage.addFriendTransaction(txn);
    setFriendTransactions((prev) => [txn, ...prev]);
  }, []);

  const deleteFrTxn = useCallback(async (id: string) => {
    await storage.deleteFriendTransaction(id);
    setFriendTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getNetForFriend = useCallback(
    (friendId: string): number => {
      return friendTransactions
        .filter((t) => t.friendId === friendId)
        .reduce((sum, t) => sum + (t.direction === "lent" ? t.amount : -t.amount), 0);
    },
    [friendTransactions],
  );

  // Computed balances
  const totalBalance = useMemo(() => {
    const bankTotal = bankAccounts.reduce((sum, a) => sum + a.balance, 0);
    return bankTotal + cashBalance;
  }, [bankAccounts, cashBalance]);

  const friendsNet = useMemo((): FriendsNetInfo => {
    const netPerFriend = new Map<string, number>();
    for (const t of friendTransactions) {
      const prev = netPerFriend.get(t.friendId) ?? 0;
      netPerFriend.set(t.friendId, prev + (t.direction === "lent" ? t.amount : -t.amount));
    }
    let totalOwedToMe = 0;
    let totalIOwe = 0;
    for (const net of netPerFriend.values()) {
      if (net > 0) totalOwedToMe += net;
      else totalIOwe += Math.abs(net);
    }
    return { totalOwedToMe, totalIOwe, netWithFriends: totalOwedToMe - totalIOwe };
  }, [friendTransactions]);

  const overallNetBalance = useMemo(() => {
    return totalBalance + friendsNet.netWithFriends;
  }, [totalBalance, friendsNet]);

  const value = useMemo(
    () => ({
      transactions,
      bankAccounts,
      budgets,
      categories,
      cashBalance,
      isLoading,
      totalBalance,
      friends,
      friendTransactions,
      friendsNet,
      overallNetBalance,
      addTransaction: addTxn,
      updateTransaction: updateTxn,
      deleteTransaction: deleteTxn,
      addBankAccount: addAccount,
      updateBankAccount: updateAccount,
      deleteBankAccount: deleteAccount,
      saveBudgets: saveBdgs,
      addCustomCategory: addCat,
      deleteCustomCategory: deleteCat,
      setCashBalance: setCash,
      addFriend: addFr,
      updateFriend: updateFr,
      deleteFriend: deleteFr,
      addFriendTransaction: addFrTxn,
      deleteFriendTransaction: deleteFrTxn,
      getNetForFriend,
      refreshData: loadAll,
    }),
    [transactions, bankAccounts, budgets, categories, cashBalance, isLoading, totalBalance, friends, friendTransactions, friendsNet, overallNetBalance, addTxn, updateTxn, deleteTxn, addAccount, updateAccount, deleteAccount, saveBdgs, addCat, deleteCat, setCash, addFr, updateFr, deleteFr, addFrTxn, deleteFrTxn, getNetForFriend, loadAll],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
