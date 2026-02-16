/**
 * Ethiopian bank SMS sender IDs / shortcodes for filtering bank messages.
 * Format varies by carrier; common patterns are shortcodes (e.g. 8990) or alphanumeric senders.
 * Add or adjust based on real SMS from each bank.
 */
export const BANK_SMS_SENDERS: Record<string, string[]> = {
  cbe: ["8990", "CBE", "Commercial Bank of Ethiopia"],
  awash: ["8990", "Awash", "AWASH"],
  dashen: ["8990", "Dashen", "DASHEN"],
  boa: ["8990", "Abyssinia", "BOA", "Bank of Abyssinia"],
  abay: ["8990", "Abay", "ABAY"],
  coop: ["8990", "CBO", "Cooperative Bank of Oromia"],
  nib: ["8990", "NIB", "Nib International"],
  wegagen: ["8990", "Wegagen", "WEGAGEN"],
  united: ["8990", "United", "United Bank"],
  bunna: ["8990", "Bunna", "BUNNA"],
  telebirr: ["8990", "Telebirr", "TELEBIRR", "247"],
  mpesa: ["8990", "M-Pesa", "MPESA", "Mpesa"],
  enat: ["8990", "Enat", "ENAT"],
};

export function getBankIdBySender(sender: string): string | null {
  const normalized = sender.trim().toUpperCase();
  for (const [bankId, senders] of Object.entries(BANK_SMS_SENDERS)) {
    if (senders.some((s) => s.toUpperCase() === normalized || normalized.includes(s.toUpperCase()))) {
      return bankId;
    }
  }
  return null;
}

export function getAllSenders(): string[] {
  const set = new Set<string>();
  for (const senders of Object.values(BANK_SMS_SENDERS)) {
    senders.forEach((s) => set.add(s));
  }
  return Array.from(set);
}
