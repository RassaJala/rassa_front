import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useAuth } from "../../store/AuthContext";

const mockProducts = [
  { id: 1, name: "Manzanas Fuji", price: "$45/kg", stock: 200, status: "Activo", sales: 48 },
  { id: 2, name: "Lechugas Romanas", price: "$18/pieza", stock: 150, status: "Activo", sales: 30 },
  { id: 3, name: "Tomates Cherry", price: "$32/kg", stock: 0, status: "Agotado", sales: 75 },
];

export default function MyProductsScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const [products] = useState(mockProducts);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>🌿 Rassa</Text>
          <Text style={styles.welcome}>Panel Agricultor</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: "Productos", value: products.length, icon: "🛍️", color: "#f59e0b" },
            { label: "Ventas totales", value: products.reduce((a, p) => a + p.sales, 0), icon: "📈", color: "#16a34a" },
            { label: "Activos", value: products.filter((p) => p.status === "Activo").length, icon: "✅", color: "#6366f1" },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { borderTopColor: s.color }]}>
              <Text style={{ fontSize: 24 }}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Products list */}
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Mis Productos</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate("AddProduct")}>
            <Text style={styles.addBtnText}>+ Agregar</Text>
          </TouchableOpacity>
        </View>

        {products.map((p) => (
          <View key={p.id} style={[styles.productCard, isMobile && styles.productCardMobile]}>
            <View style={styles.productLeft}>
              <View style={styles.productImg}>
                <Text style={{ fontSize: 24 }}>🍎</Text>
              </View>
              <View>
                <Text style={styles.productName}>{p.name}</Text>
                <Text style={styles.productPrice}>{p.price}</Text>
                <Text style={styles.productSales}>📦 {p.sales} vendidos</Text>
              </View>
            </View>
            <View style={[styles.productRight, isMobile && styles.productRightMobile]}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: p.status === "Activo" ? "#dcfce7" : "#fef2f2" },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: p.status === "Activo" ? "#16a34a" : "#dc2626" },
                  ]}
                >
                  {p.status}
                </Text>
              </View>
              <Text style={styles.stockText}>Stock: {p.stock}</Text>
              <View style={styles.actionBtns}>
                <TouchableOpacity style={styles.editBtn}>
                  <Text style={styles.editText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn}>
                  <Text style={styles.deleteText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
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
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  logo: { fontSize: 22, fontWeight: "800", color: "#fff" },
  welcome: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  logoutBtn: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  logoutText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderTopWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: { fontSize: 24, fontWeight: "800", color: "#1e293b", marginTop: 6 },
  statLabel: { fontSize: 12, color: "#64748b", marginTop: 2 },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  addBtn: { backgroundColor: GREEN, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  productCardMobile: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  productLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  productImg: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
  },
  productName: { fontSize: 14, fontWeight: "700", color: "#1e293b", marginBottom: 2 },
  productPrice: { fontSize: 13, color: GREEN, fontWeight: "600", marginBottom: 2 },
  productSales: { fontSize: 11, color: "#64748b" },
  productRight: { alignItems: "flex-end", gap: 4 },
  productRightMobile: { alignItems: "flex-start", marginTop: 10, width: "100%", flexDirection: "row", justifyContent: "space-between" },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: "700" },
  stockText: { fontSize: 12, color: "#64748b" },
  actionBtns: { flexDirection: "row", gap: 8 },
  editBtn: { backgroundColor: "#eff6ff", borderRadius: 8, padding: 8 },
  editText: { fontSize: 16 },
  deleteBtn: { backgroundColor: "#fef2f2", borderRadius: 8, padding: 8 },
  deleteText: { fontSize: 16 },
});
