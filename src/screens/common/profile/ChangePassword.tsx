import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import axios from 'axios';

import { parseAuthError, useAuth } from '@/store/AuthContext';

import { useProfileColors } from './profileColors';

interface ChangePasswordProps {
  readonly onPasswordChanged: () => void;
}

const PASSWORD_ALPHANUMERIC = /^[a-zA-Z0-9]+$/;
const PASSWORD_HAS_UPPER = /[A-Z]/;
const FILTER_PASSWORD = /[^a-zA-Z0-9]/g;
const MIN_PASSWORD_LENGTH = 8;

function filterPasswordInput(value: string): string {
  return value.replace(FILTER_PASSWORD, '');
}

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

  if (!PASSWORD_ALPHANUMERIC.test(newPass)) {
    return 'La nueva contraseña solo puede contener letras y números (sin caracteres especiales).';
  }

  if (!PASSWORD_HAS_UPPER.test(newPass)) {
    return 'La nueva contraseña debe contener al menos una mayúscula.';
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
            onChangeText={(val) => setOldPassword(filterPasswordInput(val))}
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
            Nueva Contraseña (8+ caracteres, solo letras y números, 1 mayúscula)
            *
          </Text>
          <TextInput
            mode="outlined"
            placeholder="••••••••"
            placeholderTextColor={c.placeholderColor}
            secureTextEntry
            value={newPassword}
            onChangeText={(val) => setNewPassword(filterPasswordInput(val))}
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
            onChangeText={(val) => setConfirmPassword(filterPasswordInput(val))}
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
        </>
      ) : null}
    </View>
  );
}
