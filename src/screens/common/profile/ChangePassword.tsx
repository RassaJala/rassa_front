import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import axios from 'axios';

import { parseAuthError, useAuth } from '@/store/AuthContext';

import FeedbackBanner from './FeedbackBanner';
import { useProfileColors } from './profileColors';

interface ChangePasswordProps {
  readonly onPasswordChanged: () => void;
}

const MIN_PASSWORD_LENGTH = 8;
const SUCCESS_TIMEOUT_MS = 1500;

function validatePasswordChange(
  oldPass: string,
  newPass: string,
  confirmPass: string,
): string | null {
  if (!oldPass || !newPass || !confirmPass) {
    return 'Por favor, completa todos los campos.';
  }

  if (newPass.length < MIN_PASSWORD_LENGTH) {
    return `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  if (newPass !== confirmPass) {
    return 'La confirmación de la contraseña no coincide.';
  }

  if (oldPass === newPass) {
    return 'La nueva contraseña debe ser diferente a la actual.';
  }

  return null;
}

export default function ChangePassword({
  onPasswordChanged,
}: ChangePasswordProps): React.JSX.Element {
  const c = useProfileColors();
  const { changePassword } = useAuth();
  const netInfo = useNetInfo();

  // ── Local state ──────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const logoutTimeoutRef = useRef<ReturnType<
    typeof globalThis.setTimeout
  > | null>(null);

  useEffect(() => {
    // Cleanup logout timeout on unmount to prevent unexpected logout
    return () => {
      if (logoutTimeoutRef.current !== null) {
        globalThis.clearTimeout(logoutTimeoutRef.current);
        logoutTimeoutRef.current = null;
      }
    };
  }, []);

  // ── Handlers ─────────────────────────────────────────
  async function handleChangePassword() {
    if (isChanging) return;
    setPasswordSuccess(null);
    setPasswordError(null);

    if (netInfo.isConnected === false) {
      setPasswordError('Sin conexión a Internet.');
      return;
    }

    const validationError = validatePasswordChange(
      oldPassword,
      newPassword,
      confirmPassword,
    );
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    setIsChanging(true);
    try {
      await changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });

      setPasswordSuccess(
        'Contraseña cambiada exitosamente. Cerrando sesión...',
      );
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Close form after a brief delay so user sees success
      logoutTimeoutRef.current = globalThis.setTimeout(() => {
        logoutTimeoutRef.current = null;
        setShowForm(false);
        setPasswordSuccess(null);
        setPasswordError(null);
        onPasswordChanged();
      }, SUCCESS_TIMEOUT_MS);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setPasswordError(parseAuthError(error, 'changePassword'));
      } else if (error instanceof Error) {
        setPasswordError(error.message);
      } else {
        setPasswordError('Error al cambiar contraseña.');
      }
    } finally {
      setIsChanging(false);
    }
  }

  // ── Render ───────────────────────────────────────────
  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        padding: 20,
        marginTop: 16,
      }}
    >
      {/* Header */}
      <Pressable
        onPress={() => {
          setShowForm((prev) => !prev);
          setPasswordError(null);
          setPasswordSuccess(null);
        }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <MaterialCommunityIcons name="lock-outline" size={22} color={c.brand} />
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: c.fg,
            letterSpacing: -0.15,
            flex: 1,
          }}
        >
          Cambiar Contraseña
        </Text>
        <MaterialCommunityIcons
          name={showForm ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={c.muted}
        />
      </Pressable>

      {showForm ? (
        <>
          {/* Feedback messages */}
          <FeedbackBanner
            type="success"
            message={passwordSuccess}
            colors={c}
            marginTop={20}
            marginBottom={12}
          />
          <FeedbackBanner
            type="error"
            message={passwordError}
            colors={c}
            marginTop={20}
            marginBottom={12}
          />

          {/* Current Password */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: c.muted,
              marginBottom: 4,
              marginTop: passwordSuccess || passwordError ? 4 : 20,
              textTransform: 'uppercase',
              letterSpacing: 0.04,
            }}
          >
            Contraseña Actual *
          </Text>
          <TextInput
            mode="outlined"
            placeholder="••••••••"
            placeholderTextColor={c.placeholderColor}
            secureTextEntry
            value={oldPassword}
            onChangeText={setOldPassword}
            style={{ marginBottom: 14, backgroundColor: c.inputBg }}
            theme={c.textInputTheme}
            testID="old-password-input"
          />

          {/* New Password */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: c.muted,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: 0.04,
            }}
          >
            Nueva Contraseña (mín. {MIN_PASSWORD_LENGTH} caracteres) *
          </Text>
          <TextInput
            mode="outlined"
            placeholder="••••••••"
            placeholderTextColor={c.placeholderColor}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            style={{ marginBottom: 14, backgroundColor: c.inputBg }}
            theme={c.textInputTheme}
            testID="new-password-input"
          />

          {/* Confirm Password */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: c.muted,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: 0.04,
            }}
          >
            Confirmar Nueva Contraseña *
          </Text>
          <TextInput
            mode="outlined"
            placeholder="••••••••"
            placeholderTextColor={c.placeholderColor}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={{ marginBottom: 14, backgroundColor: c.inputBg }}
            theme={c.textInputTheme}
            testID="confirm-password-input"
          />

          {/* Submit Button */}
          <View testID="change-password-button">
            <Button
              mode="contained"
              onPress={handleChangePassword}
              loading={isChanging}
              disabled={isChanging}
              buttonColor={c.errorColor}
              textColor={c.white}
              style={{ borderRadius: 12 }}
              contentStyle={{ paddingVertical: 8 }}
            >
              Cambiar Contraseña
            </Button>
          </View>
        </>
      ) : null}
    </View>
  );
}
