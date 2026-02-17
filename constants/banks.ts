import { ImageSourcePropType } from "react-native";

export interface BankInfo {
  id: string;
  name: string;
  shortName: string;
  color: string;
  iconLetter: string;
  logo?: ImageSourcePropType;
}

const BANK_LOGOS: Record<string, ImageSourcePropType> = {
  cbe: require("@/assets/Logos/CBE.png"),
  awash: require("@/assets/Logos/Awash.png"),
  dashen: require("@/assets/Logos/Dashen.png"),
  boa: require("@/assets/Logos/BoA.png"),
  abay: require("@/assets/Logos/Abay.png"),
  telebirr: require("@/assets/Logos/telebir.png"),
  amhara: require("@/assets/Logos/Amhara.png"),
};

export const BANKS: BankInfo[] = [
  { id: "cbe", name: "Commercial Bank of Ethiopia", shortName: "CBE", color: "#6B3FA0", iconLetter: "C", logo: BANK_LOGOS.cbe },
  { id: "awash", name: "Awash Bank", shortName: "Awash", color: "#E8532F", iconLetter: "A", logo: BANK_LOGOS.awash },
  { id: "dashen", name: "Dashen Bank", shortName: "Dashen", color: "#0066CC", iconLetter: "D", logo: BANK_LOGOS.dashen },
  { id: "boa", name: "Bank of Abyssinia", shortName: "Abyssinia", color: "#E8A817", iconLetter: "B", logo: BANK_LOGOS.boa },
  { id: "abay", name: "Abay Bank", shortName: "Abay", color: "#0277BD", iconLetter: "A", logo: BANK_LOGOS.abay },
  { id: "amhara", name: "Amhara Bank", shortName: "Amhara", color: "#1565C0", iconLetter: "A", logo: BANK_LOGOS.amhara },
  { id: "telebirr", name: "Telebirr", shortName: "Telebirr", color: "#0072BC", iconLetter: "T", logo: BANK_LOGOS.telebirr },
  { id: "coop", name: "Cooperative Bank of Oromia", shortName: "CBO", color: "#F57C00", iconLetter: "O" },
  { id: "nib", name: "Nib International Bank", shortName: "NIB", color: "#C62828", iconLetter: "N" },
  { id: "wegagen", name: "Wegagen Bank", shortName: "Wegagen", color: "#4527A0", iconLetter: "W" },
  { id: "united", name: "United Bank", shortName: "United", color: "#00695C", iconLetter: "U" },
  { id: "bunna", name: "Bunna International Bank", shortName: "Bunna", color: "#795548", iconLetter: "B" },
  { id: "mpesa", name: "M-Pesa", shortName: "M-Pesa", color: "#4CAF50", iconLetter: "M" },
  { id: "enat", name: "Enat Bank", shortName: "Enat", color: "#E91E63", iconLetter: "E" },
];

export function getBankById(id: string): BankInfo | undefined {
  return BANKS.find((b) => b.id === id);
}
