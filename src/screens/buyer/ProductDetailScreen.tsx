import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useAuth } from "../../store/AuthContext";

export default function ProductDetailScreen({ navigation }: any) {
  const { logout } = useAuth();

  const product = {
    name: "Manzanas Fuji",
    price: "$45/kg",
    farmer: "Rancho El Paraíso",
    category: "Frutas",
    stock: 200,
    description:
      "Manzanas Fuji de primera calidad, cultivadas sin pesticidas en los valles del norte. Dulces, crujientes y llenas de vitaminas. Perfectas para consumo directo o para preparar jugos y postres.",
    tags: ["Orgánico", "Sin pesticidas", "Cosecha 2026"],
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.imagePlaceholder}>
          <Text style={{ fontSize: 80 }}>🍎</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.topRow}>
            <View style={styles.flex}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.farmer}>🌾 {product.farmer}</Text>
            </View>
            <Text style={styles.price}>{product.price}</Text>
          </View>

          <View style={styles.tagsRow}>
            {product.tags.map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText}>✅ {t}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>Descripción</Text>
          <Text style={styles.description}>{product.description}</Text>

          <View style={styles.metaGrid}>
            {[
              { label: "Categoría", value: product.category },
              { label: "Stock", value: `${product.stock} kg` },
              { label: "Estado", value: "✅ Disponible" },
              { label: "Calidad", value: "⭐ Premium" },
            ].map((m) => (
              <View key={m.label} style={styles.metaItem}>
                <Text style={styles.metaLabel}>{m.label}</Text>
                <Text style={styles.metaValue}>{m.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.wishlistBtn}>
              <Text style={styles.wishlistText}>❤️ Favorito</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addCartBtn}>
              <Text style={styles.addCartText}>🛒 Agregar al carrito</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const GREEN = "#16a34a";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: GREEN,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  backText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  logoutBtn: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  logoutText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  content: { padding: 20, paddingBottom: 40 },
  imagePlaceholder: {
    height: 240,
    backgroundColor: "#f0fdf4",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#bbf7d0",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  flex: { flex: 1 },
  productName: { fontSize: 24, fontWeight: "800", color: "#1e293b", marginBottom: 4 },
  farmer: { fontSize: 14, color: "#64748b" },
  price: { fontSize: 28, fontWeight: "800", color: GREEN },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  tag: { backgroundColor: "#dcfce7", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: "#bbf7d0" },
  tagText: { fontSize: 12, color: "#15803d", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 16 },
  sectionLabel: { fontSize: 15, fontWeight: "700", color: "#1e293b", marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 22, color: "#475569", marginBottom: 20 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  metaItem: { flex: 1, minWidth: 120, backgroundColor: "#f8fafc", borderRadius: 12, padding: 14 },
  metaLabel: { fontSize: 11, color: "#94a3b8", fontWeight: "600", marginBottom: 4, textTransform: "uppercase" },
  metaValue: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  actionRow: { flexDirection: "row", gap: 12 },
  wishlistBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  wishlistText: { fontSize: 15, fontWeight: "700", color: "#374151" },
  addCartBtn: {
    flex: 2,
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addCartText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
