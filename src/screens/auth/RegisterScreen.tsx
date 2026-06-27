import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useAuth } from "../../store/AuthContext";

// Admin role is NOT offered in public registration
const ROLES = [
  { value: "buyer", label: "Cliente", emoji: "🛒", desc: "Compra productos frescos" },
  { value: "farmer", label: "Agricultor", emoji: "🌾", desc: "Vende tus cosechas" },
  { value: "seller", label: "Vendedor", emoji: "🏪", desc: "Gestiona tu tienda" },
];

export default function RegisterScreen({ navigation }: any) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    password: "",
    confirmPassword: "",
    role: "buyer",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const update = (field: string, val: string) =>
    setForm((f) => ({ ...f, [field]: val }));

  const handleRegister = async () => {
    if (
      !form.first_name ||
      !form.last_name ||
      !form.email ||
      !form.password ||
      !form.phone_number
    ) {
      setError("Por favor completa todos los campos.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone_number: form.phone_number,
        role: form.role as any,
        password: form.password,
      });
    } catch (err: any) {
      setError(
        err.response?.data?.email?.[0] ||
          err.response?.data?.detail ||
          "Error al registrarse. Intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* ── Left brand panel ── */}
          <View style={styles.brandPanel}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>🌿</Text>
            </View>
            <Text style={styles.brandTitle}>Rassa</Text>
            <Text style={styles.brandSubtitle}>Únete a nuestra comunidad agrícola</Text>
            <View style={styles.rolesList}>
              {ROLES.map((r) => (
                <View key={r.value} style={styles.roleInfo}>
                  <Text style={styles.roleEmoji}>{r.emoji}</Text>
                  <View>
                    <Text style={styles.roleName}>{r.label}</Text>
                    <Text style={styles.roleDesc}>{r.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.divider} />
            <Text style={styles.brandNote}>
              🔒  Tus datos están protegidos con cifrado de extremo a extremo.
            </Text>
          </View>

          {/* ── Form panel ── */}
          <View style={styles.formPanel}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Crear Cuenta</Text>
              <Text style={styles.cardSubtitle}>Regístrate y empieza hoy 🚀</Text>

              {!!error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️  {error}</Text>
                </View>
              )}

              {/* Role selector */}
              <Text style={styles.label}>Tipo de usuario</Text>
              <View style={styles.roleGrid}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[
                      styles.roleCard,
                      form.role === r.value && styles.roleCardActive,
                    ]}
                    onPress={() => update("role", r.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.roleCardEmoji}>{r.emoji}</Text>
                    <Text
                      style={[
                        styles.roleCardLabel,
                        form.role === r.value && styles.roleCardLabelActive,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Name row */}
              <View style={styles.row}>
                <View style={[styles.fieldGroup, styles.flex]}>
                  <Text style={styles.label}>Nombre</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Juan"
                    placeholderTextColor="#b0bec5"
                    value={form.first_name}
                    onChangeText={(v) => update("first_name", v)}
                  />
                </View>
                <View style={[styles.fieldGroup, styles.flex]}>
                  <Text style={styles.label}>Apellido</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Pérez"
                    placeholderTextColor="#b0bec5"
                    value={form.last_name}
                    onChangeText={(v) => update("last_name", v)}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Correo Electrónico</Text>
                <TextInput
                  style={styles.input}
                  placeholder="tu@correo.com"
                  placeholderTextColor="#b0bec5"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={form.email}
                  onChangeText={(v) => update("email", v)}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Teléfono</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+52 123 456 7890"
                  placeholderTextColor="#b0bec5"
                  keyboardType="phone-pad"
                  value={form.phone_number}
                  onChangeText={(v) => update("phone_number", v)}
                />
              </View>

              {/* Password row */}
              <View style={styles.row}>
                <View style={[styles.fieldGroup, styles.flex]}>
                  <Text style={styles.label}>Contraseña</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={[styles.input, styles.inputFlex]}
                      placeholder="••••••••"
                      placeholderTextColor="#b0bec5"
                      secureTextEntry={!showPassword}
                      value={form.password}
                      onChangeText={(v) => update("password", v)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword((v) => !v)}
                      style={styles.eyeBtn}
                    >
                      <Text>{showPassword ? "🙈" : "👁️"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={[styles.fieldGroup, styles.flex]}>
                  <Text style={styles.label}>Confirmar</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={[styles.input, styles.inputFlex]}
                      placeholder="••••••••"
                      placeholderTextColor="#b0bec5"
                      secureTextEntry={!showConfirm}
                      value={form.confirmPassword}
                      onChangeText={(v) => update("confirmPassword", v)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirm((v) => !v)}
                      style={styles.eyeBtn}
                    >
                      <Text>{showConfirm ? "🙈" : "👁️"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Crear Cuenta</Text>
                )}
              </TouchableOpacity>

              <View style={styles.loginRow}>
                <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
                <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                  <Text style={styles.loginLink}>Inicia sesión</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const GREEN = "#16a34a";
const GREEN_DARK = "#15803d";
const GREEN_BG = "#f0fdf4";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GREEN_BG },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    minHeight: "100%" as any,
  },
  brandPanel: {
    flex: 1,
    minWidth: 300,
    backgroundColor: GREEN,
    padding: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  logoText: { fontSize: 38 },
  brandTitle: {
    fontSize: 40,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.82)",
    marginBottom: 32,
    textAlign: "center",
  },
  rolesList: { alignSelf: "stretch", gap: 14, marginBottom: 24 },
  roleInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  roleEmoji: { fontSize: 26, width: 36 },
  roleName: { color: "#fff", fontWeight: "700", fontSize: 15 },
  roleDesc: { color: "rgba(255,255,255,0.72)", fontSize: 13 },
  divider: {
    alignSelf: "stretch",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: 16,
  },
  brandNote: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    textAlign: "center",
  },
  formPanel: {
    flex: 1,
    minWidth: 320,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: GREEN_BG,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cardSubtitle: { fontSize: 14, color: "#6b7280", marginBottom: 20 },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1.5,
    borderColor: "#fca5a5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: "#dc2626", fontSize: 13, textAlign: "center" },
  roleGrid: { flexDirection: "row", gap: 8, marginBottom: 20 },
  roleCard: {
    flex: 1,
    minWidth: 80,
    borderWidth: 2,
    borderColor: "#d1fae5",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    backgroundColor: "#f9fffe",
  },
  roleCardActive: { borderColor: GREEN, backgroundColor: "#dcfce7" },
  roleCardEmoji: { fontSize: 22, marginBottom: 4 },
  roleCardLabel: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  roleCardLabelActive: { color: GREEN_DARK },
  row: { flexDirection: "row", gap: 12 },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: "#d1fae5",
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
    borderColor: "#d1fae5",
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
  eyeBtn: { paddingLeft: 8 },
  btn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  btnDisabled: { backgroundColor: "#86efac", shadowOpacity: 0 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  loginRow: { flexDirection: "row", justifyContent: "center", marginTop: 18 },
  loginText: { color: "#6b7280", fontSize: 14 },
  loginLink: { color: GREEN_DARK, fontSize: 14, fontWeight: "700" },
});
