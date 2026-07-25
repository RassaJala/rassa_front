import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';

import DatePickerModal from '@/components/DatePickerModal';
import RegistrationFormFields from '@/components/RegistrationFormFields';
import { colors } from '@/constants/colors';
import { useRegistrationForm } from '@/hooks/useRegistrationForm';
import api from '@/services/api';
import { useTheme } from '@/store/ThemeContext';
import type { RegisterRole } from '@/types';
import { cleanPhoneNumber, validateRegistrationForm } from '@/utils/validation';

const ROLE_OPTIONS: { value: RegisterRole; label: string }[] = [
  { value: 'buyer', label: 'Cliente' },
  { value: 'seller', label: 'Vendedor' },
  { value: 'farmer', label: 'Agricultor' },
];

function FormHeader({
  isDark,
  onBack,
}: {
  readonly isDark: boolean;
  readonly onBack: () => void;
}): React.JSX.Element {
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;

  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Pressable
        onPress={onBack}
        style={({ pressed }) => ({
          opacity: pressed ? 0.6 : 1,
        })}
        hitSlop={8}
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color={fg} />
      </Pressable>
      <View>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: -0.02,
            color: fg,
          }}
        >
          Nuevo usuario
        </Text>
        <Text style={{ fontSize: 14, color: muted, marginTop: 2 }}>
          Completa los datos para crear un nuevo usuario
        </Text>
      </View>
    </View>
  );
}

export default function UserFormScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? colors.admBgD : colors.admBgL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const segBg = isDark ? colors.admSegBgD : colors.admSegBgL;
  const accentBg = isDark ? colors.admActiveBgD : colors.admActiveBgL;
  const queryClient = useQueryClient();

  const form = useRegistrationForm({ initialRole: 'buyer' });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [serverError, setServerError] = useState('');

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  async function handleSubmit() {
    if (isSubmitting) return;
    setErrorMessage(null);
    setServerError('');

    const validationError = validateRegistrationForm({
      email: form.email,
      password: form.password,
      telefono: form.telefono,
      nombre: form.nombre,
      apellidoPaterno: form.apellidoPaterno,
      fechaNacimiento: form.fechaNacimiento,
      domicilio: form.domicilio,
      localidadId: form.catalog.localidadId,
    });

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        email: form.email.trim(),
        password: form.password,
        telefono: cleanPhoneNumber(form.telefono),
        role: form.role,
        nombre: form.nombre.trim(),
        apellido_paterno: form.apellidoPaterno.trim(),
        apellido_materno: form.apellidoMaterno.trim() || null,
        fecha_nacimiento: form.fechaNacimiento,
        sexo: form.sexo,
        domicilio: form.domicilio.trim(),
        fk_localidad: form.catalog.localidadId as number,
      };

      const endpoint =
        form.role === 'farmer' ? '/auth/create-farmer/' : '/auth/register/';

      await api.post(endpoint, payload);

      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      navigation.goBack();
    } catch (error) {
      if (isMounted.current) {
        const detail =
          (error as { response?: { data?: { detail?: string } } })?.response
            ?.data?.detail ??
          (error as Error)?.message ??
          'Error al crear el usuario.';
        setServerError(detail);
      }
    } finally {
      if (isMounted.current) {
        setIsSubmitting(false);
      }
    }
  }

  const errorColor = colors.brandRedCoral;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <FormHeader isDark={isDark} onBack={() => navigation.goBack()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: border,
            backgroundColor: surface,
            padding: 20,
          }}
        >
          {/* ── Role selector ──────────────────────────── */}
          <Text
            style={{
              marginBottom: 6,
              fontSize: 14,
              fontWeight: '500',
              color: fg,
            }}
          >
            Rol *
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {ROLE_OPTIONS.map((opt) => {
              const isActive = form.role === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => form.setRole(opt.value)}
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: isActive ? brand : border,
                    backgroundColor: isActive ? accentBg : segBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: isActive ? brand : muted,
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <RegistrationFormFields
            form={form}
            t={{
              muted,
              border,
              surface,
              fg,
              brand,
              accentBg,
              segBg,
              errorBg: isDark ? colors.admErrorBgD : colors.admErrorBgL,
              errorBorder: isDark
                ? colors.admErrorBorderD
                : colors.admErrorBorderL,
              errorText: isDark ? colors.admErrorTextD : colors.admErrorTextL,
              errorAction: isDark
                ? colors.admErrorActionD
                : colors.admErrorActionL,
            }}
            setErrorMessage={setErrorMessage}
            onOpenDatePicker={() => setIsDatePickerVisible(true)}
            disabled={isSubmitting}
          />

          {/* ── Error messages ──────────────────────────── */}
          {errorMessage ? (
            <View
              style={{
                marginTop: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <MaterialCommunityIcons
                name="alert-circle"
                size={16}
                color={errorColor}
              />
              <Text style={{ marginLeft: 6, fontSize: 14, color: errorColor }}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {serverError ? (
            <View
              style={{
                marginTop: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <MaterialCommunityIcons
                name="alert-circle"
                size={16}
                color={errorColor}
              />
              <Text style={{ marginLeft: 6, fontSize: 14, color: errorColor }}>
                {serverError}
              </Text>
            </View>
          ) : null}

          {/* ── Actions ──────────────────────────────────── */}
          <View style={{ marginTop: 24, gap: 10 }}>
            <Pressable
              onPress={() => void handleSubmit()}
              disabled={isSubmitting}
              style={{
                height: 50,
                borderRadius: 14,
                backgroundColor: colors.brandRedCoral,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator size={16} color={colors.iconWhite} />
              ) : null}
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.iconWhite,
                }}
              >
                Guardar
              </Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.goBack()}
              style={{
                height: 44,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: fg }}>
                Cancelar
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <DatePickerModal
        visible={isDatePickerVisible}
        onClose={() => setIsDatePickerVisible(false)}
        onSelectDate={form.setFechaNacimiento}
        initialDate={form.fechaNacimiento}
      />
    </View>
  );
}
