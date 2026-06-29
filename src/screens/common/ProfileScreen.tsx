import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useAuth } from "../../store/AuthContext";
import { authService } from "../../services/authService";

const GREEN = "#16a34a";
const GREEN_DARK = "#15803d";
const GREEN_LIGHT = "#dcfce7";
const GREEN_BG = "#f0fdf4";

const ROLE_LABELS: Record<string, string> = {
  admin: "⚙️ Administrador",
  seller: "🏪 Vendedor",
  farmer: "🌾 Agricultor",
  buyer: "🛒 Cliente",
};

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  // ── Profile form state ──
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    email: user?.email ?? "",
    phone_number: user?.phone_number ?? "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");

  // ── Password form state ──
  const [pwForm, setPwForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const updateProfile = (f: string, v: string) =>
    setProfileForm((prev) => ({ ...prev, [f]: v }));
  const updatePw = (f: string, v: string) =>
    setPwForm((prev) => ({ ...prev, [f]: v }));

  // ── Save profile ──
  const handleSaveProfile = async () => {
    if (!profileForm.first_name || !profileForm.last_name || !profileForm.email) {
      setProfileError("Nombre, apellido y correo son obligatorios.");
      return;
    }
    setProfileLoading(true);
    setProfileError("");
    setProfileSuccess(false);
    try {
      await authService.updateProfile({
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        email: profileForm.email,
        phone_number: profileForm.phone_number,
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(
        err.response?.data?.detail || "Error al actualizar el perfil."
      );
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Change password ──
  const handleChangePassword = async () => {
    if (!pwForm.old_password || !pwForm.new_password || !pwForm.confirm_password) {
      setPwError("Completa todos los campos de contraseña.");
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwError("Las contraseñas nuevas no coinciden.");
      return;
    }
    if (pwForm.new_password.length < 8) {
      setPwError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setPwLoading(true);
    setPwError("");
    setPwSuccess(false);
    try {
      await authService.changePassword({
        old_password: pwForm.old_password,
        new_password: pwForm.new_password,
      });
      setPwSuccess(true);
      setPwForm({ old_password: "", new_password: "", confirm_password: "" });
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err: any) {
      setPwError(
        err.response?.data?.old_password?.[0] ||
          err.response?.data?.detail ||
          "Error al cambiar la contraseña."
      );
    } finally {
      setPwLoading(false);
    }
  };

  // ── Logout confirm ──
  const handleLogout = () => {
    if (Platform.OS === "web") {
      if (window.confirm("¿Seguro que quieres cerrar sesión?")) logout();
    } else {
      Alert.alert("Cerrar sesión", "¿Seguro que quieres cerrar sesión?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Cerrar sesión", style: "destructive", onPress: logout },
      ]);
    }
  };

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* ── User badge ── */}
        <View style={styles.profileHero}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </Text>
          </View>
          <Text style={styles.heroName}>
            {user?.first_name} {user?.last_name}
          </Text>
          <Text style={styles.heroEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {ROLE_LABELS[user?.role ?? "buyer"]}
            </Text>
          </View>
        </View>

        {/* ── Edit profile card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📝  Datos Personales</Text>

          {!!profileError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️  {profileError}</Text>
            </View>
          )}
          {profileSuccess && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>✅  Perfil actualizado correctamente.</Text>
            </View>
          )}

          <View style={[styles.row, isMobile && styles.rowMobile]}>
            <View style={[styles.fieldGroup, styles.flex]}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={profileForm.first_name}
                onChangeText={(v) => updateProfile("first_name", v)}
                placeholder="Juan"
                placeholderTextColor="#b0bec5"
              />
            </View>
            <View style={[styles.fieldGroup, styles.flex]}>
              <Text style={styles.label}>Apellido</Text>
              <TextInput
                style={styles.input}
                value={profileForm.last_name}
                onChangeText={(v) => updateProfile("last_name", v)}
                placeholder="Pérez"
                placeholderTextColor="#b0bec5"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Correo Electrónico</Text>
            <TextInput
              style={styles.input}
              value={profileForm.email}
              onChangeText={(v) => updateProfile("email", v)}
              placeholder="tu@correo.com"
              placeholderTextColor="#b0bec5"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              style={styles.input}
              value={profileForm.phone_number}
              onChangeText={(v) => updateProfile("phone_number", v)}
              placeholder="+52 123 456 7890"
              placeholderTextColor="#b0bec5"
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, profileLoading && styles.btnDisabled]}
            onPress={handleSaveProfile}
            disabled={profileLoading}
            activeOpacity={0.85}
          >
            {profileLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Guardar Cambios</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Change password card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔒  Cambiar Contraseña</Text>

          {!!pwError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️  {pwError}</Text>
            </View>
          )}
          {pwSuccess && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>✅  Contraseña cambiada correctamente.</Text>
            </View>
          )}

          {/* Old password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Contraseña actual</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={pwForm.old_password}
                onChangeText={(v) => updatePw("old_password", v)}
                placeholder="••••••••"
                placeholderTextColor="#b0bec5"
                secureTextEntry={!showOld}
              />
              <TouchableOpacity onPress={() => setShowOld((v) => !v)} style={styles.eyeBtn}>
                <Text>{showOld ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.row, isMobile && styles.rowMobile]}>
            <View style={[styles.fieldGroup, styles.flex]}>
              <Text style={styles.label}>Nueva contraseña</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  value={pwForm.new_password}
                  onChangeText={(v) => updatePw("new_password", v)}
                  placeholder="••••••••"
                  placeholderTextColor="#b0bec5"
                  secureTextEntry={!showNew}
                />
                <TouchableOpacity onPress={() => setShowNew((v) => !v)} style={styles.eyeBtn}>
                  <Text>{showNew ? "🙈" : "👁️"}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={[styles.fieldGroup, styles.flex]}>
              <Text style={styles.label}>Confirmar nueva</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  value={pwForm.confirm_password}
                  onChangeText={(v) => updatePw("confirm_password", v)}
                  placeholder="••••••••"
                  placeholderTextColor="#b0bec5"
                  secureTextEntry={!showConfirm}
                />
                <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} style={styles.eyeBtn}>
                  <Text>{showConfirm ? "🙈" : "👁️"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary, pwLoading && styles.btnDisabled]}
            onPress={handleChangePassword}
            disabled={pwLoading}
            activeOpacity={0.85}
          >
            {pwLoading ? (
              <ActivityIndicator color={GREEN} />
            ) : (
              <Text style={styles.btnSecondaryText}>Cambiar Contraseña</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>🚪  Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },

  /* ── Header ── */
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  backBtn: { padding: 8, marginRight: 8 },
  backIcon: { fontSize: 22, color: GREEN },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: "#111827" },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: GREEN,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  /* ── Content ── */
  content: { padding: 24, paddingBottom: 48, gap: 20 },

  /* ── Hero ── */
  profileHero: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 5,
  },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: GREEN,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  heroAvatarText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  heroName: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 4 },
  heroEmail: { fontSize: 14, color: "#6b7280", marginBottom: 12 },
  roleBadge: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  roleBadgeText: { color: GREEN_DARK, fontSize: 13, fontWeight: "700" },

  /* ── Card ── */
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 5,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 18 },

  /* ── Feedback ── */
  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1.5,
    borderColor: "#fca5a5",
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  errorText: { color: "#dc2626", fontSize: 13 },
  successBox: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1.5,
    borderColor: "#86efac",
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  successText: { color: GREEN_DARK, fontSize: 13 },

  /* ── Fields ── */
  flex: { flex: 1 },
  row: { flexDirection: "row", gap: 12 },
  rowMobile: { flexDirection: "column" },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#f9fffe",
    outlineStyle: "none",
  } as any,
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    backgroundColor: "#f9fffe",
    paddingHorizontal: 14,
  },
  inputFlex: {
    flex: 1,
    borderWidth: 0,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
  },
  eyeBtn: { paddingLeft: 8, paddingVertical: 4 },

  /* ── Buttons ── */
  btn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 6,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  btnDisabled: { backgroundColor: "#86efac", shadowOpacity: 0 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  btnSecondary: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: GREEN,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnSecondaryText: { color: GREEN, fontSize: 15, fontWeight: "700" },
  logoutBtn: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fca5a5",
  },
  logoutText: { color: "#dc2626", fontSize: 15, fontWeight: "700" },
});


