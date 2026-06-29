import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Switch,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useAuth } from "../../store/AuthContext";
import { adminService } from "../../services/adminService";
import { AdminUser } from "../../types/auth";

/* ── Constants ── */
const GREEN = "#16a34a";
const GREEN_DARK = "#15803d";
const GREEN_LIGHT = "#dcfce7";

const ROLE_OPTIONS = ["buyer", "farmer", "seller", "admin"];
const ROLE_LABELS: Record<string, string> = {
  admin: "⚙️ Admin",
  seller: "🏪 Vendedor",
  farmer: "🌾 Agricultor",
  buyer: "🛒 Cliente",
};
const ROLE_COLORS: Record<string, string> = {
  admin: "#6366f1",
  seller: "#f59e0b",
  farmer: "#16a34a",
  buyer: "#06b6d4",
};

const STATS = [
  { label: "Usuarios totales", value: "—", icon: "👥", color: "#6366f1" },
  { label: "Agricultores", value: "—", icon: "🌾", color: "#16a34a" },
  { label: "Vendedores", value: "—", icon: "🏪", color: "#f59e0b" },
  { label: "Clientes", value: "—", icon: "🛒", color: "#06b6d4" },
];

const SECTIONS = [
  { key: "Dashboard", icon: "📊" },
  { key: "Usuarios", icon: "👥" },
  { key: "Perfil", icon: "👤" },
];

