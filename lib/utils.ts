import * as Crypto from "expo-crypto";

export function generateId(): string {
  return Crypto.randomUUID();
}

export function formatCurrency(amount: number): string {
  const formatted = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `ETB ${formatted}`;
}

export function formatCurrencyShort(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1000000) {
    return `ETB ${(abs / 1000000).toFixed(1)}M`;
  }
  if (abs >= 1000) {
    return `ETB ${(abs / 1000).toFixed(1)}K`;
  }
  return `ETB ${abs.toFixed(2)}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Last 7 days including today. */
export function getLast7DaysRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return { start: fmtDate(start), end: fmtDate(end) };
}

/** From Jan 1 of current year to today. */
export function getThisYearRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end.getFullYear(), 0, 1);
  return { start: fmtDate(start), end: fmtDate(end) };
}

export function getMonthName(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const d = new Date(parseInt(year), parseInt(month) - 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

import type { BudgetPeriod } from "./types";

/**
 * Returns the start and end dates (YYYY-MM-DD) for a given budget period.
 * Transactions whose `date` field is >= start and <= end fall within this window.
 */
export function getPeriodDateRange(period: BudgetPeriod): { start: string; end: string; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (period) {
    case "daily": {
      const today = getToday();
      return { start: today, end: today, label: "Today" };
    }
    case "weekly": {
      const day = now.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(y, m, d + mondayOffset);
      const sunday = new Date(y, m, d + mondayOffset + 6);
      return {
        start: fmtDate(monday),
        end: fmtDate(sunday),
        label: `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      };
    }
    case "monthly": {
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);
      return {
        start: fmtDate(firstDay),
        end: fmtDate(lastDay),
        label: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      };
    }
    case "yearly": {
      return {
        start: `${y}-01-01`,
        end: `${y}-12-31`,
        label: `${y}`,
      };
    }
  }
}

export function getPeriodLabel(period: BudgetPeriod): string {
  switch (period) {
    case "daily": return "Daily";
    case "weekly": return "Weekly";
    case "monthly": return "Monthly";
    case "yearly": return "Yearly";
  }
}
