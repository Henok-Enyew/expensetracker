/**
 * Per-bank SMS parsers for Ethiopian banks.
 * Each parser extracts structured data from real SMS formats.
 */

import * as Crypto from "expo-crypto";

export interface ParsedBankSms {
  bankId: string;
  direction: "credit" | "debit";
  amount: number;
  fees?: number;
  timestamp: string;
  accountMask?: string;
  newBalance?: number;
  description?: string;
  smsId: string;
  rawText: string;
  refNo?: string;
}

export type BankSmsParser = (sms: {
  sender: string;
  body: string;
  date: number;
  id: string;
}) => ParsedBankSms | null;

function num(str: string): number {
  const cleaned = str.replace(/,/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function extractDate(text: string, fallbackMs: number): string {
  const iso = /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}:\d{2}:\d{2})/.exec(text);
  if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T${iso[4]}`).toISOString().split("T")[0];
  const ddmmyyyy = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{2}:\d{2}:\d{2})/.exec(text);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    if (!isNaN(dt.getTime())) return dt.toISOString().split("T")[0];
  }
  const ddmmyyyy2 = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(text);
  if (ddmmyyyy2) {
    const [, d, m, y] = ddmmyyyy2;
    const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    if (!isNaN(dt.getTime())) return dt.toISOString().split("T")[0];
  }
  return new Date(fallbackMs).toISOString().split("T")[0];
}

function extractBalance(text: string): number | undefined {
  const m = /(?:current\s+)?balance\s+(?:is\s+)?ETB\s*([\d,]+\.?\d*)/i.exec(text);
  if (m) return num(m[1]);
  const m2 = /available\s+balance:\s+ETB\s*([\d,]+\.?\d*)/i.exec(text);
  if (m2) return num(m2[1]);
  return undefined;
}

function extractAccountMask(text: string): string | undefined {
  const m = /account\s+(\d\*+\d+)/i.exec(text);
  if (m) return m[1];
  return undefined;
}

function extractRefNo(text: string): string | undefined {
  const m = /ref\s*no\s+([A-Z0-9]+)/i.exec(text);
  if (m) return m[1];
  const m2 = /transaction\s+number\s+(?:is\s+)?([A-Z0-9]+)/i.exec(text);
  if (m2) return m2[1];
  const m3 = /\?id=([A-Z0-9]+)/i.exec(text);
  if (m3) return m3[1];
  return undefined;
}

export function generateSmsId(body: string, date: number): string {
  const hash = Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${body}|${date}`);
  return `sms_${date}`;
}

export function generateSmsIdSync(body: string, date: number): string {
  const trimmed = body.replace(/\s+/g, " ").trim().slice(0, 100);
  return `sms_${date}_${trimmed.length}_${hashCode(trimmed)}`;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return Math.abs(hash);
}

// ---------------------------------------------------------------------------
// CBE Parser
// ---------------------------------------------------------------------------
// Pattern 1 (Credit):
//   "Dear Henok your Account 1*****7365 has been Credited with ETB 500.00
//    from Atsede Desalegn, on 16/02/2026 at 20:39:29 with Ref No FT26048VF0ST
//    Your Current Balance is ETB 1,149.83."
//
// Pattern 2 (Debit simple):
//   "Dear Henok your Account 1*****7365 has been debited with ETB440.00.
//    Service charge of ETB 10.00 and VAT(15%) of ETB1.50 with a total of ETB 451.50.
//    Your Current Balance is ETB 698.33."
//
// Pattern 3 (Transfer out):
//   "Dear Henok, You have transfered ETB 60.00 to Mrs Mastewal on 17/02/2026
//    at 13:14:50 from your account 1*****7365. Your account has been debited with
//    a S.charge of ETB 0.50 and 15% VAT of ETB0.08, with a total of ETB 60.58.
//    Your Current Balance is ETB 637.75."

