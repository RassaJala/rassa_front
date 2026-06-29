import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "~/store/AuthContext";

const mockOrders = [
  {
    id: "#ORD-001",
    buyer: "Carlos M.",
    products: "Manzanas x2",
    total: "$90",
    status: "Pendiente",
    date: "Hoy 09:30",
  },
  {
    id: "#ORD-002",
    buyer: "Lucía R.",
    products: "Lechugas x5",
    total: "$90",
    status: "Confirmado",
    date: "Hoy 08:15",
  },
  {
    id: "#ORD-003",
    buyer: "Pedro G.",
    products: "Tomates x3",
    total: "$96",
    status: "Enviado",
    date: "Ayer 17:40",
  },
  {
    id: "#ORD-004",
    buyer: "Ana T.",
    products: "Manzanas x1",
    total: "$45",
    status: "Entregado",
    date: "Ayer 10:20",
  },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Pendiente: { bg: "#fff7ed", text: "#ea580c" },
  Confirmado: { bg: "#eff6ff", text: "#2563eb" },
  Enviado: { bg: "#f5f3ff", text: "#7c3aed" },
  Entregado: { bg: "#f0fdf4", text: "#16a34a" },
  Cancelado: { bg: "#fef2f2", text: "#dc2626" },
};

const SECTIONS = ["Dashboard", "Órdenes", "Inventario", "Clientes", "Reportes"];

