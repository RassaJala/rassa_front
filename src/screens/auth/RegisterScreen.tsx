import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useNetInfo } from '@react-native-community/netinfo';
import { useNavigation } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';

import DatePickerModal from '@/components/DatePickerModal';
import RegistrationFormFields from '@/components/RegistrationFormFields';
import { colors } from '@/constants/colors';
import { useRegistrationForm } from '@/hooks/useRegistrationForm';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { RegisterRole } from '@/types';
import { cleanPhoneNumber, validateRegistrationForm } from '@/utils/validation';

const DEFAULT_REGISTER_ROLE: RegisterRole = 'buyer';

export default function RegisterScreen(): React.JSX.Element {
  const { register } = useAuth();
  const navigation = useNavigation();
  const netInfo = useNetInfo();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const isMounted = useRef(true);

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;

  const form = useRegistrationForm({ initialRole: DEFAULT_REGISTER_ROLE });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  async function handleRegister() {
    if (isSubmitting) return;
    setErrorMessage(null);

    if (netInfo.isConnected === false) {
      setErrorMessage('Sin conexión a Internet.');
      return;
    }

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
        role: DEFAULT_REGISTER_ROLE,
        nombre: form.nombre.trim(),
        apellido_paterno: form.apellidoPaterno.trim(),
        apellido_materno: form.apellidoMaterno.trim() || null,
        fecha_nacimiento: form.fechaNacimiento,
        sexo: form.sexo,
        domicilio: form.domicilio.trim(),
        fk_localidad: form.catalog.localidadId as number,
      };

      await register(payload);
    } catch (error) {
      if (isMounted.current) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Error al registrar usuario.',
        );
      }
      Sentry.captureException(error);
    } finally {
      if (isMounted.current) {
        setIsSubmitting(false);
      }
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={{ padding: 16 }}>
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: border,
            backgroundColor: surface,
            padding: 16,
          }}
        >
          <Text
            style={{
              marginBottom: 4,
              fontSize: 22,
              fontWeight: '700',
              color: fg,
              letterSpacing: -0.3,
            }}
          >
            Crear cuenta
          </Text>
          <Text
            style={{
              marginBottom: 24,
              fontSize: 14,
              color: muted,
            }}
          >
            Completa los siguientes datos para registrarte.
          </Text>

          <RegistrationFormFields
            form={form}
            setErrorMessage={setErrorMessage}
            onOpenDatePicker={() => setIsDatePickerVisible(true)}
          />

          {errorMessage ? (
            <Text
              style={{
                marginBottom: 16,
                textAlign: 'center',
                fontSize: 13,
                color: colors.brandRedCoral,
              }}
            >
              {errorMessage}
            </Text>
          ) : null}

          <Pressable
            onPress={() => void handleRegister()}
            disabled={isSubmitting}
            style={{
              backgroundColor: colors.brandRedCoral,
              borderRadius: 16,
              paddingVertical: 14,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: colors.iconWhite,
                }}
              >
                Registrarse
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => navigation.goBack()}
            style={{ marginTop: 16, alignItems: 'center' }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: muted,
              }}
            >
              ¿Ya tienes cuenta?{' '}
              <Text
                style={{
                  color: isDark ? colors.admBrandD : colors.admBrandL,
                  fontWeight: '600',
                }}
              >
                Inicia sesión
              </Text>
            </Text>
          </Pressable>
        </View>
        <DatePickerModal
          visible={isDatePickerVisible}
          onClose={() => setIsDatePickerVisible(false)}
          onSelectDate={form.setFechaNacimiento}
          initialDate={form.fechaNacimiento}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
});
