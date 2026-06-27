import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useAuth } from "../../store/AuthContext";

const stats = [
  { label: "Usuarios totales", value: "1,248", icon: "👥", color: "#6366f1" },
  { label: "Productos activos", value: "342", icon: "🛍️", color: "#f59e0b" },
  { label: "Órdenes hoy", value: "87", icon: "📦", color: "#16a34a" },
  { label: "Ingresos mes", value: "$48,200", icon: "💰", color: "#ec4899" },
];

const SECTIONS = ["Dashboard", "Usuarios", "Productos", "Categorías", "Órdenes", "Reportes"];

export default function AdminPanelScreen() {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState("Dashboard");

  return (
    <View style={styles.root}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarLogo}>🌿 Rassa</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Admin</Text>
          </View>
        </View>
        {SECTIONS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.sidebarItem, activeSection === s && styles.sidebarItemActive]}
            onPress={() => setActiveSection(s)}
          >
            <Text style={[styles.sidebarItemText, activeSection === s && styles.sidebarItemTextActive]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.sidebarFooter}>
          <Text style={styles.sidebarUser}>
            {user?.first_name} {user?.last_name}
          </Text>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main content */}
      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.pageTitle}>{activeSection}</Text>
            <Text style={styles.pageSubtitle}>
              Panel de administración · Rassa
            </Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </Text>
          </View>
        </View>

        {activeSection === "Dashboard" && (
          <>
            {/* Stats grid */}
            <View style={styles.statsGrid}>
              {stats.map((s) => (
                <View key={s.label} style={[styles.statCard, { borderLeftColor: s.color }]}>
                  <Text style={styles.statIcon}>{s.icon}</Text>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Quick actions */}
            <Text style={styles.sectionTitle}>Acciones rápidas</Text>
            <View style={styles.actionsGrid}>
              {[
                { label: "Gestionar Usuarios", icon: "👥", color: "#6366f1" },
                { label: "Ver Productos", icon: "🛍️", color: "#f59e0b" },
                { label: "Revisar Órdenes", icon: "📦", color: "#16a34a" },
                { label: "Ver Reportes", icon: "📊", color: "#ec4899" },
              ].map((a) => (
                <TouchableOpacity
                  key={a.label}
                  style={styles.actionCard}
                  onPress={() => setActiveSection(a.label.split(" ")[1] || "Dashboard")}
                >
                  <View style={[styles.actionIcon, { backgroundColor: a.color + "20" }]}>
                    <Text style={{ fontSize: 28 }}>{a.icon}</Text>
                  </View>
                  <Text style={styles.actionLabel}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recent activity */}
            <Text style={styles.sectionTitle}>Actividad reciente</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                {["Usuario", "Acción", "Fecha", "Estado"].map((h) => (
                  <Text key={h} style={styles.tableHeaderCell}>{h}</Text>
                ))}
              </View>
              {[
                ["María López", "Nuevo registro", "Hoy 14:32", "✅ Activo"],
                ["Juan Pérez", "Publicó producto", "Hoy 13:10", "✅ Activo"],
                ["Carlos Ruiz", "Realizó pedido", "Hoy 11:55", "🕐 Pendiente"],
                ["Ana García", "Actualizó perfil", "Ayer 18:20", "✅ Activo"],
              ].map((row, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  {row.map((cell, j) => (
                    <Text key={j} style={styles.tableCell}>{cell}</Text>
                  ))}
                </View>
              ))}
            </View>
          </>
        )}

        {activeSection !== "Dashboard" && (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>🔧</Text>
            <Text style={styles.placeholderTitle}>{activeSection}</Text>
            <Text style={styles.placeholderText}>
              Esta sección está en construcción. Conecta tu API para mostrar datos reales.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: "#f8fafc" },
  sidebar: {
    width: 220,
    backgroundColor: "#1e293b",
    paddingTop: 24,
    paddingBottom: 16,
  },
  sidebarHeader: { paddingHorizontal: 20, marginBottom: 24 },
  sidebarLogo: { fontSize: 20, fontWeight: "800", color: "#fff", marginBottom: 6 },
  badge: {
    backgroundColor: "#16a34a",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  sidebarItem: { paddingHorizontal: 20, paddingVertical: 12 },
  sidebarItemActive: { backgroundColor: "#334155", borderLeftWidth: 3, borderLeftColor: "#16a34a" },
  sidebarItemText: { color: "#94a3b8", fontSize: 14 },
  sidebarItemTextActive: { color: "#fff", fontWeight: "700" },
  sidebarFooter: { marginTop: "auto" as any, paddingHorizontal: 20 },
  sidebarUser: { color: "#94a3b8", fontSize: 12, marginBottom: 8 },
  logoutBtn: { backgroundColor: "#ef4444", borderRadius: 8, padding: 10, alignItems: "center" },
  logoutText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  main: { flex: 1 },
  mainContent: { padding: 28 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  pageTitle: { fontSize: 26, fontWeight: "800", color: "#1e293b" },
  pageSubtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#16a34a",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 28 },
  statCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: { fontSize: 28, marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: "800", color: "#1e293b" },
  statLabel: { fontSize: 13, color: "#64748b", marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b", marginBottom: 16 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 28 },
  actionCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  actionLabel: { fontSize: 13, fontWeight: "600", color: "#374151", textAlign: "center" },
  table: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: 14 },
  tableHeaderCell: { flex: 1, fontWeight: "700", fontSize: 13, color: "#64748b" },
  tableRow: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 12 },
  tableRowAlt: { backgroundColor: "#f8fafc" },
  tableCell: { flex: 1, fontSize: 13, color: "#374151" },
  placeholder: { alignItems: "center", paddingTop: 60 },
  placeholderIcon: { fontSize: 56, marginBottom: 16 },
  placeholderTitle: { fontSize: 22, fontWeight: "800", color: "#1e293b", marginBottom: 8 },
  placeholderText: { fontSize: 14, color: "#64748b", textAlign: "center", maxWidth: 400 },
});
