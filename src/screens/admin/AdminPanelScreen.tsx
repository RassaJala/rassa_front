import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from 'react-native-paper';

import { useNetInfo } from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import axios from 'axios';

import CatalogSelector from '@/components/CatalogSelector';
import DatePickerModal from '@/components/DatePickerModal';
import LogoutButton from '@/components/LogoutButton';
import { colors } from '@/constants/colors';
import { useCatalogs } from '@/hooks/useCatalogs';
import api from '@/services/api';
import type { RegisterRole } from '@/types';
import { getGenderLabel } from '@/utils/gender';
import {
  cleanAddress,
  cleanName,
  cleanPhoneNumber,
  DATE_REGEX,
  EMAIL_REGEX,
  formatPhoneNumber,
  MIN_PASSWORD_LENGTH,
} from '@/utils/validation';

function parseAxiosError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? error.message
      : 'Error al registrar al usuario.';
  }

  const data = error.response?.data as unknown;
  if (!data) {
    return 'Error al registrar al usuario.';
  }

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data === 'object') {
    const dict = data as Record<string, unknown>;
    if (dict.detail) return String(dict.detail);
    if (dict.message) return String(dict.message);

    const errors = Object.entries(dict)
      .map(([field, fieldErrors]) => {
        const prefix = field !== 'non_field_errors' ? `${field}: ` : '';
        const messages = Array.isArray(fieldErrors)
          ? fieldErrors.join(' ')
          : String(fieldErrors);
        return `${prefix}${messages}`;
      })
      .join('\n');
    if (errors) return errors;
  }

  return 'Error al registrar al usuario.';
}

function validateForm(fields: {
  readonly email: string;
  readonly telefono: string;
  readonly nombre: string;
  readonly apellidoPaterno: string;
  readonly fechaNacimiento: string;
  readonly domicilio: string;
  readonly localidadId: number | null;
}): string | null {
  const {
    email,
    telefono,
    nombre,
    apellidoPaterno,
    fechaNacimiento,
    domicilio,
    localidadId,
  } = fields;

  const rawTelefono = cleanPhoneNumber(telefono);

  if (
    !email.trim() ||
    !rawTelefono ||
    !nombre.trim() ||
    !apellidoPaterno.trim() ||
    !fechaNacimiento.trim() ||
    !domicilio.trim() ||
    localidadId === null
  ) {
    return 'Por favor, completa todos los campos obligatorios.';
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    return 'Ingresa un correo electrónico válido.';
  }

  if (rawTelefono.length !== 10) {
    return 'El teléfono debe tener exactamente 10 dígitos.';
  }

  if (!DATE_REGEX.test(fechaNacimiento)) {
    return 'La fecha de nacimiento debe tener el formato AAAA-MM-DD.';
  }

  return null;
}

