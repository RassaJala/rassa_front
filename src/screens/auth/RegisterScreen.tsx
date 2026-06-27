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

const ROLES = [
  { value: "buyer", label: "Cliente", emoji: "🛒", desc: "Compra productos frescos" },
  { value: "farmer", label: "Agricultor", emoji: "🌾", desc: "Vende tus cosechas" },
  { value: "seller", label: "Vendedor", emoji: "🏪", desc: "Gestiona tu tienda" },
  { value: "admin", label: "Admin", emoji: "⚙️", desc: "Administra la plataforma" },
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
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Left brand panel */}
          <View style={styles.brandPanel}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>🌿</Text>
            </View>
            <Text style={styles.brandTitle}>Rassa</Text>
            <Text style={styles.brandSubtitle}>Únete a nuestra comunidad agrícola</Text>
            <View style={styles.roles}>
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
          </View>

          {/* Form panel */}
          <View style={styles.formPanel}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Crear Cuenta</Text>
              <Text style={styles.cardSubtitle}>Regístrate y empieza hoy 🚀</Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {error}</Text>
                </View>
              ) : null}

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
                    placeholderTextColor="#aaa"
                    value={form.first_name}
                    onChangeText={(v) => update("first_name", v)}
                  />
                </View>
                <View style={styles.spacer} />
                <View style={[styles.fieldGroup, styles.flex]}>
                  <Text style={styles.label}>Apellido</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Pérez"
                    placeholderTextColor="#aaa"
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
                  placeholderTextColor="#aaa"
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
                  placeholderTextColor="#aaa"
                  keyboardType="phone-pad"
                  value={form.phone_number}
                  onChangeText={(v) => update("phone_number", v)}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.fieldGroup, styles.flex]}>
                  <Text style={styles.label}>Contraseña</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#aaa"
                    secureTextEntry
                    value={form.password}
                    onChangeText={(v) => update("password", v)}
                  />
                </View>
                <View style={styles.spacer} />
                <View style={[styles.fieldGroup, styles.flex]}>
                  <Text style={styles.label}>Confirmar Contraseña</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#aaa"
                    secureTextEntry
                    value={form.confirmPassword}
                    onChangeText={(v) => update("confirmPassword", v)}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleRegister}
                disabled={loading}
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
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  logoText: { fontSize: 36 },
  brandTitle: { fontSize: 38, fontWeight: "800", color: "#fff", marginBottom: 6 },
  brandSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 32,
    textAlign: "center",
  },
  roles: { alignSelf: "stretch" },
  roleInfo: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
  roleEmoji: { fontSize: 28 },
  roleName: { color: "#fff", fontWeight: "700", fontSize: 15 },
  roleDesc: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  formPanel: {
    flex: 1,
    minWidth: 320,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: { fontSize: 26, fontWeight: "800", color: "#1a1a1a", marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: "#666", marginBottom: 20 },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: "#dc2626", fontSize: 13, textAlign: "center" },
  roleGrid: { flexDirection: "row", gap: 8, marginBottom: 20, flexWrap: "wrap" },
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
  roleCardLabel: { fontSize: 12, fontWeight: "600", color: "#666" },
  roleCardLabelActive: { color: GREEN_DARK },
  row: { flexDirection: "row", gap: 12 },
  spacer: { width: 12 },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 5 },
  input: {
    borderWidth: 1.5,
    borderColor: "#d1fae5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#1a1a1a",
    backgroundColor: "#f9fffe",
    outlineStyle: "none",
  } as any,
  btn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  btnDisabled: { backgroundColor: "#86efac" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  loginRow: { flexDirection: "row", justifyContent: "center", marginTop: 18 },
  loginText: { color: "#666", fontSize: 14 },
  loginLink: { color: GREEN_DARK, fontSize: 14, fontWeight: "700" },
});
