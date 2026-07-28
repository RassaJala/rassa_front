import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import { useNavigation } from '@react-navigation/native';

import DatePickerModal from '@/components/DatePickerModal';
import ErrorBoundary from '@/components/ErrorBoundary';
import FormErrorBanner from '@/components/FormErrorBanner';
import RegistrationFormFields from '@/components/RegistrationFormFields';
import { colors } from '@/constants/colors';
import { useRegistrationForm } from '@/hooks/useRegistrationForm';
import { useSubmitNewUser } from '@/hooks/useSubmitNewUser';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { RegisterRole } from '@/types';
import { getAdminColors } from '@/utils/adminTheme';

const DEFAULT_REGISTER_ROLE: RegisterRole = 'buyer';

function RegisterScreenContent(): React.JSX.Element {
  const { register } = useAuth();
  const navigation = useNavigation();
  const netInfo = useNetInfo();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const adminColors = getAdminColors(isDark);
  const { bg, surface, fg, muted, border, brand } = adminColors;

  const form = useRegistrationForm({ initialRole: DEFAULT_REGISTER_ROLE });

  const { submit, isSubmitting, errorMessage, serverError, setErrorMessage } =
    useSubmitNewUser({
      submitFn: register,
      onSuccess: () => {
        // Auto-login is handled inside register context function
      },
    });

  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  async function handleRegister() {
    if (netInfo.isConnected === false) {
      setErrorMessage('Sin conexión a Internet.');
      return;
    }
    await submit(form);
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
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
          onPress={() => navigation.goBack()}
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
            Crear cuenta
          </Text>
          <Text style={{ fontSize: 14, color: muted, marginTop: 2 }}>
            Completa los siguientes datos para registrarte.
          </Text>
        </View>
      </View>

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
          <RegistrationFormFields
            form={form}
            colors={adminColors}
            setErrorMessage={setErrorMessage}
            onOpenDatePicker={() => setIsDatePickerVisible(true)}
            disabled={isSubmitting}
          />

          <FormErrorBanner message={errorMessage} isDark={isDark} />
          <FormErrorBanner message={serverError} isDark={isDark} />

          <View style={{ marginTop: 24, gap: 10 }}>
            <Pressable
              onPress={() => void handleRegister()}
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
                Registrarse
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
                ¿Ya tienes cuenta?{' '}
                <Text
                  style={{
                    color: brand,
                    fontWeight: '700',
                  }}
                >
                  Inicia sesión
                </Text>
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

export default function RegisterScreen(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <RegisterScreenContent />
    </ErrorBoundary>
  );
}
