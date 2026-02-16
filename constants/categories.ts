export interface Category {
  id: string;
  name: string;
  icon: string;
  iconFamily: "Ionicons" | "MaterialIcons" | "MaterialCommunityIcons" | "Feather";
  color: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "food", name: "Food & Dining", icon: "restaurant", iconFamily: "MaterialIcons", color: "#EF6C00" },
  { id: "transport", name: "Transport", icon: "directions-car", iconFamily: "MaterialIcons", color: "#1565C0" },
  { id: "utilities", name: "Utilities", icon: "flash", iconFamily: "Ionicons", color: "#F9A825" },
  { id: "healthcare", name: "Healthcare", icon: "medical-services", iconFamily: "MaterialIcons", color: "#C62828" },
  { id: "entertainment", name: "Entertainment", icon: "movie", iconFamily: "MaterialIcons", color: "#7B1FA2" },
  { id: "groceries", name: "Groceries", icon: "cart", iconFamily: "Ionicons", color: "#2E7D32" },
  { id: "rent", name: "Rent", icon: "home", iconFamily: "MaterialIcons", color: "#4E342E" },
  { id: "shopping", name: "Shopping", icon: "shopping-bag", iconFamily: "MaterialIcons", color: "#D81B60" },
  { id: "education", name: "Education", icon: "school", iconFamily: "MaterialIcons", color: "#0097A7" },
  { id: "transfer", name: "Personal Transfer", icon: "swap-horiz", iconFamily: "MaterialIcons", color: "#5C6BC0" },
  { id: "salary", name: "Salary", icon: "account-balance-wallet", iconFamily: "MaterialIcons", color: "#00897B" },
  { id: "business", name: "Business", icon: "briefcase", iconFamily: "Ionicons", color: "#37474F" },
  { id: "bills", name: "Bills", icon: "receipt", iconFamily: "MaterialIcons", color: "#6D4C41" },
  { id: "other", name: "Other", icon: "more-horiz", iconFamily: "MaterialIcons", color: "#78909C" },
];

export function getCategoryById(id: string, allCategories: Category[]): Category | undefined {
  return allCategories.find((c) => c.id === id);
}
