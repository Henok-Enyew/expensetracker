import type { Transaction } from "@/lib/types";
import type { Category } from "@/constants/categories";

const PRIMARY = "#45234E";
const PRIMARY_LIGHT = "#927C9C";
const BORDER = "#E7DBE9";
const INCOME = "#22C55E";
const EXPENSE = "#EF4444";

function formatNum(n: number): string {
  return Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface PdfExportData {
  transactions: Transaction[];
  categories: Category[];
  totalBalance: number;
  overallNetBalance: number;
  totalIncome: number;
  totalExpense: number;
}

/**
 * Generates a full HTML document for PDF export: header with logo/title,
 * summary stats, transactions table, and footer.
 */
export function buildTransactionsPdfHtml(
  data: PdfExportData,
  logoBase64: string | null,
  options?: { filterLabel?: string },
): string {
  const {
    transactions,
    categories,
    totalBalance,
    overallNetBalance,
    totalIncome,
    totalExpense,
  } = data;

  const logoImg =
    logoBase64 != null && logoBase64 !== ""
      ? `<img src="data:image/png;base64,${logoBase64}" alt="Birr Track" style="width:48px;height:48px;border-radius:12px;object-fit:contain;" />`
      : `<div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;">BT</div>`;

  const filterNote =
    options?.filterLabel != null && options.filterLabel !== ""
      ? `<p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,0.85);">${escapeHtml(options.filterLabel)}</p>`
      : "";

  const header = `
    <div style="background:linear-gradient(135deg, ${PRIMARY_LIGHT}, ${PRIMARY});padding:20px 24px;border-radius:16px;margin-bottom:20px;display:flex;align-items:center;gap:14px;box-shadow:0 4px 12px rgba(69,35,78,0.2);">
      ${logoImg}
      <div>
        <h1 style="margin:0;font-size:26px;font-weight:700;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Birr Track</h1>
        <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.8);">Transaction export</p>
        ${filterNote}
      </div>
    </div>`;

  const summaryRow = `
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
      <div style="flex:1;min-width:120px;background:#f8f6f9;border:1px solid ${BORDER};border-radius:12px;padding:14px;">
        <div style="font-size:11px;color:#927C9C;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Total Balance</div>
        <div style="font-size:18px;font-weight:700;color:${PRIMARY};">ETB ${formatNum(totalBalance)}</div>
      </div>
      <div style="flex:1;min-width:120px;background:#f8f6f9;border:1px solid ${BORDER};border-radius:12px;padding:14px;">
        <div style="font-size:11px;color:#927C9C;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Net (incl. friends)</div>
        <div style="font-size:18px;font-weight:700;color:${overallNetBalance >= 0 ? INCOME : EXPENSE};">ETB ${formatNum(overallNetBalance)}</div>
      </div>
      <div style="flex:1;min-width:120px;background:#f8f6f9;border:1px solid ${BORDER};border-radius:12px;padding:14px;">
        <div style="font-size:11px;color:#927C9C;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Total Transactions</div>
        <div style="font-size:18px;font-weight:700;color:${PRIMARY};">${transactions.length}</div>
      </div>
      <div style="flex:1;min-width:120px;background:#ecfdf5;border:1px solid ${INCOME}40;border-radius:12px;padding:14px;">
        <div style="font-size:11px;color:#166534;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Income</div>
        <div style="font-size:18px;font-weight:700;color:${INCOME};">ETB ${formatNum(totalIncome)}</div>
      </div>
      <div style="flex:1;min-width:120px;background:#fef2f2;border:1px solid ${EXPENSE}40;border-radius:12px;padding:14px;">
        <div style="font-size:11px;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Expense</div>
        <div style="font-size:18px;font-weight:700;color:${EXPENSE};">ETB ${formatNum(totalExpense)}</div>
      </div>
    </div>`;

  const tableRows = transactions.map((t, i) => {
    const cat = categories.find((c) => c.id === t.categoryId);
    const isIncome = t.type === "income";
    const bg = i % 2 === 0 ? "#fff" : "#faf9fa";
    return `
      <tr style="background:${bg};">
        <td style="padding:10px 12px;border-bottom:1px solid ${BORDER};font-size:12px;">${escapeHtml(t.date)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${BORDER};font-size:12px;"><span style="color:${isIncome ? INCOME : EXPENSE};font-weight:600;">${escapeHtml(t.type)}</span></td>
        <td style="padding:10px 12px;border-bottom:1px solid ${BORDER};font-size:12px;font-weight:600;color:${isIncome ? INCOME : EXPENSE};">${isIncome ? "+" : "−"} ETB ${formatNum(t.amount)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${BORDER};font-size:12px;">${escapeHtml(cat?.name ?? "Other")}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${BORDER};font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(t.description || "—")}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${BORDER};font-size:12px;">${escapeHtml(t.paymentMethod)}</td>
      </tr>`;
  }).join("");

  const table = `
    <div style="margin-bottom:20px;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:${PRIMARY};color:#fff;">
            <th style="padding:12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Date</th>
            <th style="padding:12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Type</th>
            <th style="padding:12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Amount</th>
            <th style="padding:12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Category</th>
            <th style="padding:12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Description</th>
            <th style="padding:12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Payment</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>`;

  const footer = `
    <div style="margin-top:24px;padding-top:16px;border-top:2px solid ${BORDER};display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;">
      <div style="font-size:12px;color:#927C9C;">Total balance: <strong style="color:${PRIMARY};">ETB ${formatNum(totalBalance)}</strong> &nbsp;|&nbsp; Transactions: <strong>${transactions.length}</strong> &nbsp;|&nbsp; Income: <strong style="color:${INCOME};">ETB ${formatNum(totalIncome)}</strong> &nbsp;|&nbsp; Expense: <strong style="color:${EXPENSE};">ETB ${formatNum(totalExpense)}</strong></div>
      <div style="font-size:11px;color:#927C9C;">Generated on ${new Date().toLocaleDateString("en-US", { dateStyle: "medium" })} · Birr Track</div>
    </div>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @page { margin: 20px; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; color: #1C0F22; font-size: 14px; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  ${header}
  ${summaryRow}
  <h2 style="font-size:14px;color:${PRIMARY};margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">Transactions</h2>
  ${table}
  ${footer}
</body>
</html>`;
}
