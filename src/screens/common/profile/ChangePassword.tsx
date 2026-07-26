import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import axios from 'axios';

import { parseAuthError, useAuth } from '@/store/AuthContext';

import {
  MIN_PASSWORD_LENGTH,
  validatePasswordChange,
} from '@/utils/validation';

import FeedbackBanner from './FeedbackBanner';
import { useProfileColors } from './profileColors';

interface ChangePasswordProps {
  readonly onPasswordChanged: () => void;
}

const SUCCESS_TIMEOUT_MS = 1500;

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
    <View className="mt-4 rounded-2xl border border-rassa-border bg-rassa-surface p-5 dark:border-rassa-border-dark dark:bg-rassa-surface-dark">
      {/* Header */}
      <Pressable
        onPress={() => {
          setShowForm((prev) => !prev);
          setPasswordError(null);
          setPasswordSuccess(null);
        }}
        className="flex-row items-center gap-2.5"
      >
        <MaterialCommunityIcons name="lock-outline" size={22} color={c.brand} />
        <Text className="flex-1 text-base font-bold tracking-tight text-rassa-fg dark:text-rassa-fg-dark">
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
            className="mb-1 text-xs font-semibold uppercase tracking-wide text-rassa-muted dark:text-rassa-muted-dark"
            style={{
              marginTop: passwordSuccess || passwordError ? 4 : 20,
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
            className="mb-3.5"
            style={{ backgroundColor: c.inputBg }}
            theme={c.textInputTheme}
            testID="old-password-input"
          />

          {/* New Password */}
          <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-rassa-muted dark:text-rassa-muted-dark">
            Nueva Contraseña (mín. {MIN_PASSWORD_LENGTH} caracteres) *
          </Text>
          <TextInput
            mode="outlined"
            placeholder="••••••••"
            placeholderTextColor={c.placeholderColor}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            className="mb-3.5"
            style={{ backgroundColor: c.inputBg }}
            theme={c.textInputTheme}
            testID="new-password-input"
          />

          {/* Confirm Password */}
          <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-rassa-muted dark:text-rassa-muted-dark">
            Confirmar Nueva Contraseña *
          </Text>
          <TextInput
            mode="outlined"
            placeholder="••••••••"
            placeholderTextColor={c.placeholderColor}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            className="mb-3.5"
            style={{ backgroundColor: c.inputBg }}
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