export const parseCbeSms: BankSmsParser = (sms) => {
  const { body, date, id } = sms;
  // CBE SMS often don't include "CBE" in the body, so we rely on pattern matching
  // instead of keyword filtering. The caller already knows it's CBE by sender or bankId.

  const smsId = id || generateSmsIdSync(body, date);
  const accountMask = extractAccountMask(body);
  const newBalance = extractBalance(body);
  const refNo = extractRefNo(body);
  const timestamp = extractDate(body, date);

  // Pattern 1: Credit
  const creditMatch = /(?:has been|been)\s+credited\s+with\s+ETB\s*([\d,]+\.?\d*)\s+from\s+(.+?)(?:,\s*on|\.\s)/i.exec(body);
  if (creditMatch) {
    return {
      bankId: "cbe",
      direction: "credit",
      amount: num(creditMatch[1]),
      timestamp,
      accountMask,
      newBalance,
      description: `From ${creditMatch[2].trim()}`,
      smsId,
      rawText: body,
      refNo,
    };
  }

  // Pattern 3: Transfer out (check before generic debit)
  const transferMatch = /(?:you have|have)\s+transfer(?:r?ed)\s+ETB\s*([\d,]+\.?\d*)\s+to\s+(.+?)\s+on\s+/i.exec(body);
  if (transferMatch) {
    const feeMatch = /S\.?\s*charge\s+of\s+ETB\s*([\d,]+\.?\d*)/i.exec(body);
    const vatMatch = /VAT.*?ETB\s*([\d,]+\.?\d*)/i.exec(body);
    const fee = (feeMatch ? num(feeMatch[1]) : 0) + (vatMatch ? num(vatMatch[1]) : 0);
    return {
      bankId: "cbe",
      direction: "debit",
      amount: num(transferMatch[1]),
      fees: fee > 0 ? fee : undefined,
      timestamp,
      accountMask,
      newBalance,
      description: `To ${transferMatch[2].trim()}`,
      smsId,
      rawText: body,
      refNo,
    };
  }

  // Pattern 2: Debit (simple)
  const debitMatch = /(?:has been|been)\s+debited\s+with\s+ETB\s*([\d,]+\.?\d*)/i.exec(body);
  if (debitMatch) {
    const scMatch = /service\s+charge\s+of\s+ETB\s*([\d,]+\.?\d*)/i.exec(body);
    const vatMatch2 = /VAT.*?ETB\s*([\d,]+\.?\d*)/i.exec(body);
    const fee = (scMatch ? num(scMatch[1]) : 0) + (vatMatch2 ? num(vatMatch2[1]) : 0);
    return {
      bankId: "cbe",
      direction: "debit",
      amount: num(debitMatch[1]),
      fees: fee > 0 ? fee : undefined,
      timestamp,
      accountMask,
      newBalance,
      description: "Debit",
      smsId,
      rawText: body,
      refNo,
    };
  }

  // Fallback: generic credit
  const genericCredit = /credited.*?ETB\s*([\d,]+\.?\d*)/i.exec(body);
  if (genericCredit) {
    return {
      bankId: "cbe",
      direction: "credit",
      amount: num(genericCredit[1]),
      timestamp,
      accountMask,
      newBalance,
      description: "Credit",
      smsId,
      rawText: body,
      refNo,
    };
  }

  return null;
};

// ---------------------------------------------------------------------------
// Telebirr Parser
// ---------------------------------------------------------------------------
// Pattern 1 (Received):
//   "Dear henok, You have received ETB 440.00 by transaction number DBG3UDDXPJ
//    on 2026-02-16 21:43:33 from Commercial Bank of Ethiopia to your telebirr
//    Account 251904927815. Your current balance is ETB 440.63."
//
// Pattern 2 (Paid to merchant):
//   "Dear henok You have paid ETB 429.38 to Ethiopian Electric Utility with
//    Payment number 100000920955 on 16/02/2026 21:44:25. The service fee is
//    ETB 2.00 and 15% VAT on the service fee is ETB 0.30.
//    Your current telebirr balance is ETB 8.95."
//
// Pattern 3 (Package purchase):
//   "Dear henok You have paid ETB 1.00 for package Telegram One hour Package
//    for 150 MB purchase made for 904927815 on 17/02/2026 08:00:11.
//    Your transaction number is DBH5ULEMDP.
//    Your current balance is ETB 7.95."