export default function AdminPanelScreen(): React.JSX.Element {
  const netInfo = useNetInfo();
  const isMounted = useRef(true);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [role, setRole] = useState<RegisterRole>('farmer');
  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [sexo, setSexo] = useState<'M' | 'F' | 'O'>('M');
  const [domicilio, setDomicilio] = useState('');

  // Catalog Hook
  const catalog = useCatalogs();

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

  function getRoleLabel(val: RegisterRole) {
    if (val === 'farmer') return 'Agricultor';
    if (val === 'seller') return 'Vendedor';
    return 'Cliente';
  }

  async function handleAddUser() {
    if (isSubmitting) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (netInfo.isConnected === false) {
      setErrorMessage('Sin conexión a Internet.');
      return;
    }

    // Validations
    const validationError = validateForm({
      email,
      telefono,
      nombre,
      apellidoPaterno,
      fechaNacimiento,
      domicilio,
      localidadId: catalog.localidadId,
    });

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(
        `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        email: email.trim(),
        password,
        telefono: cleanPhoneNumber(telefono),
        role,
        nombre: nombre.trim(),
        apellido_paterno: apellidoPaterno.trim(),
        apellido_materno: apellidoMaterno.trim() || null,
        fecha_nacimiento: fechaNacimiento,
        sexo,
        domicilio: domicilio.trim(),
        fk_localidad: catalog.localidadId,
      };

      // Call register API directly (ignoring returned tokens to maintain Admin session)
      await api.post('/auth/register/', payload);

      if (isMounted.current) {
        setSuccessMessage(
          `Usuario (${getRoleLabel(role)}) registrado exitosamente.`,
        );

        // Reset form
        setEmail('');
        setPassword('');
        setTelefono('');
        setNombre('');
        setApellidoPaterno('');
        setApellidoMaterno('');
        setFechaNacimiento('');
        setSexo('M');
        setDomicilio('');
        catalog.setLocalidadId(null);
        catalog.setLocalidadNombre('');
        catalog.setSelectedMunicipioId(null);
        catalog.setSelectedMunicipioNombre('');
      }
    } catch (error) {
      if (isMounted.current) {
        const msg = parseAxiosError(error);
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
      <View className="flex-1 bg-gray-50 px-6 pt-12 dark:bg-gray-950">
        <View className="mb-6">
          <Text className="mb-1 text-2xl font-bold text-brand-ink dark:text-gray-100">
            Panel de Admin
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Gestiona los usuarios y configuraciones del sistema.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowForm(true)}
          className="mb-4 self-start rounded-lg bg-brand-red-coral px-4 py-2.5 shadow-sm"
        >
          <Text className="text-sm font-semibold text-white">
            Agregar usuario
          </Text>
        </TouchableOpacity>

        <View className="mb-8 mt-auto">
          <LogoutButton mode="outlined" />
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
              onPress={() => setRole(r)}
              className={`flex-1 rounded-lg border py-2.5 ${
                role === r
                  ? 'border-brand-red-coral bg-brand-red-coral/5 dark:bg-brand-red-coral/10'
                  : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950'
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  role === r
                    ? 'text-brand-red-coral'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {getRoleLabel(r)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form Fields */}
        <Text className="mb-1 text-sm font-medium text-brand-ink dark:text-gray-300">
          Correo electrónico *
        </Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          className="mb-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-base text-brand-ink dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
          placeholder="ejemplo@correo.com"
          placeholderTextColor={colors.placeholder}
          value={email}
          onChangeText={setEmail}
        />

        <Text className="mb-1 text-sm font-medium text-brand-ink dark:text-gray-300">
          Contraseña *
        </Text>
        <TextInput
          className="mb-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-base text-brand-ink dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
          placeholder="••••••••"
          placeholderTextColor={colors.placeholder}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Text className="mb-1 text-sm font-medium text-brand-ink dark:text-gray-300">
          Nombre *
        </Text>
        <TextInput
          className="mb-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-base text-brand-ink dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
          placeholder="Nombre(s)"
          placeholderTextColor={colors.placeholder}
          value={nombre}
          onChangeText={(val) => setNombre(cleanName(val))}
        />

        <Text className="mb-1 text-sm font-medium text-brand-ink dark:text-gray-300">
          Apellido Paterno *
        </Text>
        <TextInput
          className="mb-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-base text-brand-ink dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
          placeholder="Apellido Paterno"
          placeholderTextColor={colors.placeholder}
          value={apellidoPaterno}
          onChangeText={(val) => setApellidoPaterno(cleanName(val))}
        />

        <Text className="mb-1 text-sm font-medium text-brand-ink dark:text-gray-300">
          Apellido Materno
        </Text>
        <TextInput
          className="mb-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-base text-brand-ink dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
          placeholder="Apellido Materno"
          placeholderTextColor={colors.placeholder}
          value={apellidoMaterno}
          onChangeText={(val) => setApellidoMaterno(cleanName(val))}
        />

        <Text className="mb-1 text-sm font-medium text-brand-ink dark:text-gray-300">
          Teléfono *
        </Text>
        <TextInput
          className="mb-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-base text-brand-ink dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
          placeholder="xxx-xxx-xx-xx"
          placeholderTextColor={colors.placeholder}
          keyboardType="phone-pad"
          value={telefono}
          onChangeText={(val) => setTelefono(formatPhoneNumber(val))}
        />

        <Text className="mb-1 text-sm font-medium text-brand-ink dark:text-gray-300">
          Fecha de Nacimiento *
        </Text>
        <TouchableOpacity
          testID="birthdate-pressable"
          onPress={() => setIsDatePickerVisible(true)}
        >
          <View pointerEvents="none">
            <TextInput
              className="mb-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-base text-brand-ink dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
              placeholder="AAAA-MM-DD"
              placeholderTextColor={colors.placeholder}
              value={fechaNacimiento}
              editable={false}
            />
          </View>
        </TouchableOpacity>

        <Text className="mb-1 text-sm font-medium text-brand-ink dark:text-gray-300">
          Género *
        </Text>
        <View className="mb-3 flex-row space-x-2">
          {(['M', 'F', 'O'] as const).map((g) => (
            <TouchableOpacity
              key={g}
              onPress={() => setSexo(g)}
              className={`flex-1 rounded-lg border py-2.5 ${
                sexo === g
                  ? 'border-brand-red-coral bg-red-50/10'
                  : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950'
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  sexo === g
                    ? 'text-brand-red-coral'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {getGenderLabel(g)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="mb-1 text-sm font-medium text-brand-ink dark:text-gray-300">
          Dirección *
        </Text>
        <TextInput
          className="mb-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-base text-brand-ink dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
          placeholder="Calle, número, colonia"
          placeholderTextColor={colors.placeholder}
          value={domicilio}
          onChangeText={(val) => setDomicilio(cleanAddress(val))}
        />

        {/* Catalog Selectors */}
        <CatalogSelector
          selectedMunicipioId={catalog.selectedMunicipioId}
          selectedMunicipioNombre={catalog.selectedMunicipioNombre}
          onSelectMunicipio={catalog.handleSelectMunicipio}
          localidadId={catalog.localidadId}
          localidadNombre={catalog.localidadNombre}
          onSelectLocalidad={catalog.handleSelectLocalidad}
          municipios={catalog.municipios}
          localidades={catalog.localidades}
          isLoadingMunicipios={catalog.isLoadingMunicipios}
          isLoadingLocalidades={catalog.isLoadingLocalidades}
          errorMunicipios={catalog.errorMunicipios}
          errorLocalidades={catalog.errorLocalidades}
          refetchMunicipios={catalog.refetchMunicipios}
          refetchLocalidades={catalog.refetchLocalidades}
          setErrorMessage={setErrorMessage}
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
          buttonColor="#DE393A"
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
        onSelectDate={setFechaNacimiento}
        initialDate={fechaNacimiento}
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
