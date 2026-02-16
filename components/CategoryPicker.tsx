import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { Category } from "@/constants/categories";
import Colors from "@/constants/colors";

interface CategoryPickerProps {
  categories: Category[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function CategoryPicker({ categories, selectedId, onSelect }: CategoryPickerProps) {
  return (
    <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
      {categories.map((cat) => {
        const isSelected = cat.id === selectedId;
        return (
          <Pressable
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            style={[styles.item, isSelected && { backgroundColor: cat.color + "20", borderColor: cat.color }]}
          >
            <View style={[styles.iconBg, { backgroundColor: cat.color + "18" }]}>
              {cat.iconFamily === "Ionicons" ? (
                <Ionicons name={cat.icon as any} size={20} color={cat.color} />
              ) : (
                <MaterialIcons name={cat.icon as any} size={20} color={cat.color} />
              )}
            </View>
            <Text style={[styles.name, isSelected && { color: cat.color, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
              {cat.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
});
