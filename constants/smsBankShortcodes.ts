/**
 * Ethiopian bank SMS sender IDs / shortcodes.
 *
 * Many banks share the common shortcode "8990", so the sender alone
 * is NOT enough to identify the bank. The parsers in lib/sms/parser.ts
 * determine the actual bank from the SMS body content.
 *
 * These mappings are used to:
 * 1. Identify SMS that are *potentially* bank-related (for the listener)
 * 2. Provide a first guess for which parser to try
 */

export const BANK_SMS_SENDERS: Record<string, string[]> = {
  cbe: ["CBE", "Commercial Bank of Ethiopia"],
  awash: ["Awash", "AWASH"],
  dashen: ["Dashen", "DASHEN"],
  boa: ["Abyssinia", "BOA", "Bank of Abyssinia"],
  abay: ["Abay", "ABAY"],
  coop: ["CBO", "Cooperative Bank of Oromia"],
  nib: ["NIB", "Nib International"],
  wegagen: ["Wegagen", "WEGAGEN"],
  united: ["United", "United Bank"],
  bunna: ["Bunna", "BUNNA"],
  telebirr: ["Telebirr", "TELEBIRR", "telebirr"],
  mpesa: ["M-Pesa", "MPESA", "Mpesa"],
  enat: ["Enat", "ENAT"],
};

/**
 * Common shortcodes that could belong to any bank.
 * SMS from these senders must be parsed by body content, not sender.
 */
export const SHARED_SHORTCODES = ["8990", "247"];

/**
 * Try to guess the bank from the sender string.
 * Returns null if sender is ambiguous (e.g. shared shortcode).
 */
export function getBankIdBySender(sender: string): string | null {
  const normalized = sender.trim().toUpperCase();

  if (SHARED_SHORTCODES.some((sc) => normalized === sc)) {
    return null;
  }

  for (const [bankId, senders] of Object.entries(BANK_SMS_SENDERS)) {
    if (
      senders.some(
        (s) => s.toUpperCase() === normalized || normalized.includes(s.toUpperCase()),
      )
    ) {
      return bankId;
    }
  }
  return null;
}

/**
 * Check if a sender string is potentially a bank SMS sender.
 */
export function isPotentialBankSender(sender: string): boolean {
  const normalized = sender.trim().toUpperCase();

  if (SHARED_SHORTCODES.some((sc) => normalized === sc)) {
    return true;
  }

  for (const senders of Object.values(BANK_SMS_SENDERS)) {
    if (senders.some((s) => normalized.includes(s.toUpperCase()))) {
      return true;
    }
  }
  return false;
}

/**
 * Get all known sender strings (excluding shared shortcodes).
 */
export function getAllSenders(): string[] {
  const set = new Set<string>();
  for (const senders of Object.values(BANK_SMS_SENDERS)) {
    senders.forEach((s) => set.add(s));
  }
  SHARED_SHORTCODES.forEach((sc) => set.add(sc));
  return Array.from(set);
}