export const parseTelebirrSms: BankSmsParser = (sms) => {
  const { body, date, id } = sms;
  const lower = body.toLowerCase();
  if (!lower.includes("telebirr") && !lower.includes("ethio telecom")) return null;

  const smsId = id || generateSmsIdSync(body, date);
  const timestamp = extractDate(body, date);
  const refNo = extractRefNo(body);

  // Balance: "current balance is ETB X" or "current telebirr balance is ETB X"
  const balMatch = /current\s+(?:telebirr\s+)?balance\s+is\s+ETB\s*([\d,]+\.?\d*)/i.exec(body);
  const newBalance = balMatch ? num(balMatch[1]) : undefined;

  // Account mask from "telebirr Account XXXXX"
  const acctMatch = /telebirr\s+account\s+(\d+)/i.exec(body);
  const accountMask = acctMatch ? acctMatch[1] : undefined;

  // Pattern 1: Received
  const receivedMatch = /you have received\s+ETB\s*([\d,]+\.?\d*).*?from\s+(.+?)\s+to\s+your/i.exec(body);
  if (receivedMatch) {
    return {
      bankId: "telebirr",
      direction: "credit",
      amount: num(receivedMatch[1]),
      timestamp,
      accountMask,
      newBalance,
      description: `From ${receivedMatch[2].trim()}`,
      smsId,
      rawText: body,
      refNo,
    };
  }

  // Pattern 3: Package purchase (check before generic paid)
  const packageMatch = /you have paid\s+ETB\s*([\d,]+\.?\d*)\s+for\s+package\s+(.+?)\s+(?:for|purchase)/i.exec(body);
  if (packageMatch) {
    return {
      bankId: "telebirr",
      direction: "debit",
      amount: num(packageMatch[1]),
      timestamp,
      accountMask,
      newBalance,
      description: `Package: ${packageMatch[2].trim()}`,
      smsId,
      rawText: body,
      refNo,
    };
  }

  // Pattern 2: Paid to merchant
  const paidMatch = /you have paid\s+ETB\s*([\d,]+\.?\d*)\s+to\s+(.+?)\s+with/i.exec(body);
  if (paidMatch) {
    const feeMatch = /service fee\s+is\s+ETB\s*([\d,]+\.?\d*)/i.exec(body);
    const vatMatch = /VAT.*?ETB\s*([\d,]+\.?\d*)/i.exec(body);
    const fee = (feeMatch ? num(feeMatch[1]) : 0) + (vatMatch ? num(vatMatch[1]) : 0);
    return {
      bankId: "telebirr",
      direction: "debit",
      amount: num(paidMatch[1]),
      fees: fee > 0 ? fee : undefined,
      timestamp,
      accountMask,
      newBalance,
      description: `To ${paidMatch[2].trim()}`,
      smsId,
      rawText: body,
      refNo,
    };
  }

  // Fallback: generic paid
  const genericPaid = /you have paid\s+ETB\s*([\d,]+\.?\d*)/i.exec(body);
  if (genericPaid) {
    return {
      bankId: "telebirr",
      direction: "debit",
      amount: num(genericPaid[1]),
      timestamp,
      accountMask,
      newBalance,
      description: "Payment",
      smsId,
      rawText: body,
      refNo,
    };
  }

  return null;
};

// ---------------------------------------------------------------------------
// Bank of Abyssinia (BOA) Parser
// ---------------------------------------------------------------------------
// Pattern 1 (Debit):
//   "Dear HENOK, your account 1*99 was debited with ETB 50.00.
//    Available Balance: ETB 5,642.92. Receipt: https://..."
//
// Pattern 2 (Credit):
//   "Dear HENOK, your account 1*99 was credited with ETB 1,000.00
//    by Cash Deposit-HENOK ENYEW ANDARGIE. Available Balance: ETB 5,692.92."

export const parseBoaSms: BankSmsParser = (sms) => {
  const { body, date, id } = sms;
  // BOA detection: rely on pattern matching; keyword check only for auto-detect

  const smsId = id || generateSmsIdSync(body, date);
  const timestamp = extractDate(body, date);

  const balMatch = /available\s+balance:\s+ETB\s*([\d,]+\.?\d*)/i.exec(body);
  const newBalance = balMatch ? num(balMatch[1]) : undefined;

  const acctMatch = /account\s+(\d\*\d+)/i.exec(body);
  const accountMask = acctMatch ? acctMatch[1] : undefined;

  const receiptMatch = /receipt:\s*(https?:\/\/\S+)/i.exec(body);
  const refNo = receiptMatch ? receiptMatch[1].split("trx=")[1]?.split(/[&\s]/)[0] : undefined;

  // Credit
  const creditMatch = /was\s+credited\s+with\s+ETB\s*([\d,]+\.?\d*)(?:\s+by\s+(.+?))?(?:\.\s|$)/i.exec(body);
  if (creditMatch) {
    return {
      bankId: "boa",
      direction: "credit",
      amount: num(creditMatch[1]),
      timestamp,
      accountMask,
      newBalance,
      description: creditMatch[2] ? `From ${creditMatch[2].trim()}` : "Credit",
      smsId,
      rawText: body,
      refNo,
    };
  }

  // Debit
  const debitMatch = /was\s+debited\s+with\s+ETB\s*([\d,]+\.?\d*)/i.exec(body);
  if (debitMatch) {
    return {
      bankId: "boa",
      direction: "debit",
      amount: num(debitMatch[1]),
      timestamp,
      accountMask,
      newBalance,
      description: "Debit",
      smsId,
      rawText: body,
      refNo,
    };
  }

  return null;
};

