import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, SegmentedButtons, TextInput } from 'react-native-paper';

import { useNetInfo } from '@react-native-community/netinfo';
import { useNavigation } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';

import CatalogSelector from '@/components/CatalogSelector';
import DatePickerModal from '@/components/DatePickerModal';
import { colors } from '@/constants/colors';
import { useCatalogs } from '@/hooks/useCatalogs';
import { useAuth } from '@/store/AuthContext';
import type { RegisterRole } from '@/types';
import {
  cleanAddress,
  cleanName,
  cleanPhoneNumber,
  DATE_REGEX,
  EMAIL_REGEX,
  formatPhoneNumber,
  isAdult,
  MIN_PASSWORD_LENGTH,
} from '@/utils/validation';

const BRAND_RED_CORAL = colors.brand.redCoral;

export default function RegisterScreen(): React.JSX.Element {
  const { register } = useAuth();
  const navigation = useNavigation();
  const netInfo = useNetInfo();
  const isMounted = useRef(true);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const role: RegisterRole = 'buyer';
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
    const rawTelefono = cleanPhoneNumber(telefono);
    if (
      !email.trim() ||
      !password ||
      !rawTelefono ||
      !nombre.trim() ||
      !apellidoPaterno.trim() ||
      !fechaNacimiento.trim() ||
      !domicilio.trim() ||
      catalog.localidadId === null
    ) {
      setErrorMessage('Por favor, completa todos los campos obligatorios.');
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setErrorMessage('Ingresa un correo electrónico válido.');
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(
        `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      );
      return;
    }

    if (rawTelefono.length !== 10) {
      setErrorMessage('El teléfono debe tener exactamente 10 dígitos.');
      return;
    }

    if (!DATE_REGEX.test(fechaNacimiento)) {
      setErrorMessage(
        'La fecha de nacimiento debe tener el formato AAAA-MM-DD.',
      );
      return;
    }

    // Validar edad >= 18 años
    if (!isAdult(fechaNacimiento)) {
      setErrorMessage('Debes ser mayor de 18 años para registrarte.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        email: email.trim(),
        password,
        telefono: rawTelefono,
        role,
        nombre: nombre.trim(),
        apellido_paterno: apellidoPaterno.trim(),
        apellido_materno: apellidoMaterno.trim() || null,
        fecha_nacimiento: fechaNacimiento,
        sexo,
        domicilio: domicilio.trim(),
        fk_localidad: catalog.localidadId,
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

        {/* Account Info */}
        <TextInput
          mode="outlined"
          label="Correo electrónico *"
          autoCapitalize="none"
          keyboardType="email-address"
          className="mb-4 bg-white dark:bg-gray-900"
          placeholder="ejemplo@correo.com"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          mode="outlined"
          label="Contraseña (mínimo 6 caracteres) *"
          className="mb-4 bg-white dark:bg-gray-900"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* Personal Details */}
        <TextInput
          mode="outlined"
          label="Nombre *"
          className="mb-4 bg-white dark:bg-gray-900"
          placeholder="Nombre(s)"
          value={nombre}
          onChangeText={(val) => setNombre(cleanName(val))}
        />

        <TextInput
          mode="outlined"
          label="Apellido Paterno *"
          className="mb-4 bg-white dark:bg-gray-900"
          placeholder="Apellido Paterno"
          value={apellidoPaterno}
          onChangeText={(val) => setApellidoPaterno(cleanName(val))}
        />

        <TextInput
          mode="outlined"
          label="Apellido Materno"
          className="mb-4 bg-white dark:bg-gray-900"
          placeholder="Apellido Materno"
          value={apellidoMaterno}
          onChangeText={(val) => setApellidoMaterno(cleanName(val))}
        />

        <TextInput
          mode="outlined"
          label="Teléfono *"
          className="mb-4 bg-white dark:bg-gray-900"
          placeholder="10 dígitos"
          keyboardType="phone-pad"
          value={telefono}
          onChangeText={(val) => setTelefono(formatPhoneNumber(val))}
        />

        <TouchableOpacity
          testID="birthdate-pressable"
          onPress={() => setIsDatePickerVisible(true)}
        >
          <TextInput
            mode="outlined"
            label="Fecha de Nacimiento *"
            className="mb-4 bg-white dark:bg-gray-900"
            placeholder="AAAA-MM-DD"
            value={fechaNacimiento}
            showSoftInputOnFocus={false}
            onChangeText={setFechaNacimiento}
          />
        </TouchableOpacity>

        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Género *
        </Text>
        <SegmentedButtons
          value={sexo}
          onValueChange={setSexo}
          buttons={[
            { value: 'M', label: 'Masculino' },
            { value: 'F', label: 'Femenino' },
            { value: 'O', label: 'Otro' },
          ]}
          style={styles.segmentedButtons}
        />

        <TextInput
          mode="outlined"
          label="Dirección *"
          className="mb-4 bg-white dark:bg-gray-900"
          placeholder="Calle, número, colonia"
          value={domicilio}
          onChangeText={(val) => setDomicilio(cleanAddress(val))}
        />

        {/* Catalog Selectors & Modals */}
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
  segmentedButtons: {
    marginBottom: 16,
  },
});