/* ══════════════════════════════════════════ */
/*  User row component                        */
/* ══════════════════════════════════════════ */
function UserRow({
  user,
  onRoleChange,
  onToggleActive,
  updatingId,
}: {
  user: AdminUser;
  onRoleChange: (id: number, role: string) => void;
  onToggleActive: (id: number, active: boolean) => void;
  updatingId: number | null;
}) {
  const [showRoles, setShowRoles] = useState(false);

  return (
    <View style={styles.userRow}>
      {/* Avatar + name */}
      <View style={styles.userAvatarWrap}>
        <View style={[styles.userAvatar, { backgroundColor: ROLE_COLORS[user.role] + "22" }]}>
          <Text style={[styles.userAvatarText, { color: ROLE_COLORS[user.role] }]}>
            {user.first_name?.[0]}{user.last_name?.[0]}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {user.first_name} {user.last_name}
          </Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>
      </View>

      {/* Role selector */}
      <View style={styles.roleWrap}>
        <TouchableOpacity
          style={[styles.rolePill, { backgroundColor: ROLE_COLORS[user.role] + "18", borderColor: ROLE_COLORS[user.role] + "50" }]}
          onPress={() => setShowRoles((v) => !v)}
          activeOpacity={0.8}
        >
          <Text style={[styles.rolePillText, { color: ROLE_COLORS[user.role] }]}>
            {ROLE_LABELS[user.role]}
          </Text>
          <Text style={[styles.rolePillCaret, { color: ROLE_COLORS[user.role] }]}>▾</Text>
        </TouchableOpacity>
        {showRoles && (
          <View style={styles.roleDropdown}>
            {ROLE_OPTIONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleOption, user.role === r && styles.roleOptionActive]}
                onPress={() => {
                  onRoleChange(user.id, r);
                  setShowRoles(false);
                }}
              >
                <Text style={[styles.roleOptionText, user.role === r && { color: ROLE_COLORS[r], fontWeight: "700" }]}>
                  {ROLE_LABELS[r]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Active toggle */}
      <View style={styles.activeWrap}>
        {updatingId === user.id ? (
          <ActivityIndicator size="small" color={GREEN} />
        ) : (
          <>
            <Switch
              value={user.is_active}
              onValueChange={(v) => onToggleActive(user.id, v)}
              trackColor={{ false: "#e2e8f0", true: "#86efac" }}
              thumbColor={user.is_active ? GREEN : "#94a3b8"}
            />
            <Text style={[styles.activeLabel, { color: user.is_active ? GREEN : "#94a3b8" }]}>
              {user.is_active ? "Activo" : "Inactivo"}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

/* ══════════════════════════════════════════ */
/*  Admin Panel Screen                        */
/* ══════════════════════════════════════════ */
export default function AdminPanelScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [activeSection, setActiveSection] = useState("Dashboard");

  /* ── Users state ── */
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);

  /* ── Fetch users ── */
  const fetchUsers = useCallback(async (q?: string) => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const res = await adminService.getUsers(q ?? search);
      setUsers(res.results);
      setTotalUsers(res.count);
    } catch {
      setUsersError("No se pudieron cargar los usuarios. Verifica tu conexión.");
    } finally {
      setUsersLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (activeSection === "Usuarios") fetchUsers();
  }, [activeSection]);

  /* ── Search with debounce ── */
  useEffect(() => {
    if (activeSection !== "Usuarios") return;
    const t = setTimeout(() => fetchUsers(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  /* ── Role change ── */
  const handleRoleChange = async (id: number, role: string) => {
    setUpdatingId(id);
    try {
      const updated = await adminService.updateUser(id, { role });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: updated.role } : u)));
    } catch {
      /* show nothing — API will handle feedback */
    } finally {
      setUpdatingId(null);
    }
  };

  /* ── Toggle active ── */
  const handleToggleActive = async (id: number, active: boolean) => {
    setUpdatingId(id);
    try {
      await adminService.updateUser(id, { is_active: active });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_active: active } : u)));
    } catch {
      /* noop */
    } finally {
      setUpdatingId(null);
    }
  };

  /* ── Stats derived from users ── */
  const statsData = [
    { label: "Usuarios totales", value: String(totalUsers), icon: "👥", color: "#6366f1" },
    {
      label: "Agricultores",
      value: String(users.filter((u) => u.role === "farmer").length),
      icon: "🌾",
      color: "#16a34a",
    },
    {
      label: "Vendedores",
      value: String(users.filter((u) => u.role === "seller").length),
      icon: "🏪",
      color: "#f59e0b",
    },
    {
      label: "Clientes",
      value: String(users.filter((u) => u.role === "buyer").length),
      icon: "🛒",
      color: "#06b6d4",
    },
  ];

  return (
    <View style={styles.root}>
      {/* ══ Sidebar - hidden on mobile ══ */}
      {!isMobile && (
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarLogo}>🌿 Rassa</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Admin</Text>
            </View>
          </View>

          {SECTIONS.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.sidebarItem, activeSection === s.key && styles.sidebarItemActive]}
              onPress={() => setActiveSection(s.key)}
              activeOpacity={0.8}
            >
              <Text style={styles.sidebarItemIcon}>{s.icon}</Text>
              <Text style={[styles.sidebarItemText, activeSection === s.key && styles.sidebarItemTextActive]}>
                {s.key}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.sidebarFooter}>
            <View style={styles.sidebarUserRow}>
              <View style={styles.sidebarAvatar}>
                <Text style={styles.sidebarAvatarText}>
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sidebarUserName}>
                  {user?.first_name} {user?.last_name}
                </Text>
                <Text style={styles.sidebarUserEmail}>{user?.email}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => navigation?.navigate?.("Profile")}
              style={styles.profileBtn}
            >
              <Text style={styles.profileBtnText}>👤  Mi Perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>🚪  Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ══ Main content ══ */}
      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
        {/* Mobile header */}
        {isMobile && (
          <View style={styles.mobileHeader}>
            <View>
              <Text style={styles.mobileLogo}>🌿 Rassa</Text>
              <Text style={styles.mobileRole}>Admin</Text>
            </View>
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Salir</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Mobile nav */}
        {isMobile && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mobileNav}>
            {SECTIONS.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.mobileNavItem, activeSection === s.key && styles.mobileNavItemActive]}
                onPress={() => setActiveSection(s.key)}
              >
                <Text style={styles.mobileNavIcon}>{s.icon}</Text>
                <Text style={[styles.mobileNavText, activeSection === s.key && styles.mobileNavTextActive]}>
                  {s.key}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Top bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.pageTitle}>{activeSection}</Text>
            {!isMobile && <Text style={styles.pageSubtitle}>Panel de administración · Rassa</Text>}
          </View>
          {!isMobile && (
            <View style={styles.topAvatar}>
              <Text style={styles.topAvatarText}>
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </Text>
            </View>
          )}
        </View>

        {/* ── DASHBOARD ── */}
        {activeSection === "Dashboard" && (
          <>
            {/* Stats grid */}
            <View style={styles.statsGrid}>
              {statsData.map((s) => (
                <View key={s.label} style={[styles.statCard, { borderLeftColor: s.color }]}>
                  <Text style={styles.statIcon}>{s.icon}</Text>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Quick actions */}
            <Text style={styles.sectionTitle}>Acciones rápidas</Text>
            <View style={styles.actionsGrid}>
              {[
                { label: "Gestionar Usuarios", icon: "👥", color: "#6366f1", target: "Usuarios" },
                { label: "Mi Perfil", icon: "👤", color: "#16a34a", target: "Perfil" },
              ].map((a) => (
                <TouchableOpacity
                  key={a.label}
                  style={styles.actionCard}
                  onPress={() => setActiveSection(a.target)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.actionIcon, { backgroundColor: a.color + "18" }]}>
                    <Text style={{ fontSize: 28 }}>{a.icon}</Text>
                  </View>
                  <Text style={styles.actionLabel}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Admin info card */}
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>ℹ️  Módulo M3 — Usuarios y Roles</Text>
              <Text style={styles.infoCardText}>
                Este panel permite gestionar el acceso al sistema y la administración de las personas registradas mediante un esquema de autenticación y control de roles.{"\n\n"}
                • 4 roles disponibles: Administrador, Vendedor, Agricultor, Cliente{"\n"}
                • Búsqueda, cambio de rol y desactivación de cuentas{"\n"}
                • Usuario administrador: admin@rassa.com
              </Text>
            </View>
          </>
        )}

        {/* ── USUARIOS ── */}
        {activeSection === "Usuarios" && (
          <>
            {/* Search bar */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar por nombre o correo..."
                  placeholderTextColor="#94a3b8"
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")} style={styles.clearBtn}>
                    <Text style={styles.clearBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchUsers()}>
                <Text style={styles.refreshIcon}>↻</Text>
              </TouchableOpacity>
            </View>

            {/* Stats mini */}
            <View style={styles.userStats}>
              <Text style={styles.userStatsText}>
                {usersLoading ? "Cargando..." : `${users.length} de ${totalUsers} usuarios`}
              </Text>
            </View>

            {/* Error */}
            {!!usersError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️  {usersError}</Text>
                <TouchableOpacity onPress={() => fetchUsers()} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Loading */}
            {usersLoading && (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={GREEN} />
                <Text style={styles.loadingText}>Cargando usuarios...</Text>
              </View>
            )}

            {/* User list */}
            {!usersLoading && !usersError && (
              <View style={styles.userTable}>
                {/* Header */}
                <View style={styles.userTableHeader}>
                  <Text style={[styles.userTableHeaderCell, { flex: 2 }]}>Usuario</Text>
                  <Text style={styles.userTableHeaderCell}>Rol</Text>
                  <Text style={styles.userTableHeaderCell}>Estado</Text>
                </View>

                {users.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyIcon}>🔍</Text>
                    <Text style={styles.emptyText}>No se encontraron usuarios.</Text>
                  </View>
                ) : (
                  users.map((u, i) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      onRoleChange={handleRoleChange}
                      onToggleActive={handleToggleActive}
                      updatingId={updatingId}
                    />
                  ))
                )}
              </View>
            )}
          </>
        )}

        {/* ── PERFIL ── */}
        {activeSection === "Perfil" && (
          <View style={styles.placeholderWrap}>
            <Text style={styles.placeholderIcon}>👤</Text>
            <Text style={styles.placeholderTitle}>Gestión de Perfil</Text>
            <Text style={styles.placeholderText}>
              Edita tus datos personales y cambia tu contraseña desde la pantalla de perfil.
            </Text>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => navigation?.navigate?.("Profile")}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>Ir a mi Perfil</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },

  /* ── Sidebar ── */
  sidebar: {
    width: 230,
    backgroundColor: "#0f172a",
    paddingTop: 28,
    paddingBottom: 20,
  },
  sidebarHeader: { paddingHorizontal: 20, marginBottom: 28 },
  sidebarLogo: { fontSize: 20, fontWeight: "800", color: "#fff", marginBottom: 8 },
  badge: {
    backgroundColor: GREEN,
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 10,
  },
  sidebarItemActive: {
    backgroundColor: "#1e293b",
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
  },
  sidebarItemIcon: { fontSize: 16, width: 20 },
  sidebarItemText: { color: "#94a3b8", fontSize: 14 },
  sidebarItemTextActive: { color: "#fff", fontWeight: "700" },
  sidebarFooter: { marginTop: "auto" as any, paddingHorizontal: 16, gap: 8 },
  sidebarUserRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  sidebarAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GREEN + "33",
    justifyContent: "center",
    alignItems: "center",
  },
  sidebarAvatarText: { color: GREEN, fontWeight: "800", fontSize: 13 },
  sidebarUserName: { color: "#e2e8f0", fontSize: 13, fontWeight: "600" },
  sidebarUserEmail: { color: "#64748b", fontSize: 11 },
  profileBtn: {
    backgroundColor: "#1e293b",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  profileBtnText: { color: "#94a3b8", fontSize: 13, fontWeight: "600" },
  logoutBtn: {
    backgroundColor: "#7f1d1d22",
    borderWidth: 1,
    borderColor: "#7f1d1d44",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  logoutText: { color: "#f87171", fontSize: 13, fontWeight: "600" },

  /* ── Main ── */
  main: { flex: 1 },
  mainContent: { padding: 20, paddingBottom: 40 },
  mobileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0f172a",
    padding: 16,
    marginBottom: 12,
  },
  mobileLogo: { fontSize: 18, fontWeight: "800", color: "#fff" },
  mobileRole: { fontSize: 11, color: GREEN, fontWeight: "600" },
  mobileNav: { marginBottom: 16 },
  mobileNavItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 6,
  },
  mobileNavItemActive: { backgroundColor: GREEN, borderColor: GREEN },
  mobileNavIcon: { fontSize: 14 },
  mobileNavText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  mobileNavTextActive: { color: "#fff" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  pageTitle: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  pageSubtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
  topAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GREEN,
    justifyContent: "center",
    alignItems: "center",
  },
  topAvatarText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  /* ── Stats ── */
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    minWidth: 130,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 26, fontWeight: "800", color: "#0f172a" },
  statLabel: { fontSize: 12, color: "#64748b", marginTop: 4 },

  /* ── Actions ── */
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginBottom: 12 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  actionCard: {
    flex: 1,
    minWidth: 130,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  actionLabel: { fontSize: 12, fontWeight: "600", color: "#374151", textAlign: "center" },

  /* ── Info card ── */
  infoCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  infoCardTitle: { fontSize: 14, fontWeight: "700", color: GREEN_DARK, marginBottom: 8 },
  infoCardText: { fontSize: 12, color: "#374151", lineHeight: 18 },

  /* ── Users section ── */
  searchRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0f172a",
    outlineStyle: "none",
  } as any,
  clearBtn: { padding: 6 },
  clearBtnText: { color: "#94a3b8", fontSize: 14 },
  refreshBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: GREEN,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  refreshIcon: { color: "#fff", fontSize: 20, fontWeight: "700" },
  userStats: { marginBottom: 12 },
  userStatsText: { color: "#64748b", fontSize: 13 },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  errorText: { flex: 1, color: "#dc2626", fontSize: 13 },
  retryBtn: {
    backgroundColor: "#dc2626",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  loadingWrap: { alignItems: "center", paddingVertical: 40, gap: 12 },
  loadingText: { color: "#64748b", fontSize: 14 },
  userTable: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  userTableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  userTableHeaderCell: { flex: 1, fontWeight: "700", fontSize: 11, color: "#64748b", textTransform: "uppercase" as any },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 6,
  },
  userAvatarWrap: { flex: 2, flexDirection: "row", alignItems: "center", gap: 8 },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  userAvatarText: { fontWeight: "800", fontSize: 12 },
  userInfo: { flex: 1 },
  userName: { fontSize: 12, fontWeight: "700", color: "#0f172a" },
  userEmail: { fontSize: 11, color: "#64748b" },
  roleWrap: { flex: 1, position: "relative" as any },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
    alignSelf: "flex-start",
  },
  rolePillText: { fontSize: 11, fontWeight: "700" },
  rolePillCaret: { fontSize: 9 },
  roleDropdown: {
    position: "absolute" as any,
    top: 34,
    left: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
    minWidth: 120,
    overflow: "hidden",
  },
  roleOption: { paddingHorizontal: 14, paddingVertical: 11 },
  roleOptionActive: { backgroundColor: "#f0fdf4" },
  roleOptionText: { fontSize: 13, color: "#374151" },
  activeWrap: { flex: 1, alignItems: "center", gap: 4 },
  activeLabel: { fontSize: 11, fontWeight: "600" },
  emptyWrap: { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: "#64748b", fontSize: 14 },

  /* ── Profile placeholder ── */
  placeholderWrap: { alignItems: "center", paddingTop: 60, gap: 14 },
  placeholderIcon: { fontSize: 56 },
  placeholderTitle: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  placeholderText: { fontSize: 14, color: "#64748b", textAlign: "center", maxWidth: 400 },
  btn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 28,
    alignItems: "center",
    marginTop: 8,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});


