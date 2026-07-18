import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from 'react-native-paper';

import { useNetInfo } from '@react-native-community/netinfo';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Sentry from '@sentry/react-native';

import DatePickerModal from '@/components/DatePickerModal';
import RegistrationFormFields from '@/components/RegistrationFormFields';
import { BRAND_RED_CORAL } from '@/constants/brandColors';
import { useRegistrationForm } from '@/hooks/useRegistrationForm';
import api from '@/services/api';
import type { AdminStackParamList } from '@/types';
import { extractApiError } from '@/utils/apiError';
import { getRoleLabel } from '@/utils/labels';
import { cleanPhoneNumber, validateRegistrationForm } from '@/utils/validation';

const menuItems = [
  {
    key: 'CategoryList',
    label: 'Categorías',
    icon: '📂',
    description: 'Administrar categorías de productos',
  },
  {
    key: 'UnitList',
    label: 'Unidades de Medida',
    icon: '📏',
    description: 'Administrar unidades (kg, pz, lt...)',
  },
  {
    key: 'MunicipioList',
    label: 'Municipios',
    icon: '🗺️',
    description: 'Administrar municipios y sus localidades',
  },
];

type NavigationProp = NativeStackNavigationProp<
  AdminStackParamList,
  'AdminPanel'
>;

interface Props {
  readonly navigation: NavigationProp;
}

export default function AdminPanelScreen({
  navigation,
}: Props): React.JSX.Element {
  const netInfo = useNetInfo();
  const isMounted = useRef(true);

  // Form State Hook
  const form = useRegistrationForm({ initialRole: 'farmer' });

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  async function handleAddUser() {
    if (isSubmitting) return;
    setErrorMessage(null);
    setSuccessMessage(null);

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
      customAgeMsg: 'El usuario debe ser mayor de 18 años.',
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
        fk_localidad: form.catalog.localidadId,
      };

      // Call register API directly (ignoring returned tokens to maintain Admin session)
      await api.post('/auth/register/', payload);

      if (isMounted.current) {
        setSuccessMessage(
          `Usuario (${getRoleLabel(form.role)}) registrado exitosamente.`,
        );

        // Reset form
        form.resetForm();
      }
    } catch (error) {
      if (isMounted.current) {
        const msg = extractApiError(error, [
          'email',
          'password',
          'telefono',
          'nombre',
          'apellido_paterno',
          'apellido_materno',
          'fecha_nacimiento',
          'sexo',
          'domicilio',
          'fk_localidad',
        ]);
        setErrorMessage(msg);
      }
      Sentry.captureException(error);
    } finally {
      if (isMounted.current) {
        setIsSubmitting(false);
      }
    }
  }

  if (!showForm) {
    return (
      <View className="flex-1 bg-gray-50 p-4 dark:bg-gray-950">
        <View className="flex-1 gap-3">
          <Pressable
            onPress={() => setShowForm(true)}
            className="flex-row items-center rounded-xl bg-white p-4 shadow-sm dark:border dark:border-gray-800 dark:bg-gray-900 dark:shadow-none"
          >
            <Text className="mr-4 text-3xl">👤</Text>
            <View className="flex-1">
              <Text className="text-base font-semibold text-brand-ink dark:text-gray-100">
                Agregar usuario
              </Text>
              <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                Agregar un nuevo usuario al sistema
              </Text>
            </View>
            <Text className="text-xl text-gray-300">→</Text>
          </Pressable>

          {menuItems.map((item) => (
            <Pressable
              key={item.key}
              onPress={() =>
                navigation.navigate(
                  item.key as 'CategoryList' | 'UnitList' | 'MunicipioList',
                )
              }
              className="flex-row items-center rounded-xl bg-white p-4 shadow-sm dark:border dark:border-gray-800 dark:bg-gray-900 dark:shadow-none"
            >
              <Text className="mr-4 text-3xl">{item.icon}</Text>
              <View className="flex-1">
                <Text className="text-base font-semibold text-brand-ink dark:text-gray-100">
                  {item.label}
                </Text>
                <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {item.description}
                </Text>
              </View>
              <Text className="text-xl text-gray-300">→</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50 px-6 py-8 dark:bg-gray-950"
      contentContainerStyle={styles.scrollContent}
    >
      <View className="mb-6 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-brand-ink dark:text-gray-100">
          Registrar Usuario
        </Text>
        <TouchableOpacity
          onPress={() => {
            setShowForm(false);
            setSuccessMessage(null);
            setErrorMessage(null);
          }}
          className="rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 dark:border-gray-800 dark:bg-gray-900"
        >
          <Text className="font-medium text-gray-500 dark:text-gray-400">
            Volver
          </Text>
        </TouchableOpacity>
      </View>

      <View className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {/* Role Toggle */}
        <Text className="mb-2 text-sm font-medium text-brand-ink dark:text-gray-300">
          Rol del usuario
        </Text>
        <View className="mb-4 flex-row space-x-2">
          {(['buyer', 'farmer', 'seller'] as const).map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => form.setRole(r)}
              className={`flex-1 rounded-lg border py-2.5 ${
                form.role === r
                  ? 'border-brand-red-coral bg-brand-red-coral/5 dark:bg-brand-red-coral/10'
                  : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950'
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  form.role === r
                    ? 'text-brand-red-coral'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {getRoleLabel(r)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <RegistrationFormFields
          form={form}
          setErrorMessage={setErrorMessage}
          onOpenDatePicker={() => setIsDatePickerVisible(true)}
        />

        {successMessage ? (
          <Text className="mb-4 text-center text-sm font-medium text-brand-green-forest">
            {successMessage}
          </Text>
        ) : null}

        {errorMessage ? (
          <Text className="mb-4 text-center text-sm font-medium text-red-500">
            {errorMessage}
          </Text>
        ) : null}

        <Button
          mode="contained"
          disabled={isSubmitting}
          onPress={() => void handleAddUser()}
          buttonColor={BRAND_RED_CORAL}
          className="rounded-lg"
          contentStyle={styles.buttonContent}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            'Agregar usuario'
          )}
        </Button>
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
