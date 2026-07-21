import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import axios from 'axios';

import { useAuth } from '@/store/AuthContext';

import { useProfileColors } from './profileColors';

interface AdminChangePasswordProps {
  readonly onPasswordChanged: () => void;
}

function validateAdminPasswordChange(
  oldPass: string,
  newPass: string,
  confirmPass: string,
): string | null {
  if (!oldPass || !newPass || !confirmPass) {
    return 'Por favor, completa todos los campos.';
  }

  if (newPass !== confirmPass) {
    return 'La confirmación de la contraseña no coincide.';
  }

  if (oldPass === newPass) {
    return 'La nueva contraseña debe ser diferente a la actual.';
  }

  return null;
}

function getPasswordErrorMsg(error: unknown): string {
  if (!axios.isAxiosError(error) || !error.response?.data) {
    return error instanceof Error
      ? error.message
      : 'Error al cambiar contraseña.';
  }

  const data = error.response.data as Record<string, unknown>;
  if (typeof error.response.data === 'string') return error.response.data;

  return (
    data.old_password?.toString() ??
    data.new_password?.toString() ??
    data.detail?.toString() ??
    data.message?.toString() ??
    'La contraseña actual es incorrecta.'
  );
}

export default function AdminChangePassword({
  onPasswordChanged,
}: AdminChangePasswordProps): React.JSX.Element {
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

  // ── Handlers ─────────────────────────────────────────
  async function handleChangePassword() {
    if (isChanging) return;
    setPasswordSuccess(null);
    setPasswordError(null);

    if (netInfo.isConnected === false) {
      setPasswordError('Sin conexión a Internet.');
      return;
    }

    const validationError = validateAdminPasswordChange(
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

      setPasswordSuccess('Contraseña cambiada exitosamente.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Close form after a brief delay so user sees success
      globalThis.setTimeout(() => {
        setShowForm(false);
        setPasswordSuccess(null);
        setPasswordError(null);
        onPasswordChanged();
      }, 1500);
    } catch (error) {
      setPasswordError(getPasswordErrorMsg(error));
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
          {passwordSuccess ? (
            <View
              style={{
                marginTop: 20,
                marginBottom: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.brand,
                backgroundColor: c.accentBg,
                padding: 14,
              }}
            >
              <Text
                style={{
                  textAlign: 'center',
                  fontSize: 14,
                  fontWeight: '600',
                  color: c.brand,
                }}
              >
                {passwordSuccess}
              </Text>
            </View>
          ) : null}
          {passwordError ? (
            <View
              style={{
                marginTop: 20,
                marginBottom: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.errorColor,
                backgroundColor: c.errorBg,
                padding: 14,
              }}
            >
              <Text
                style={{
                  textAlign: 'center',
                  fontSize: 14,
                  fontWeight: '600',
                  color: c.errorColor,
                }}
              >
                {passwordError}
              </Text>
            </View>
          ) : null}

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
            theme={{
              colors: {
                text: c.inputText,
                primary: c.brand,
                outline: c.border,
                placeholder: c.placeholderColor,
              },
            }}
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
            Nueva Contraseña *
          </Text>
          <TextInput
            mode="outlined"
            placeholder="••••••••"
            placeholderTextColor={c.placeholderColor}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            style={{ marginBottom: 14, backgroundColor: c.inputBg }}
            theme={{
              colors: {
                text: c.inputText,
                primary: c.brand,
                outline: c.border,
                placeholder: c.placeholderColor,
              },
            }}
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
            theme={{
              colors: {
                text: c.inputText,
                primary: c.brand,
                outline: c.border,
                placeholder: c.placeholderColor,
              },
            }}
          />

          {/* Submit Button */}
          <Pressable
            onPress={handleChangePassword}
            disabled={isChanging}
            style={({ pressed }) => ({
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: c.errorColor,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed || isChanging ? 0.7 : 1,
            })}
          >
            {isChanging ? (
              <ActivityIndicator color={c.white} size="small" />
            ) : (
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '700',
                  color: c.white,
                }}
              >
                Cambiar Contraseña
              </Text>
            )}
          </Pressable>
        </>
      ) : null}
    </View>
  );
}
