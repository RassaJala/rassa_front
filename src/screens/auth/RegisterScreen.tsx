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
import { useNavigation } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';

import CatalogSelector from '@/components/CatalogSelector';
import DatePickerModal from '@/components/DatePickerModal';
import { colors } from '@/constants/colors';
import { useCatalogs } from '@/hooks/useCatalogs';
import { useAuth } from '@/store/AuthContext';
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
      className="flex-1 bg-white px-6 py-8"
      contentContainerStyle={styles.scrollContent}
    >
      <View className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
        <Text className="mb-2 text-2xl font-semibold text-slate-900">
          Crear cuenta
        </Text>
        <Text className="mb-6 text-sm text-slate-600">
          Completa los siguientes datos para registrarte.
        </Text>

        {/* Account Info */}
        <Text className="mb-1 text-sm font-medium text-slate-700">
          Correo electrónico *
        </Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
          placeholder="ejemplo@correo.com"
          placeholderTextColor={colors.placeholder}
          value={email}
          onChangeText={setEmail}
        />

        <Text className="mb-1 text-sm font-medium text-slate-700">
          Contraseña (mínimo 6 caracteres) *
        </Text>
        <TextInput
          className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
          placeholder="••••••••"
          placeholderTextColor={colors.placeholder}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* Personal Details */}
        <Text className="mb-1 text-sm font-medium text-slate-700">
          Nombre *
        </Text>
        <TextInput
          className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
          placeholder="Nombre(s)"
          placeholderTextColor={colors.placeholder}
          value={nombre}
          onChangeText={(val) => setNombre(cleanName(val))}
        />

        <Text className="mb-1 text-sm font-medium text-slate-700">
          Apellido Paterno *
        </Text>
        <TextInput
          className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
          placeholder="Apellido Paterno"
          placeholderTextColor={colors.placeholder}
          value={apellidoPaterno}
          onChangeText={(val) => setApellidoPaterno(cleanName(val))}
        />

        <Text className="mb-1 text-sm font-medium text-slate-700">
          Apellido Materno
        </Text>
        <TextInput
          className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
          placeholder="Apellido Materno"
          placeholderTextColor={colors.placeholder}
          value={apellidoMaterno}
          onChangeText={(val) => setApellidoMaterno(cleanName(val))}
        />

        <Text className="mb-1 text-sm font-medium text-slate-700">
          Teléfono *
        </Text>
        <TextInput
          className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
          placeholder="xxx-xxx-xx-xx"
          placeholderTextColor={colors.placeholder}
          keyboardType="phone-pad"
          value={telefono}
          onChangeText={(val) => setTelefono(formatPhoneNumber(val))}
        />

        <Text className="mb-1 text-sm font-medium text-slate-700">
          Fecha de Nacimiento *
        </Text>
        <TouchableOpacity
          testID="birthdate-pressable"
          onPress={() => setIsDatePickerVisible(true)}
        >
          <View pointerEvents="none">
            <TextInput
              className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
              placeholder="AAAA-MM-DD"
              placeholderTextColor={colors.placeholder}
              value={fechaNacimiento}
              editable={false}
            />
          </View>
        </TouchableOpacity>

        <Text className="mb-1 text-sm font-medium text-slate-700">
          Género *
        </Text>
        <View className="mb-3 flex-row space-x-2">
          {(['M', 'F', 'O'] as const).map((g) => (
            <TouchableOpacity
              key={g}
              onPress={() => setSexo(g)}
              className={`flex-1 rounded-xl border py-2.5 ${
                sexo === g
                  ? 'border-emerald-600 bg-emerald-50'
                  : 'border-slate-300 bg-white'
              }`}
            >
              <Text
                className={`text-center font-medium ${sexo === g ? 'text-emerald-700' : 'text-slate-600'}`}
              >
                {getGenderLabel(g)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="mb-1 text-sm font-medium text-slate-700">
          Dirección *
        </Text>
        <TextInput
          className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
          placeholder="Calle, número, colonia"
          placeholderTextColor={colors.placeholder}
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
          style={styles.submitButton}
          contentStyle={styles.buttonContent}
        >
          {isSubmitting ? <ActivityIndicator color="#fff" /> : 'Registrarse'}
        </Button>

        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4">
          <Text className="text-center text-sm font-medium text-slate-500">
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
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 6,
  },
});
