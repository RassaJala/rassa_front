import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "~/store/AuthContext";

const mockProducts = [
  {
    id: 1,
    name: "Manzanas Fuji",
    price: "$45/kg",
    stock: 200,
    status: "Activo",
    category: "Frutas",
  },
  {
    id: 2,
    name: "Lechugas Romanas",
    price: "$18/pieza",
    stock: 150,
    status: "Activo",
    category: "Verduras",
  },
  {
    id: 3,
    name: "Tomates Cherry",
    price: "$32/kg",
    stock: 80,
    status: "Agotado",
    category: "Verduras",
  },
];

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState("");
  const [cartCount, setCartCount] = useState(0);

  const filtered = mockProducts.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>🌿 Rassa</Text>
          <Text style={styles.welcome}>
            Hola, {user?.first_name || "Cliente"} 👋
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.cartBtn}>
            <Text style={styles.cartIcon}>🛒</Text>
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate("Profile")}
            style={styles.profileBtn}
          >
            <Text style={styles.profileBtnText}>👤 Perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Search bar */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍  Buscar productos frescos..."
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Hero banner */}
        <View style={styles.hero}>
          <Text style={styles.heroText}>
            🌾 Productos frescos{"\n"}directo del campo
          </Text>
          <Text style={styles.heroSub}>Los mejores agricultores a un clic</Text>
        </View>

        {/* Categories */}
        <Text style={styles.sectionTitle}>Categorías</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catScroll}
        >
          {[
            "🍎 Frutas",
            "🥦 Verduras",
            "🌽 Granos",
            "🥕 Raíces",
            "🫐 Berries",
            "🌿 Hierbas",
          ].map((c) => (
            <TouchableOpacity key={c} style={styles.catChip}>
              <Text style={styles.catChipText}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Products */}
        <Text style={styles.sectionTitle}>Productos disponibles</Text>
        <View style={styles.productsGrid}>
          {filtered.map((p) => (
            <View key={p.id} style={styles.productCard}>
              <View style={styles.productImagePlaceholder}>
                <Text style={{ fontSize: 40 }}>
                  {p.category === "Frutas" ? "🍎" : "🥦"}
                </Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{p.name}</Text>
                <Text style={styles.productCategory}>{p.category}</Text>
                <View style={styles.productFooter}>
                  <Text style={styles.productPrice}>{p.price}</Text>
                  <TouchableOpacity
                    style={[
                      styles.addBtn,
                      p.stock === 0 && styles.addBtnDisabled,
                    ]}
                    onPress={() => setCartCount((c) => c + 1)}
                    disabled={p.stock === 0}
                  >
                    <Text style={styles.addBtnText}>
                      {p.stock === 0 ? "Agotado" : "+ Agregar"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.stockText}>
                  {p.stock > 0 ? `✅ ${p.stock} disponibles` : "❌ Sin stock"}
                </Text>
              </View>
            </View>
          ))}
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  logo: { fontSize: 22, fontWeight: "800", color: "#fff" },
  welcome: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  cartBtn: { position: "relative" },
  cartIcon: { fontSize: 26 },
  cartBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#ef4444",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  profileBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  profileBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  logoutBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  searchRow: { marginBottom: 20 },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    outlineStyle: "none",
  } as any,
  hero: {
    backgroundColor: GREEN,
    borderRadius: 20,
    padding: 28,
    marginBottom: 24,
  },
  heroText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 34,
    marginBottom: 8,
  },
  heroSub: { fontSize: 14, color: "rgba(255,255,255,0.8)" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
  },
  catScroll: { marginBottom: 24 },
  catChip: {
    backgroundColor: "#dcfce7",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: "#bbf7d0",
  },
  catChipText: { color: "#15803d", fontWeight: "600", fontSize: 13 },
  productsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  productCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  productImagePlaceholder: {
    height: 120,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
  },
  productInfo: { padding: 16 },
  productName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  productCategory: { fontSize: 12, color: "#64748b", marginBottom: 12 },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  productPrice: { fontSize: 18, fontWeight: "800", color: GREEN },
  addBtn: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnDisabled: { backgroundColor: "#94a3b8" },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  stockText: { fontSize: 12, color: "#64748b" },
});
