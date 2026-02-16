export interface BankInfo {
  id: string;
  name: string;
  shortName: string;
  color: string;
  iconLetter: string;
}

export const BANKS: BankInfo[] = [
  { id: "cbe", name: "Commercial Bank of Ethiopia", shortName: "CBE", color: "#6B3FA0", iconLetter: "C" },
  { id: "awash", name: "Awash Bank", shortName: "Awash", color: "#E8532F", iconLetter: "A" },
  { id: "dashen", name: "Dashen Bank", shortName: "Dashen", color: "#0066CC", iconLetter: "D" },
  { id: "boa", name: "Bank of Abyssinia", shortName: "Abyssinia", color: "#1B5E20", iconLetter: "B" },
  { id: "abay", name: "Abay Bank", shortName: "Abay", color: "#0277BD", iconLetter: "A" },
  { id: "coop", name: "Cooperative Bank of Oromia", shortName: "CBO", color: "#F57C00", iconLetter: "O" },
  { id: "nib", name: "Nib International Bank", shortName: "NIB", color: "#C62828", iconLetter: "N" },
  { id: "wegagen", name: "Wegagen Bank", shortName: "Wegagen", color: "#4527A0", iconLetter: "W" },
  { id: "united", name: "United Bank", shortName: "United", color: "#00695C", iconLetter: "U" },
  { id: "bunna", name: "Bunna International Bank", shortName: "Bunna", color: "#795548", iconLetter: "B" },
  { id: "telebirr", name: "Telebirr", shortName: "Telebirr", color: "#00BCD4", iconLetter: "T" },
  { id: "mpesa", name: "M-Pesa", shortName: "M-Pesa", color: "#4CAF50", iconLetter: "M" },
  { id: "enat", name: "Enat Bank", shortName: "Enat", color: "#E91E63", iconLetter: "E" },
];

export function getBankById(id: string): BankInfo | undefined {
  return BANKS.find((b) => b.id === id);
}
