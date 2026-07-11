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
import { colors } from '@/constants/colors';
import api from '@/services/api';
import type { Localidad, Municipio } from '@/types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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

  return (
    <ScrollView
      className="flex-1 bg-white px-6 py-8"
      contentContainerStyle={styles.scrollContent}
    >
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-slate-900">
            Panel de Admin
          </Text>
          <Text className="text-sm text-slate-500">
            Registro de agricultores y compradores
          </Text>
        </View>
        <LogoutButton mode="outlined" />
      </View>

      <View className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
        <Text className="mb-4 border-b border-slate-200 pb-2 text-lg font-semibold text-slate-900">
          Registrar Nuevo Usuario
        </Text>

        {/* Rol Selection */}
        <Text className="mb-1 text-sm font-medium text-slate-700">
          Rol de Usuario *
        </Text>
        <View className="mb-4 flex-row space-x-2">
          {(['farmer', 'buyer'] as const).map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRole(r)}
              className={`flex-1 rounded-xl border py-2.5 ${
                role === r
                  ? 'border-emerald-600 bg-emerald-50'
                  : 'border-slate-300 bg-white'
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  role === r ? 'text-emerald-700' : 'text-slate-600'
                }`}
              >
                {getRoleLabel(r)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Account Info */}
        <Text className="mb-1 text-sm font-medium text-slate-700">
          Correo electrónico *
        </Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
          placeholder="ejemplo@correo.com"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
        />

        <Text className="mb-1 text-sm font-medium text-slate-700">
          Contraseña *
        </Text>
        <TextInput
          className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
          placeholder="••••••••"
          placeholderTextColor={colors.textSecondary}
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
          placeholderTextColor={colors.textSecondary}
          value={nombre}
          onChangeText={setNombre}
        />

        <Text className="mb-1 text-sm font-medium text-slate-700">
          Apellido Paterno *
        </Text>
        <TextInput
          className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
          placeholder="Apellido Paterno"
          placeholderTextColor={colors.textSecondary}
          value={apellidoPaterno}
          onChangeText={setApellidoPaterno}
        />

        <Text className="mb-1 text-sm font-medium text-slate-700">
          Apellido Materno
        </Text>
        <TextInput
          className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
          placeholder="Apellido Materno"
          placeholderTextColor={colors.textSecondary}
          value={apellidoMaterno}
          onChangeText={setApellidoMaterno}
        />

        <Text className="mb-1 text-sm font-medium text-slate-700">
          Teléfono *
        </Text>
        <TextInput
          className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
          placeholder="10 dígitos"
          placeholderTextColor={colors.textSecondary}
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
          placeholderTextColor={colors.textSecondary}
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
                className={`text-center font-medium ${
                  sexo === g ? 'text-emerald-700' : 'text-slate-600'
                }`}
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
          placeholderTextColor={colors.textSecondary}
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
            className={`text-base ${
              selectedMunicipioNombre ? 'text-slate-900' : 'text-slate-400'
            }`}
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
            className={`text-base ${
              localidadNombre ? 'text-slate-900' : 'text-slate-400'
            }`}
          >
            {localidadNombre || 'Seleccionar Localidad'}
          </Text>
        </TouchableOpacity>

        {successMessage ? (
          <Text className="mb-4 text-center text-sm font-medium text-green-600">
            {successMessage}
          </Text>
        ) : null}

        {errorMessage ? (
          <Text className="mb-4 text-center text-sm font-medium text-red-600">
            {errorMessage}
          </Text>
        ) : null}

        <Button
          mode="contained"
          disabled={isSubmitting}
          onPress={() => void handleAddUser()}
          style={styles.submitButton}
          contentStyle={styles.buttonContent}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            'Registrar Usuario'
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
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 6,
  },
});
