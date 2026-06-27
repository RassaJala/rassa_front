import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useAuth } from "../../store/AuthContext";

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Credenciales incorrectas. Intenta de nuevo."
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
          {/* Left panel – branding */}
          <View style={styles.brandPanel}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>🌿</Text>
            </View>
            <Text style={styles.brandTitle}>Rassa</Text>
            <Text style={styles.brandSubtitle}>
              Tu mercado agrícola de confianza
            </Text>
            <View style={styles.featureList}>
              {[
                "🛒  Compra directa a agricultores",
                "🌾  Productos frescos y naturales",
                "🚚  Entrega rápida a tu puerta",
                "✅  Calidad garantizada",
              ].map((f, i) => (
                <Text key={i} style={styles.featureItem}>
                  {f}
                </Text>
              ))}
            </View>
          </View>

          {/* Right panel – form */}
          <View style={styles.formPanel}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Iniciar Sesión</Text>
              <Text style={styles.cardSubtitle}>
                Bienvenido de nuevo 👋
              </Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {error}</Text>
                </View>
              ) : null}

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Correo Electrónico</Text>
                <TextInput
                  style={styles.input}
                  placeholder="tu@correo.com"
                  placeholderTextColor="#aaa"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Contraseña</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#aaa"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Iniciar Sesión</Text>
                )}
              </TouchableOpacity>

              <View style={styles.registerRow}>
                <Text style={styles.registerText}>¿No tienes cuenta? </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Register")}
                >
                  <Text style={styles.registerLink}>Regístrate aquí</Text>
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
    minHeight: "100%",
  },
  // Brand panel
  brandPanel: {
    flex: 1,
    minWidth: 300,
    backgroundColor: GREEN,
    padding: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoText: { fontSize: 40 },
  brandTitle: {
    fontSize: 42,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
  },
  brandSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 40,
    textAlign: "center",
  },
  featureList: { alignSelf: "stretch" },
  featureItem: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    marginBottom: 12,
    paddingLeft: 8,
  },
  // Form panel
  formPanel: {
    flex: 1,
    minWidth: 300,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: "#dc2626", fontSize: 14, textAlign: "center" },
  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#d1fae5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
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
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  registerText: { color: "#666", fontSize: 14 },
  registerLink: { color: GREEN_DARK, fontSize: 14, fontWeight: "700" },
});
