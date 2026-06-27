import React from "react";
import { View, Text, StyleSheet } from "react-native";

const ROLE_META: Record<string, { label: string; bg: string; fg: string }> = {
  admin:  { label: "Administrador", bg: "#fef2f2", fg: "#dc2626" },
  farmer: { label: "Agricultor",    bg: "#f0fdf4", fg: "#16a34a" },
  buyer:  { label: "Cliente",       bg: "#eff6ff", fg: "#2563eb" },
  vendor: { label: "Vendedor",      bg: "#fffbeb", fg: "#d97706" },
};

interface BadgeProps {
  role: string;
}

export default function Badge({ role }: BadgeProps) {
  const meta = ROLE_META[role] || ROLE_META.buyer;
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.text, { color: meta.fg }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
  },
});