export default function SellerDashboardScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [activeSection, setActiveSection] = useState("Dashboard");

  return (
    <View style={styles.root}>
      {/* Sidebar - hidden on mobile */}
      {!isMobile && (
        <View style={styles.sidebar}>
          <View style={styles.sidebarTop}>
            <Text style={styles.sidebarLogo}>🌿 Rassa</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Vendedor</Text>
            </View>
          </View>
          {SECTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.sidebarItem,
                activeSection === s && styles.sidebarActive,
              ]}
              onPress={() => setActiveSection(s)}
            >
              <Text
                style={[
                  styles.sidebarText,
                  activeSection === s && styles.sidebarTextActive,
                ]}
              >
                {s}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.sidebarBottom}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.first_name?.[0]}
                  {user?.last_name?.[0]}
                </Text>
              </View>
              <Text style={styles.userName}>
                {user?.first_name} {user?.last_name}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation?.navigate?.("Profile")}
              style={styles.profileBtn}
            >
              <Text style={styles.profileBtnText}>👤 Mi Perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main */}
      <ScrollView
        style={styles.main}
        contentContainerStyle={styles.mainContent}
      >
        {/* Mobile header */}
        {isMobile && (
          <View style={styles.mobileHeader}>
            <View>
              <Text style={styles.mobileLogo}>🌿 Rassa</Text>
              <Text style={styles.mobileRole}>Vendedor</Text>
            </View>
            <View
              style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
            >
              <TouchableOpacity
                onPress={() => navigation?.navigate?.("Profile")}
                style={styles.profileBtn}
              >
                <Text style={styles.profileBtnText}>👤</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                <Text style={styles.logoutText}>Salir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Mobile nav */}
        {isMobile && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.mobileNav}
          >
            {SECTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.mobileNavItem,
                  activeSection === s && styles.mobileNavItemActive,
                ]}
                onPress={() => setActiveSection(s)}
              >
                <Text
                  style={[
                    styles.mobileNavText,
                    activeSection === s && styles.mobileNavTextActive,
                  ]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.topBar}>
          <Text style={styles.pageTitle}>{activeSection}</Text>
          {!isMobile && (
            <Text style={styles.pageDate}>Viernes, 27 Jun 2026</Text>
          )}
        </View>

        {activeSection === "Dashboard" && (
          <>
            {/* Stats */}
            <View style={styles.statsGrid}>
              {[
                {
                  label: "Órdenes hoy",
                  value: "12",
                  icon: "📦",
                  color: "#f59e0b",
                },
                {
                  label: "Ingresos hoy",
                  value: "$1,240",
                  icon: "💰",
                  color: "#16a34a",
                },
                {
                  label: "Pendientes",
                  value: "5",
                  icon: "🕐",
                  color: "#f97316",
                },
                {
                  label: "Clientes mes",
                  value: "89",
                  icon: "👥",
                  color: "#6366f1",
                },
              ].map((s) => (
                <View
                  key={s.label}
                  style={[styles.statCard, { borderTopColor: s.color }]}
                >
                  <Text style={{ fontSize: 28 }}>{s.icon}</Text>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Recent orders */}
            <Text style={styles.sectionTitle}>Órdenes recientes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.ordersTable}>
                <View style={styles.tableHead}>
                  {[
                    "Orden",
                    "Cliente",
                    "Productos",
                    "Total",
                    "Estado",
                    "Fecha",
                  ].map((h) => (
                    <Text key={h} style={styles.tableHeadCell}>
                      {h}
                    </Text>
                  ))}
                </View>
                {mockOrders.map((o) => (
                  <View key={o.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.orderId]}>
                      {o.id}
                    </Text>
                    <Text style={styles.tableCell}>{o.buyer}</Text>
                    <Text style={styles.tableCell}>{o.products}</Text>
                    <Text style={[styles.tableCell, styles.total]}>
                      {o.total}
                    </Text>
                    <View style={styles.tableCellStatus}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: STATUS_COLORS[o.status]?.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: STATUS_COLORS[o.status]?.text },
                          ]}
                        >
                          {o.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.tableCell}>{o.date}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </>
        )}

        {activeSection !== "Dashboard" && (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>🔧</Text>
            <Text style={styles.placeholderTitle}>{activeSection}</Text>
            <Text style={styles.placeholderText}>
              Conecta tu API para mostrar datos reales en esta sección.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  sidebar: { width: 220, backgroundColor: "#0f172a", paddingTop: 24 },
  sidebarTop: { paddingHorizontal: 20, marginBottom: 28 },
  sidebarLogo: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: "#f59e0b",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  roleBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  sidebarItem: { paddingHorizontal: 20, paddingVertical: 12 },
  sidebarActive: {
    backgroundColor: "#1e293b",
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
  },
  sidebarText: { color: "#94a3b8", fontSize: 14 },
  sidebarTextActive: { color: "#fff", fontWeight: "700" },
  sidebarBottom: { marginTop: "auto" as any, padding: 20 },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  userName: { color: "#94a3b8", fontSize: 13, flex: 1 },
  profileBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  profileBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  logoutBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  main: { flex: 1 },
  mainContent: { padding: 20 },
  mobileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0f172a",
    padding: 16,
    marginBottom: 12,
  },
  mobileLogo: { fontSize: 18, fontWeight: "800", color: "#fff" },
  mobileRole: { fontSize: 11, color: "#f59e0b", fontWeight: "600" },
  mobileNav: { marginBottom: 16 },
  mobileNavItem: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  mobileNavItemActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  mobileNavText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  mobileNavTextActive: { color: "#fff" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  pageTitle: { fontSize: 26, fontWeight: "800", color: "#1e293b" },
  pageDate: { fontSize: 13, color: "#64748b" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderTopWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1e293b",
    marginTop: 8,
  },
  statLabel: { fontSize: 12, color: "#64748b", marginTop: 4 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
  },
  ordersTable: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tableHeadCell: {
    width: 90,
    fontWeight: "700",
    fontSize: 11,
    color: "#64748b",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    alignItems: "center",
  },
  tableCell: { width: 90, fontSize: 12, color: "#374151" },
  tableCellStatus: { width: 90 },
  orderId: { color: "#6366f1", fontWeight: "700" },
  total: { fontWeight: "700", color: "#16a34a" },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  placeholder: { alignItems: "center", paddingTop: 80 },
  placeholderIcon: { fontSize: 56, marginBottom: 16 },
  placeholderTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 8,
  },
  placeholderText: { fontSize: 14, color: "#64748b", textAlign: "center" },
});
