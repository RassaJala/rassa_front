import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import { getLoginErrorMessage } from '@/utils/authError';

// ── Palette ────────────────────────────────────────────────────────────

const light = {
  skyTop: '#C4D6B8',
  skyMid: '#D6E3CA',
  skyBot: '#E8EED8',
  hill1: '#3A6D56',
  hill2: '#4D8A63',
  hill3: '#6AA366',
  tree: '#2A4D34',
  sun: '#F2A900',
  bird: 'rgba(55,65,55,0.35)',
  bg: '#F5F7F0',
  surface: '#FFFFFF',
  cardBg: 'rgba(255,255,255,0.92)',
  fg: '#2D3328',
  muted: '#5E6B5E',
  border: '#D6DAD4',
  brand: '#24563C',
  coral: '#DE393A',
  inputBg: '#F5F7F0',
};

const dark = {
  skyTop: '#2A3D4A',
  skyMid: '#354A55',
  skyBot: '#3D5560',
  hill1: '#2D4A3A',
  hill2: '#3A5C48',
  hill3: '#4A6E56',
  tree: '#2D4A3A',
  sun: '#D4E8C8',
  bird: 'rgba(180,200,190,0.35)',
  bg: '#1A211B',
  surface: '#263028',
  cardBg: 'rgba(30,40,33,0.95)',
  fg: '#E8EAE4',
  muted: '#9DA89D',
  border: '#3D4A40',
  brand: '#4A8A63',
  coral: '#E84A4A',
  inputBg: '#263028',
};

// ── Validation ─────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Sky bands ──────────────────────────────────────────────────────────

function Sky({ c }: { c: typeof light }) {
  return (
    <>
      <View style={{ flex: 3, backgroundColor: c.skyTop }} />
      <View style={{ flex: 1, backgroundColor: c.skyMid }} />
      <View style={{ flex: 2, backgroundColor: c.skyBot }} />
    </>
  );
}

// ── Tree ───────────────────────────────────────────────────────────────

function Tree({ left, bottom, bw, bh, color }: { left: number; bottom: number; bw: number; bh: number; color: string }) {
  return (
    <View
      style={{
        position: 'absolute', bottom, left,
        width: 0, height: 0,
        borderLeftWidth: bw, borderRightWidth: bw, borderBottomWidth: bh,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderBottomColor: color,
      }}
    />
  );
}

// ── Scene ──────────────────────────────────────────────────────────────

function Scene({ isDark }: { isDark: boolean }) {
  const fade = useRef(new Animated.Value(0)).current;
  const c = isDark ? dark : light;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [fade]);

  return (
    <Animated.View style={{ opacity: fade, height: 310, position: 'relative', overflow: 'hidden' }}>
      <Sky c={c} />

      {/* Celestial */}
      <View
        style={{
          position: 'absolute', top: 20, right: 30,
          width: 52, height: 52, borderRadius: 26,
          backgroundColor: c.sun,
          shadowColor: c.sun, shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.35, shadowRadius: 28, elevation: 6,
        }}
      />

      {/* Birds */}
      <Text style={{ position: 'absolute', top: 40, left: 80, fontSize: 14, color: c.bird }}>⌣</Text>
      <Text style={{ position: 'absolute', top: 55, left: 104, fontSize: 10, color: c.bird }}>⌣</Text>

      {/* Trees — 3 big, above the extended hills */}
      <Tree left={50} bottom={185} bw={20} bh={68} color={c.tree} />
      <Tree left={140} bottom={155} bw={18} bh={60} color={c.tree} />
      <Tree left={300} bottom={165} bw={22} bh={74} color={c.tree} />

      {/* Hills — extend well below, card sits on top */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 280 }}>
        <View
          style={{
            position: 'absolute', bottom: 0, left: -50,
            width: 350, height: 220,
            borderTopLeftRadius: 350, borderTopRightRadius: 350,
            backgroundColor: c.hill1,
          }}
        />
        <View
          style={{
            position: 'absolute', bottom: 0, left: 80,
            width: 400, height: 190,
            borderTopLeftRadius: 400, borderTopRightRadius: 400,
            backgroundColor: c.hill2,
          }}
        />
        <View
          style={{
            position: 'absolute', bottom: 0, left: 220,
            width: 240, height: 160,
            borderTopLeftRadius: 300, borderTopRightRadius: 300,
            backgroundColor: c.hill3,
          }}
        />
      </View>

      {/* Brand pill */}
      <View
        style={{
          position: 'absolute', top: 80, alignSelf: 'center',
          flexDirection: 'row', alignItems: 'center',
          paddingVertical: 8, paddingHorizontal: 18,
          borderRadius: 99, borderWidth: 1,
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderColor: 'rgba(255,255,255,0.25)',
        }}
      >
        <MaterialCommunityIcons name="sprout" size={20} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginLeft: 8, letterSpacing: 1 }}>RASSA-JALA</Text>
      </View>
    </Animated.View>
  );
}

// ── MD3 Field ──────────────────────────────────────────────────────────

