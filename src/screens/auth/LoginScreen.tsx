import React, { useState, useRef } from "react";
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
  Animated,
  useWindowDimensions,
} from "react-native";
import { useAuth } from "~/store/AuthContext";

const GREEN = "#16a34a";
const GREEN_DARK = "#15803d";
const GREEN_LIGHT = "#dcfce7";
const GREEN_BG = "#f0fdf4";
const GREEN_PANEL = "#16a34a";

function AnimatedInput({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  rightElement,
}: any) {
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(anim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };
  const handleBlur = () => {
    setFocused(false);
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#d1fae5", GREEN],
  });

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, focused && styles.labelFocused]}>
        {label}
      </Text>
      <Animated.View style={[styles.inputWrapper, { borderColor }]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#b0bec5"
          autoCapitalize={autoCapitalize ?? "none"}
          keyboardType={keyboardType}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {rightElement}
      </Animated.View>
    </View>
  );
}

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      await login(email, password, true);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          "Credenciales incorrectas. Intenta de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Mobile layout: single column with small logo
  if (isMobile) {
    return (
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.mobileScroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Mobile logo header */}
          <View style={styles.mobileLogoHeader}>
            <View style={styles.mobileLogoCircle}>
              <Text style={styles.mobileLogoText}>🌿</Text>
            </View>
            <Text style={styles.mobileBrandTitle}>Rassa</Text>
          </View>

          {/* Login card */}
          <View style={styles.mobileCard}>
            <Text style={styles.cardTitle}>Iniciar Sesión</Text>
            <Text style={styles.cardSubtitle}>Bienvenido de nuevo 👋</Text>

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            )}

            <AnimatedInput
              label="Correo Electrónico"
              placeholder="tu@correo.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <AnimatedInput
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              rightElement={
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.eyeIcon}>
                    {showPassword ? "🙈" : "👁️"}
                  </Text>
                </TouchableOpacity>
              }
            />

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>¿No tienes cuenta? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text style={styles.registerLink}>Regístrate aquí</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Desktop layout: two columns filling viewport
  return (
    <View style={styles.root}>
      <View style={styles.desktopContainer}>
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
              { icon: "🛒", text: "Compra directa a agricultores" },
              { icon: "🌾", text: "Productos frescos y naturales" },
              { icon: "🚚", text: "Entrega rápida a tu puerta" },
              { icon: "✅", text: "Calidad garantizada" },
            ].map((f) => (
              <View key={f.icon} style={styles.featureItem}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Right panel – form */}
        <View style={styles.formPanel}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Iniciar Sesión</Text>
            <Text style={styles.cardSubtitle}>Bienvenido de nuevo 👋</Text>

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            )}

            <AnimatedInput
              label="Correo Electrónico"
              placeholder="tu@correo.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <AnimatedInput
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              rightElement={
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.eyeIcon}>
                    {showPassword ? "🙈" : "👁️"}
                  </Text>
                </TouchableOpacity>
              }
            />

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>¿No tienes cuenta? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text style={styles.registerLink}>Regístrate aquí</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GREEN_BG },

  /* ── Desktop ── */
  desktopContainer: {
    flex: 1,
    flexDirection: "row",
  },
  brandPanel: {
    flex: 1,
    backgroundColor: GREEN_PANEL,
    padding: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  logoText: { fontSize: 42 },
  brandTitle: {
    fontSize: 44,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.82)",
    marginBottom: 44,
    textAlign: "center",
  },
  featureList: { alignSelf: "stretch", gap: 14 },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureIcon: { fontSize: 18, width: 28 },
  featureText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
  },
  formPanel: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: GREEN_BG,
  },

  /* ── Mobile ── */
  mobileScroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  mobileLogoHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  mobileLogoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: GREEN_PANEL,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  mobileLogoText: { fontSize: 32 },
  mobileBrandTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: GREEN_PANEL,
  },

  /* ── Card (shared) ── */
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  mobileCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 15,
    color: "#6b7280",
    marginBottom: 24,
  },

  /* ── Error ── */
  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1.5,
    borderColor: "#fca5a5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  errorText: { color: "#dc2626", fontSize: 13.5, textAlign: "center" },

  /* ── Field ── */
  fieldGroup: { marginBottom: 18 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 7,
  },
  labelFocused: { color: GREEN },
  inputWrapper: {
    borderWidth: 1.5,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fffe",
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: "#111827",
    outlineStyle: "none",
  } as any,
  eyeBtn: { paddingLeft: 8 },
  eyeIcon: { fontSize: 18 },

  /* ── Button ── */
  btn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 6,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  btnDisabled: { backgroundColor: "#86efac", shadowOpacity: 0 },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  /* ── Register link ── */
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
  },
  registerText: { color: "#6b7280", fontSize: 14 },
  registerLink: { color: GREEN_DARK, fontSize: 14, fontWeight: "700" },
});
