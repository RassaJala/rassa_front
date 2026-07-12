/* globals console -- Allow console methods for logging */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
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

import { colors } from '@/constants/colors';
import api from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import type { Localidad, Municipio } from '@/types';

const PLACEHOLDER_COLOR = '#94a3b8';
const EMAIL_REGEX = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export default function RegisterScreen(): React.JSX.Element {
  const { register } = useAuth();
  const navigation = useNavigation();
  const netInfo = useNetInfo();

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const role = 'buyer';
  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [sexo, setSexo] = useState<'M' | 'F' | 'O'>('M');
  const [domicilio, setDomicilio] = useState('');
  const [localidadId, setLocalidadId] = useState<number | null>(null);
  const [localidadNombre, setLocalidadNombre] = useState('');

  // Catalog States
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [selectedMunicipioId, setSelectedMunicipioId] = useState<number | null>(
    null,
  );
  const [selectedMunicipioNombre, setSelectedMunicipioNombre] = useState('');

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [showMunicipioModal, setShowMunicipioModal] = useState(false);
  const [showLocalidadModal, setShowLocalidadModal] = useState(false);

  // Load Municipios on Mount
  useEffect(() => {
    const fetchMunicipios = async () => {
      try {
        const { data } = await api.get<{ data: Municipio[] }>('/municipios/');
        setMunicipios(data.data);
      } catch (error) {
        console.error('Error al cargar municipios:', error);
        Sentry.captureException(error);
      }
    };
    void fetchMunicipios();
  }, []);

  // Load Localidades when Selected Municipio changes
  useEffect(() => {
    if (selectedMunicipioId !== null) {
      const fetchLocalidades = async () => {
        try {
          const { data } = await api.get<{ data: Localidad[] }>(
            `/localidades/?municipio_id=${selectedMunicipioId}`,
          );
          setLocalidades(data.data);
        } catch (error) {
          console.error('Error al cargar localidades:', error);
          Sentry.captureException(error);
        }
      };
      void fetchLocalidades();
    } else {
      setLocalidades([]);
    }
  }, [selectedMunicipioId]);

  async function handleRegister() {
    if (isSubmitting) return;
    setErrorMessage(null);

    if (netInfo.isConnected === false) {
      setErrorMessage('Sin conexión a Internet.');
      return;
    }

    // Validations
    if (
      !email.trim() ||
      !password ||
      !telefono.trim() ||
      !nombre.trim() ||
      !apellidoPaterno.trim() ||
      !fechaNacimiento.trim() ||
      !domicilio.trim() ||
      localidadId === null
    ) {
      setErrorMessage('Por favor, completa todos los campos obligatorios.');
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setErrorMessage('Ingresa un correo electrónico válido.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
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
        telefono: telefono.trim(),
        role,
        nombre: nombre.trim(),
        apellido_paterno: apellidoPaterno.trim(),
        apellido_materno: apellidoMaterno.trim() || null,
        fecha_nacimiento: fechaNacimiento,
        sexo,
        domicilio: domicilio.trim(),
        fk_localidad: localidadId,
      };

      await register(payload);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Error al registrar usuario.',
      );
      Sentry.captureException(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  function getGenderLabel(val: string) {
    if (val === 'M') return 'Masculino';
    if (val === 'F') return 'Femenino';
    return 'Otro';
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
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={email}
          onChangeText={setEmail}
        />

        <Text className="mb-1 text-sm font-medium text-slate-700">
          Contraseña (mínimo 6 caracteres) *
        </Text>
        <TextInput
          className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
          placeholder="••••••••"
          placeholderTextColor={PLACEHOLDER_COLOR}
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
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={nombre}
          onChangeText={setNombre}
        />

        <Text className="mb-1 text-sm font-medium text-slate-700">
          Apellido Paterno *
        </Text>
        <TextInput
          className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
          placeholder="Apellido Paterno"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={apellidoPaterno}
          onChangeText={setApellidoPaterno}
        />

        <Text className="mb-1 text-sm font-medium text-slate-700">
          Apellido Materno
        </Text>
        <TextInput
          className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
          placeholder="Apellido Materno"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={apellidoMaterno}
          onChangeText={setApellidoMaterno}
        />

        <Text className="mb-1 text-sm font-medium text-slate-700">
          Teléfono *
        </Text>
        <TextInput
          className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
          placeholder="10 dígitos"
          placeholderTextColor={PLACEHOLDER_COLOR}
          keyboardType="phone-pad"
          value={telefono}
          onChangeText={setTelefono}
        />

        <Text className="mb-1 text-sm font-medium text-slate-700">
          Fecha de Nacimiento (AAAA-MM-DD) *
        </Text>
        <TextInput
          className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
          placeholder="AAAA-MM-DD"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={fechaNacimiento}
          onChangeText={setFechaNacimiento}
        />

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
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={domicilio}
          onChangeText={setDomicilio}
        />

        {/* Catalog Selectors */}
        <Text className="mb-1 text-sm font-medium text-slate-700">
          Municipio *
        </Text>
        <TouchableOpacity
          onPress={() => setShowMunicipioModal(true)}
          className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-3"
        >
          <Text
            className={`text-base ${selectedMunicipioNombre ? 'text-slate-900' : 'text-slate-400'}`}
          >
            {selectedMunicipioNombre || 'Seleccionar Municipio'}
          </Text>
        </TouchableOpacity>

        <Text className="mb-1 text-sm font-medium text-slate-700">
          Localidad *
        </Text>
        <TouchableOpacity
          onPress={() => {
            if (!selectedMunicipioId) {
              setErrorMessage('Selecciona primero un municipio.');
              return;
            }
            setShowLocalidadModal(true);
          }}
          className="mb-4 rounded-xl border border-slate-300 bg-white px-4 py-3"
        >
          <Text
            className={`text-base ${localidadNombre ? 'text-slate-900' : 'text-slate-400'}`}
          >
            {localidadNombre || 'Seleccionar Localidad'}
          </Text>
        </TouchableOpacity>

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

      {/* Municipio Selection Modal */}
      <Modal visible={showMunicipioModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="h-2/3 rounded-t-3xl bg-white p-6">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-slate-900">
                Seleccionar Municipio
              </Text>
              <Pressable onPress={() => setShowMunicipioModal(false)}>
                <Text className="font-semibold text-emerald-600">Cerrar</Text>
              </Pressable>
            </View>

            <FlatList
              data={municipios}
              keyExtractor={(item) => String(item.id_municipio)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedMunicipioId(item.id_municipio);
                    setSelectedMunicipioNombre(item.nombre);
                    setLocalidadId(null);
                    setLocalidadNombre('');
                    setShowMunicipioModal(false);
                  }}
                  className="border-b border-slate-100 py-4"
                >
                  <Text className="text-base text-slate-800">
                    {item.nombre}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Localidad Selection Modal */}
      <Modal visible={showLocalidadModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="h-2/3 rounded-t-3xl bg-white p-6">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-slate-900">
                Seleccionar Localidad
              </Text>
              <Pressable onPress={() => setShowLocalidadModal(false)}>
                <Text className="font-semibold text-emerald-600">Cerrar</Text>
              </Pressable>
            </View>

            <FlatList
              data={localidades}
              keyExtractor={(item) => String(item.id_localidad)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setLocalidadId(item.id_localidad);
                    setLocalidadNombre(item.nombre);
                    setShowLocalidadModal(false);
                  }}
                  className="border-b border-slate-100 py-4"
                >
                  <Text className="text-base text-slate-800">
                    {item.nombre}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