function Md3Field({
  icon, label, value, onChangeText, secureTextEntry,
  autoComplete, keyboardType, isDark, showPwToggle, showPw, onTogglePw, error, autoCapitalize,
}: {
  icon: string;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean | undefined;
  autoComplete?: 'email' | 'password' | undefined;
  keyboardType?: 'email-address' | undefined;
  isDark: boolean;
  showPwToggle?: boolean | undefined;
  showPw?: boolean | undefined;
  onTogglePw?: (() => void) | undefined;
  error?: string | null | undefined;
  autoCapitalize?: 'none' | undefined;
}) {
  const [focused, setFocused] = useState(false);
  const float = focused || value.length > 0;
  const c = isDark ? dark : light;

  return (
    <View>
      <View
        style={{
          borderRadius: 6, position: 'relative', justifyContent: 'center', minHeight: 64,
          borderWidth: focused ? 2 : 1.5,
          borderColor: error ? c.coral : focused ? c.brand : isDark ? dark.border : light.border,
          backgroundColor: isDark ? dark.inputBg : light.inputBg,
        }}
      >
        <View style={{ position: 'absolute', left: 16, top: 22, zIndex: 2 }}>
          <MaterialCommunityIcons name={icon as any} size={22} color={error ? c.coral : isDark ? dark.muted : light.muted} />
        </View>

        <Text
          style={{
            position: 'absolute', left: 50, top: float ? 8 : 22,
            fontSize: float ? 14 : 18,
            color: error ? c.coral : float ? c.brand : isDark ? dark.muted : light.muted,
            fontWeight: '400', zIndex: 2,
          }}
        >
          {label}
        </Text>

        <TextInput
          style={{
            fontSize: 20, margin: 0, zIndex: 1, backgroundColor: 'transparent',
            color: isDark ? dark.fg : light.fg,
            paddingLeft: 50, paddingRight: showPwToggle ? 56 : 20,
            paddingTop: float ? 24 : 16, paddingBottom: float ? 8 : 16,
          }}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secureTextEntry}
          autoComplete={autoComplete}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          placeholder=""
        />

        {showPwToggle ? (
          <Pressable onPress={onTogglePw} style={{ position: 'absolute', right: 4, top: 12, padding: 10, zIndex: 2 }} hitSlop={4}>
            <MaterialCommunityIcons name={showPw ? 'eye-off' : 'eye'} size={24} color={isDark ? dark.muted : light.muted} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={{ fontSize: 14, color: c.coral, paddingHorizontal: 16, paddingTop: 4, letterSpacing: 0.02 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

// ── LoginScreen ────────────────────────────────────────────────────────

export default function LoginScreen(): React.JSX.Element {
  const { login } = useAuth();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const c = isDark ? dark : light;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(cardY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [cardOpacity, cardY]);

  const handleLogin = useCallback(async () => {
    if (loading) return;
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) errs.email = 'Ingresá tu correo electrónico';
    else if (!EMAIL_RE.test(email.trim())) errs.email = 'El correo no tiene formato válido';
    if (!password) errs.password = 'Ingresá tu contraseña';
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setError(null);
    setLoading(true);
    try { await login(email.trim(), password); }
    catch (e) { setError(getLoginErrorMessage(e)); }
    finally { setLoading(false); }
  }, [email, password, loading, login]);

  const clearErr = (f: 'email' | 'password') => setFieldErrors((p) => { const n = { ...p }; delete n[f]; return n; });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ height: StatusBar.currentHeight ?? 28 }} />

        <Scene isDark={isDark} />

        {/* Wave transition — svg-like, bg color for smooth transition */}
        <View style={{ height: 48, overflow: 'hidden', marginTop: -4 }}>
          <View
            style={{
              height: 80,
              borderTopLeftRadius: 300,
              borderTopRightRadius: 100,
              backgroundColor: isDark ? dark.bg : light.bg,
              marginHorizontal: -60,
            }}
          />
        </View>

        {/* Card */}
        <Animated.View
          style={{
            opacity: cardOpacity,
            transform: [{ translateY: cardY }],
            marginHorizontal: 14,
            borderRadius: 24,
            backgroundColor: isDark ? dark.cardBg : light.cardBg,
            paddingVertical: 24,
            paddingHorizontal: 20,
            ...Platform.select({
              ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 14 },
              android: { elevation: 3 },
            }),
          }}
        >
          <Text style={{ fontSize: 26, fontWeight: '600', color: isDark ? dark.fg : light.fg, marginBottom: 4 }}>
            Bienvenido
          </Text>
          <Text style={{ fontSize: 16, color: isDark ? dark.muted : light.muted, marginBottom: 24 }}>
            Del campo a tu mesa
          </Text>

          <View style={{ marginBottom: 16 }}>
            <Md3Field
              icon="email-outline" label="Correo electrónico"
              value={email} onChangeText={(v) => { setEmail(v); clearErr('email'); }}
              autoComplete="email" keyboardType="email-address" autoCapitalize="none"
              isDark={isDark} error={fieldErrors.email}
            />
          </View>

          <View style={{ marginBottom: 8 }}>
            <Md3Field
              icon="lock-outline" label="Contraseña"
              value={password} onChangeText={(v) => { setPassword(v); clearErr('password'); }}
              secureTextEntry={!showPw} autoComplete="password"
              isDark={isDark} showPwToggle showPw={showPw} onTogglePw={() => setShowPw((p) => !p)}
              error={fieldErrors.password}
            />
          </View>

          {error ? <Text style={{ color: c.coral, fontSize: 15, textAlign: 'center', marginTop: 12, marginBottom: 8 }}>{error}</Text> : null}

          <View style={{ marginTop: 16 }}>
            <Pressable
              onPress={() => void handleLogin()}
              disabled={loading}
              style={{
                height: 56,
                borderRadius: 28,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: c.coral,
                opacity: loading ? 0.5 : 1,
                borderWidth: 2,
                borderColor: '#c03232',
                ...Platform.select({
                  ios: {
                    shadowColor: '#8B1A1A',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                  },
                  android: { elevation: 6 },
                }),
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700', letterSpacing: 0.5 }}>
                {loading ? 'INGRESANDO…' : 'INICIAR SESIÓN'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
