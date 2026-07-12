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
import * as Sentry from '@sentry/react-native';
import axios from 'axios';

import LogoutButton from '@/components/LogoutButton';
import api from '@/services/api';
import type { Localidad, Municipio } from '@/types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PLACEHOLDER_COLOR = '#9ca3af';

function parseAxiosError(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data as unknown;
    if (typeof data === 'string') return data;
    if (typeof data === 'object' && data !== null) {
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
  }
  if (error instanceof Error) return error.message;
  return 'Error al registrar al usuario.';
}

function validateForm(fields: {
  email: string;
  telefono: string;
  nombre: string;
  apellidoPaterno: string;
  fechaNacimiento: string;
  domicilio: string;
  localidadId: number | null;
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

  if (
    !email.trim() ||
    !telefono.trim() ||
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

  if (!DATE_REGEX.test(fechaNacimiento)) {
    return 'La fecha de nacimiento debe tener el formato AAAA-MM-DD.';
  }

  return null;
}

export default function AdminPanelScreen(): React.JSX.Element {
  const netInfo = useNetInfo();

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [role, setRole] = useState<'buyer' | 'farmer'>('farmer');
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Modals
  const [showMunicipioModal, setShowMunicipioModal] = useState(false);
  const [showLocalidadModal, setShowLocalidadModal] = useState(false);

  // Load Municipios on Mount (since Admin is authenticated, this will succeed)
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

  function getGenderLabel(val: string) {
    if (val === 'M') return 'Masculino';
    if (val === 'F') return 'Femenino';
    return 'Otro';
  }

  function getRoleLabel(val: string) {
    if (val === 'farmer') return 'Agricultor';
    return 'Comprador/Vendedor';
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
      localidadId,
    });

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
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

      // Call register API directly (ignoring returned tokens to maintain Admin session)
      await api.post('/auth/register/', payload);

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
      setLocalidadId(null);
      setLocalidadNombre('');
      setSelectedMunicipioId(null);
      setSelectedMunicipioNombre('');
    } catch (error) {
      const msg = parseAxiosError(error);
      setErrorMessage(msg);
      Sentry.captureException(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!showForm) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-950 px-6 pt-12">
        <View className="mb-6">
          <Text className="text-2xl font-bold text-brand-ink dark:text-gray-100 mb-1">
            Panel de Admin
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Gestiona la plataforma RASSA JALA.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowForm(true)}
          className="mb-4 rounded-lg bg-brand-red-coral py-2.5 px-4 self-start shadow-sm"
        >
          <Text className="font-semibold text-white text-sm">
            Agregar usuario
          </Text>
        </TouchableOpacity>

        <View className="mt-auto mb-8">
          <LogoutButton mode="outlined" />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-gray-950 px-6 py-8"
      contentContainerStyle={styles.scrollContent}
    >
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-brand-ink dark:text-gray-100">
            Panel de Admin
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Registro de agricultores y compradores
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setShowForm(false);
            setSuccessMessage(null);
            setErrorMessage(null);
          }}
          className="rounded-lg border border-gray-200 px-3.5 py-1.5 bg-white dark:border-gray-800 dark:bg-gray-900"
        >
          <Text className="text-gray-500 dark:text-gray-400 font-medium">Volver</Text>
        </TouchableOpacity>
      </View>

      <View className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
        <Text className="mb-4 border-b border-gray-200 pb-2 text-lg font-semibold text-brand-ink dark:border-gray-800 dark:text-gray-100">
          Registrar Nuevo Usuario
        </Text>

        {/* Rol Selection */}
        <Text className="mb-1 text-sm font-medium text-brand-ink dark:text-gray-300">
          Rol de Usuario *
        </Text>
        <View className="mb-4 flex-row space-x-2">
          {(['farmer', 'buyer'] as const).map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRole(r)}
              className={`flex-1 rounded-lg border py-2.5 ${
                role === r
                  ? 'border-brand-red-coral bg-red-50/10'
                  : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950'
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  role === r ? 'text-brand-red-coral' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {getRoleLabel(r)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Account Info */}
        <Text className="mb-1 text-sm font-medium text-brand-ink dark:text-gray-300">
          Correo electrónico *
        </Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          className="mb-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-base text-brand-ink dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
          placeholder="ejemplo@correo.com"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={email}
          onChangeText={setEmail}
        />

        <Text className="mb-1 text-sm font-medium text-brand-ink dark:text-gray-300">
          Contraseña *
        </Text>
        <TextInput
          className="mb-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-base text-brand-ink dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
          placeholder="••••••••"
          placeholderTextColor={PLACEHOLDER_COLOR}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* Personal Details */}
        <Text className="mb-1 text-sm font-medium text-brand-ink dark:text-gray-300">
          Nombre *
        </Text>
        <TextInput
          className="mb-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-base text-brand-ink dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
          placeholder="Nombre(s)"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={nombre}
          onChangeText={setNombre}
        />

        <Text className="mb-1 text-sm font-medium text-brand-ink dark:text-gray-300">
          Apellido Paterno *
        </Text>
        <TextInput
          className="mb-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-base text-brand-ink dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
          placeholder="Apellido Paterno"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={apellidoPaterno}
          onChangeText={setApellidoPaterno}
        />

        <Text className="mb-1 text-sm font-medium text-brand-ink dark:text-gray-300">
          Apellido Materno
        </Text>
        <TextInput
          className="mb-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-base text-brand-ink dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
          placeholder="Apellido Materno"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={apellidoMaterno}
          onChangeText={setApellidoMaterno}
        />

        <Text className="mb-1 text-sm font-medium text-brand-ink dark:text-gray-300">
          Teléfono *
        </Text>
        <TextInput
          className="mb-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-base text-brand-ink dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
          placeholder="10 dígitos"
          placeholderTextColor={PLACEHOLDER_COLOR}
          keyboardType="phone-pad"
          value={telefono}
          onChangeText={setTelefono}
        />

        <Text className="mb-1 text-sm font-medium text-brand-ink dark:text-gray-300">
          Fecha de Nacimiento (AAAA-MM-DD) *
        </Text>
        <TextInput
          className="mb-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-base text-brand-ink dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
          placeholder="AAAA-MM-DD"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={fechaNacimiento}
          onChangeText={setFechaNacimiento}
        />

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
                  sexo === g ? 'text-brand-red-coral' : 'text-gray-500 dark:text-gray-400'
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
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={domicilio}
          onChangeText={setDomicilio}
        />

        {/* Catalog Selectors */}
        <Text className="mb-1 text-sm font-medium text-brand-ink dark:text-gray-300">
          Municipio *
        </Text>
        <TouchableOpacity
          onPress={() => setShowMunicipioModal(true)}
          className="mb-3 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950"
        >
          <Text
            className={`text-base ${
              selectedMunicipioNombre
                ? 'text-brand-ink dark:text-gray-100'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {selectedMunicipioNombre || 'Seleccionar Municipio'}
          </Text>
        </TouchableOpacity>

        <Text className="mb-1 text-sm font-medium text-brand-ink dark:text-gray-300">
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
          className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950"
        >
          <Text
            className={`text-base ${
              localidadNombre
                ? 'text-brand-ink dark:text-gray-100'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {localidadNombre || 'Seleccionar Localidad'}
          </Text>
        </TouchableOpacity>

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
  buttonContent: {
    paddingVertical: 6,
  },
});
