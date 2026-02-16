/**
 * Parse Ethiopian bank SMS bodies into structured transaction data.
 * Patterns are based on common formats; add or adjust per bank as needed.
 */

import { getBankIdBySender } from "@/constants/smsBankShortcodes";

export interface ParsedSms {
  amount: number;
  type: "income" | "expense";
  balance: number;
  date: string;
  recipient?: string;
  raw: string;
  bankId: string;
}

function normalizeAmount(str: string): number {
  const cleaned = str.replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDateFromSms(text: string): string {
  const today = new Date().toISOString().split("T")[0];
  const ddmmyy = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(text);
  if (ddmmyy) {
    const [, d, m, y] = ddmmyy;
    const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
    const month = parseInt(m, 10);
    const day = parseInt(d, 10);
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) return date.toISOString().split("T")[0];
  }
  const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return iso[0];
  return today;
}

type PatternResult = { amount: number; type: "income" | "expense"; balance: number; date: string; recipient?: string } | null;

function tryCbeStyle(body: string): PatternResult {
  const transferOut = /(?:transferred|sent|withdrawn|debited).*?ETB\s*([\d,]+\.?\d*).*?to\s+(.+?)(?:on|at|\.|,).*?balance\s+is\s+ETB\s*([\d,]+\.?\d*)/i.exec(body);
  if (transferOut) {
    return {
      amount: normalizeAmount(transferOut[1]),
      type: "expense",
      balance: normalizeAmount(transferOut[3]),
      date: parseDateFromSms(body),
      recipient: transferOut[2].trim(),
    };
  }
  const deposit = /(?:received|credited|deposited).*?ETB\s*([\d,]+\.?\d*).*?(?:from|by)\s+(.+?)(?:\.|,|on).*?balance\s+is\s+ETB\s*([\d,]+\.?\d*)/i.exec(body);
  if (deposit) {
    return {
      amount: normalizeAmount(deposit[1]),
      type: "income",
      balance: normalizeAmount(deposit[3]),
      date: parseDateFromSms(body),
      recipient: deposit[2].trim(),
    };
  }
  const genericDebit = /(?:debited|withdrawn|paid)\s+ETB\s*([\d,]+\.?\d*).*?balance\s+ETB\s*([\d,]+\.?\d*)/i.exec(body);
  if (genericDebit) {
    return {
      amount: normalizeAmount(genericDebit[1]),
      type: "expense",
      balance: normalizeAmount(genericDebit[2]),
      date: parseDateFromSms(body),
    };
  }
  const genericCredit = /(?:credited|received|deposited)\s+ETB\s*([\d,]+\.?\d*).*?balance\s+ETB\s*([\d,]+\.?\d*)/i.exec(body);
  if (genericCredit) {
    return {
      amount: normalizeAmount(genericCredit[1]),
      type: "income",
      balance: normalizeAmount(genericCredit[2]),
      date: parseDateFromSms(body),
    };
  }
  return null;
}

function tryTelebirrStyle(body: string): PatternResult {
  const paid = /(?:you have (?:paid|sent)|payment of)\s*ETB\s*([\d,]+\.?\d*).*?to\s+(.+?)(?:\.|,).*?balance\s*ETB\s*([\d,]+\.?\d*)/i.exec(body);
  if (paid) {
    return {
      amount: normalizeAmount(paid[1]),
      type: "expense",
      balance: normalizeAmount(paid[3]),
      date: parseDateFromSms(body),
      recipient: paid[2].trim(),
    };
  }
  const received = /(?:you have received|received)\s*ETB\s*([\d,]+\.?\d*).*?from\s+(.+?)(?:\.|,).*?balance\s*ETB\s*([\d,]+\.?\d*)/i.exec(body);
  if (received) {
    return {
      amount: normalizeAmount(received[1]),
      type: "income",
      balance: normalizeAmount(received[3]),
      date: parseDateFromSms(body),
      recipient: received[2].trim(),
    };
  }
  return null;
}

const bankParsers: Record<string, (body: string) => PatternResult> = {
  cbe: tryCbeStyle,
  awash: tryCbeStyle,
  dashen: tryCbeStyle,
  boa: tryCbeStyle,
  abay: tryCbeStyle,
  coop: tryCbeStyle,
  nib: tryCbeStyle,
  wegagen: tryCbeStyle,
  united: tryCbeStyle,
  bunna: tryCbeStyle,
  telebirr: tryTelebirrStyle,
  mpesa: tryCbeStyle,
  enat: tryCbeStyle,
};

export function parseBankSms(bankId: string, body: string, _sender: string): ParsedSms | null {
  const fn = bankParsers[bankId] ?? tryCbeStyle;
  const result = fn(body);
  if (!result || result.amount <= 0) return null;
  return {
    ...result,
    raw: body,
    bankId,
  };
}

export function parseSmsFromSender(sender: string, body: string): ParsedSms | null {
  const bankId = getBankIdBySender(sender);
  if (!bankId) return null;
  return parseBankSms(bankId, body, sender);
}
