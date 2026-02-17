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

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  month: string;
}

export type Period = "daily" | "monthly" | "yearly";