// ---------------------------------------------------------------------------
// Generic fallback parser (CBE-style patterns for other banks)
// ---------------------------------------------------------------------------
export const parseGenericSms: BankSmsParser = (sms) => {
  const { body, date, id } = sms;
  const smsId = id || generateSmsIdSync(body, date);
  const timestamp = extractDate(body, date);
  const accountMask = extractAccountMask(body);
  const newBalance = extractBalance(body);
  const refNo = extractRefNo(body);

  const creditMatch = /(?:credited|received|deposited).*?ETB\s*([\d,]+\.?\d*)/i.exec(body);
  if (creditMatch) {
    const fromMatch = /(?:from|by)\s+(.+?)(?:\.|,|on\s)/i.exec(body);
    return {
      bankId: "unknown",
      direction: "credit",
      amount: num(creditMatch[1]),
      timestamp,
      accountMask,
      newBalance,
      description: fromMatch ? `From ${fromMatch[1].trim()}` : "Credit",
      smsId,
      rawText: body,
      refNo,
    };
  }

  const debitMatch = /(?:debited|transferred|paid|withdrawn).*?ETB\s*([\d,]+\.?\d*)/i.exec(body);
  if (debitMatch) {
    const toMatch = /to\s+(.+?)(?:\.|,|on\s)/i.exec(body);
    return {
      bankId: "unknown",
      direction: "debit",
      amount: num(debitMatch[1]),
      timestamp,
      accountMask,
      newBalance,
      description: toMatch ? `To ${toMatch[1].trim()}` : "Debit",
      smsId,
      rawText: body,
      refNo,
    };
  }

  return null;
};

// ---------------------------------------------------------------------------
// Parser registry
// ---------------------------------------------------------------------------
export const bankSmsParsers: Record<string, BankSmsParser> = {
  cbe: parseCbeSms,
  telebirr: parseTelebirrSms,
  boa: parseBoaSms,
  awash: parseGenericSms,
  dashen: parseGenericSms,
  abay: parseGenericSms,
  coop: parseGenericSms,
  nib: parseGenericSms,
  wegagen: parseGenericSms,
  united: parseGenericSms,
  bunna: parseGenericSms,
  mpesa: parseGenericSms,
  enat: parseGenericSms,
};

/**
 * Parse an SMS body for a specific bank.
 * When bankId is known, we skip body-based bank detection and go straight to
 * pattern matching, which is much more reliable.
 */
export function parseBankSms(
  bankId: string,
  sms: { sender: string; body: string; date: number; id: string },
): ParsedBankSms | null {
  // Try the specific parser first
  const specificParser = bankSmsParsers[bankId];
  if (specificParser) {
    const result = specificParser(sms);
    if (result) {
      if (result.bankId === "unknown") result.bankId = bankId;
      return result;
    }
  }

  // Fallback: try the generic parser
  const result = parseGenericSms(sms);
  if (result) {
    result.bankId = bankId;
    return result;
  }
  return null;
}

/**
 * Try all parsers and return the first match. Useful when bank is unknown.
 * Uses body-based detection hints to prioritize parsers.
 */
export function parseSmsAutoDetect(
  sms: { sender: string; body: string; date: number; id: string },
): ParsedBankSms | null {
  const upper = sms.body.toUpperCase();

  // Try specific parsers based on body keywords
  if (upper.includes("CBE") || upper.includes("COMMERCIAL BANK") || /Dear\s+\w+\s+your\s+Account\s+\d\*+\d+/i.test(sms.body)) {
    const result = parseCbeSms(sms);
    if (result) return result;
  }
  if (upper.includes("TELEBIRR") || upper.includes("ETHIO TELECOM")) {
    const result = parseTelebirrSms(sms);
    if (result) return result;
  }
  if (upper.includes("ABYSSINIA") || upper.includes("BOA")) {
    const result = parseBoaSms(sms);
    if (result) return result;
  }

  // Try all specific parsers
  for (const [bankId, parser] of Object.entries(bankSmsParsers)) {
    const result = parser(sms);
    if (result) return result;
  }

  // Last resort: generic
  return parseGenericSms(sms);
}
