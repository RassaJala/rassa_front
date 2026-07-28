import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

import DatePickerModal from '@/components/DatePickerModal';
import ErrorBoundary from '@/components/ErrorBoundary';
import FormErrorBanner from '@/components/FormErrorBanner';
import RegistrationFormFields from '@/components/RegistrationFormFields';
import RoleSelector from '@/components/RoleSelector';
import { colors } from '@/constants/colors';
import { useRegistrationForm } from '@/hooks/useRegistrationForm';
import { useSubmitNewUser } from '@/hooks/useSubmitNewUser';
import api from '@/services/api';
import { useTheme } from '@/store/ThemeContext';
import type { RegisterRole } from '@/types';
import { getAdminColors } from '@/utils/adminTheme';

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

function UserFormScreenContent(): React.JSX.Element {
  const navigation = useNavigation();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const adminColors = getAdminColors(isDark);
  const { bg, surface, fg, border, brand } = adminColors;

  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function verifyAuth(retryCount = 0) {
      try {
        const res = await api.get<{ data?: { role?: string } }>('/auth/me/', {
          signal: controller.signal,
        });
        const backendUser = res.data?.data;
        const role = backendUser?.role?.toLowerCase() ?? '';
        const ADMIN_ROLES: readonly string[] = [
          'admin',
          'administrator',
          'administrador',
        ];
        if (!ADMIN_ROLES.includes(role)) {
          throw new Error('Not an admin');
        }
        if (active) {
          setIsValidating(false);
        }
      } catch (err) {
        if (
          axios.isCancel(err) ||
          (err instanceof Error && err.name === 'AbortError')
        ) {
          return;
        }
        console.error(
          '[UserFormScreen] active backend auth check failed:',
          err,
        );
        if (retryCount < 1 && active) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (active) {
            return verifyAuth(retryCount + 1);
          }
          return;
        }
        if (active) {
          navigation.goBack();
        }
      }
    }
    void verifyAuth();
    return () => {
      active = false;
      controller.abort();
    };
  }, [navigation]);

  const form = useRegistrationForm({ initialRole: 'buyer' });
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const { submit, isSubmitting, errorMessage, serverError, setErrorMessage } =
    useSubmitNewUser({
      onSuccess: () => navigation.goBack(),
    });

  if (isValidating) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bg,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator testID="auth-loading" size="large" color={brand} />
      </View>
    );
  }

  const handleSubmit = () => submit(form);

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
          {/* Selector de Rol */}
          <RoleSelector
            role={form.role}
            onChangeRole={(r) => form.setRole(r as RegisterRole)}
            isDark={isDark}
            disabled={isSubmitting}
          />

          <ErrorBoundary>
            <RegistrationFormFields
              form={form}
              colors={adminColors}
              setErrorMessage={setErrorMessage}
              onOpenDatePicker={() => setIsDatePickerVisible(true)}
              disabled={isSubmitting}
            />
          </ErrorBoundary>

          {/* ── Error messages ──────────────────────────── */}
          <FormErrorBanner message={errorMessage} isDark={isDark} />
          <FormErrorBanner message={serverError} isDark={isDark} />

          {/* ── Acciones de Guardar / Cancelar ───────────── */}
          <View style={{ marginTop: 24, gap: 10 }}>
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={{
                height: 50,
                borderRadius: 14,
                backgroundColor: brand,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator
                  testID="submit-loading"
                  size={16}
                  color={colors.iconWhite}
                />
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

export default function UserFormScreen(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <UserFormScreenContent />
    </ErrorBoundary>
  );
}
