export interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  categoryId: string;
  description: string;
  date: string;
  paymentMethod: "cash" | string;
  bankAccountId?: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  bankId: string;
  accountName: string;
  balance: number;
  lastUpdated: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  month: string;
}

export type Period = "daily" | "monthly" | "yearly";
