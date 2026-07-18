import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from 'react-native-paper';

import { useNetInfo } from '@react-native-community/netinfo';
import { useNavigation } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';

import DatePickerModal from '@/components/DatePickerModal';
import RegistrationFormFields from '@/components/RegistrationFormFields';
import { BRAND_RED_CORAL } from '@/constants/brandColors';
import { useRegistrationForm } from '@/hooks/useRegistrationForm';
import { useAuth } from '@/store/AuthContext';
import type { RegisterRole } from '@/types';
import { cleanPhoneNumber, validateRegistrationForm } from '@/utils/validation';

const DEFAULT_REGISTER_ROLE: RegisterRole = 'buyer';

export default function RegisterScreen(): React.JSX.Element {
  const { register } = useAuth();
  const navigation = useNavigation();
  const netInfo = useNetInfo();
  const isMounted = useRef(true);

  // Form State Hook
  const form = useRegistrationForm({ initialRole: DEFAULT_REGISTER_ROLE });

  // UI States
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

    // Validations
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
      className="flex-1 bg-gray-50 px-4 py-4 dark:bg-gray-950"
      contentContainerStyle={styles.scrollContent}
    >
      <View className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <Text className="mb-2 text-2xl font-bold text-brand-ink dark:text-gray-100">
          Crear cuenta
        </Text>
        <Text className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Completa los siguientes datos para registrarte.
        </Text>

        <RegistrationFormFields
          form={form}
          setErrorMessage={setErrorMessage}
          onOpenDatePicker={() => setIsDatePickerVisible(true)}
        />

        {errorMessage ? (
          <Text className="mb-4 text-center text-sm text-red-600">
            {errorMessage}
          </Text>
        ) : null}

        <Button
          mode="contained"
          disabled={isSubmitting}
          onPress={() => void handleRegister()}
          buttonColor={BRAND_RED_CORAL}
          className="rounded-lg"
          contentStyle={styles.buttonContent}
        >
          {isSubmitting ? <ActivityIndicator color="#fff" /> : 'Registrarse'}
        </Button>

        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4">
          <Text className="text-center text-sm font-medium text-gray-500 dark:text-gray-400">
            ¿Ya tienes cuenta? Inicia sesión
          </Text>
        </TouchableOpacity>
      </View>
      <DatePickerModal
        visible={isDatePickerVisible}
        onClose={() => setIsDatePickerVisible(false)}
        onSelectDate={form.setFechaNacimiento}
        initialDate={form.fechaNacimiento}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  buttonContent: {
    paddingVertical: 6,
  },
});
