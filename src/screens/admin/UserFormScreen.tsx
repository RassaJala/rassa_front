import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import DatePickerModal from '@/components/DatePickerModal';
import ErrorBoundary from '@/components/ErrorBoundary';
import RegistrationFormFields from '@/components/RegistrationFormFields';
import { colors } from '@/constants/colors';
import { ROLE_OPTIONS } from '@/constants/roles';
import { useRegistrationForm } from '@/hooks/useRegistrationForm';
import { useSubmitNewUser } from '@/hooks/useSubmitNewUser';
import { useTheme } from '@/store/ThemeContext';
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

export default function UserFormScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { bg, surface, fg, muted, border, brand, segBg, accentBg } =
    getAdminColors(isDark);

  const form = useRegistrationForm({ initialRole: 'buyer' });
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const { submit, isSubmitting, errorMessage, serverError, setErrorMessage } =
    useSubmitNewUser({
      onSuccess: () => navigation.goBack(),
    });

  const handleSubmit = () => submit(form);

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

          <ErrorBoundary>
            <RegistrationFormFields
              form={form}
              colors={{
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
          </ErrorBoundary>

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
