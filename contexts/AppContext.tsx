import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { Transaction, BankAccount, Budget } from "@/lib/types";
import { Category } from "@/constants/categories";
import * as storage from "@/lib/storage";

interface AppContextValue {
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  budgets: Budget[];
  categories: Category[];
  cashBalance: number;
  isLoading: boolean;
  totalBalance: number;

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

  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cashBalance, setCashBalanceState] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [txns, accounts, bds, cats, cash] = await Promise.all([
        storage.getTransactions(),
        storage.getBankAccounts(),
        storage.getBudgets(),
        storage.getCategories(),
        storage.getCashBalance(),
      ]);
      setTransactions(txns);
      setBankAccounts(accounts);
      setBudgets(bds);
      setCategories(cats);
      setCashBalanceState(cash);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

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

  const totalBalance = useMemo(() => {
    const bankTotal = bankAccounts.reduce((sum, a) => sum + a.balance, 0);
    return bankTotal + cashBalance;
  }, [bankAccounts, cashBalance]);

  const value = useMemo(
    () => ({
      transactions,
      bankAccounts,
      budgets,
      categories,
      cashBalance,
      isLoading,
      totalBalance,
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
      refreshData: loadAll,
    }),
    [transactions, bankAccounts, budgets, categories, cashBalance, isLoading, totalBalance, addTxn, updateTxn, deleteTxn, addAccount, updateAccount, deleteAccount, saveBdgs, addCat, deleteCat, setCash, loadAll],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
