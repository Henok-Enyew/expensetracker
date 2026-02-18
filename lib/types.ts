export type TransactionSource = "manual" | "bank_sms" | "loan";

export interface TransactionMetadata {
  smsId?: string;
  bankName?: string;
  smsRawText?: string;
  accountMask?: string;
  isFee?: boolean;
  refNo?: string;
}

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
  source?: TransactionSource;
  metadata?: TransactionMetadata;
}

export interface BankAccount {
  id: string;
  bankId: string;
  accountName: string;
  balance: number;
  lastUpdated: string;
  smsSyncEnabled?: boolean;
  lastSmsSyncAt?: string;
}

export type BudgetPeriod = "daily" | "weekly" | "monthly" | "yearly";

export interface Budget {
  id: string;
  categoryId: string | null;
  amount: number;
  period: BudgetPeriod;
  createdAt: string;
  /** @deprecated kept for migration from old format */
  month?: string;
}

export type Period = "daily" | "monthly" | "yearly";

// --- Loans & Debts ---

export type FriendId = string;

export interface Friend {
  id: FriendId;
  name: string;
  phone?: string;
  note?: string;
  photoUri?: string;
  createdAt: string;
}

export type LoanDirection = "lent" | "borrowed";

export interface FriendTransaction {
  id: string;
  friendId: FriendId;
  direction: LoanDirection;
  amount: number;
  reason?: string;
  date: string;
  createdAt: string;
}
