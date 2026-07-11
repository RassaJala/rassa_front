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

import { colors } from '@/constants/colors';
import api from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import type { Localidad, Municipio } from '@/types';

type ActiveTab = 'ver' | 'editar' | 'password';

const PLACEHOLDER_COLOR = '#94a3b8';
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Helper to get gender labels
function getGenderLabel(val: string) {
  if (val === 'M') return 'Masculino';
  if (val === 'F') return 'Femenino';
  return 'Otro';
}

// Helper to get role labels
function getRoleLabel(role?: string) {
  if (role === 'farmer') return 'Agricultor';
  if (role === 'buyer') return 'Comprador';
  return 'Administrador';
}

// ── SUB-COMPONENT: View Profile Tab ───────────────────────────
interface ProfileViewTabProps {
  readonly user: ReturnType<typeof useAuth>['user'];
}

function ProfileViewTab({ user }: ProfileViewTabProps): React.JSX.Element {
  return (
    <View className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
      <Text className="mb-4 border-b border-slate-200 pb-2 text-lg font-semibold text-slate-900">
        Detalles Personales
      </Text>

      <View className="space-y-4">
        <View className="mb-3">
          <Text className="text-xs text-slate-500">Nombre Completo</Text>
          <Text className="text-base font-medium text-slate-800">
            {user?.nombre} {user?.apellido_paterno}{' '}
            {user?.apellido_materno ?? ''}
          </Text>
        </View>

        <View className="mb-3">
          <Text className="text-xs text-slate-500">Teléfono</Text>
          <Text className="text-base font-medium text-slate-800">
            {user?.telefono ?? 'No especificado'}
          </Text>
        </View>

        <View className="mb-3">
          <Text className="text-xs text-slate-500">Fecha de Nacimiento</Text>
          <Text className="text-base font-medium text-slate-800">
            {user?.fecha_nacimiento}
          </Text>
        </View>

        <View className="mb-3">
          <Text className="text-xs text-slate-500">Género</Text>
          <Text className="text-base font-medium text-slate-800">
            {user?.genero ? getGenderLabel(user.genero) : 'No especificado'}
          </Text>
        </View>

        <View className="mb-3">
          <Text className="text-xs text-slate-500">Dirección</Text>
          <Text className="text-base font-medium text-slate-800">
            {user?.direccion}
          </Text>
        </View>

        <View className="mb-3">
          <Text className="text-xs text-slate-500">Localidad</Text>
          <Text className="text-base font-medium text-slate-800">
            {user?.localidad_nombre}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── SUB-COMPONENT: Edit Profile Tab ───────────────────────────
interface ProfileEditTabProps {
  readonly isSubmitting: boolean;
  readonly nombre: string;
  readonly setNombre: (val: string) => void;
  readonly apellidoPaterno: string;
  readonly setApellidoPaterno: (val: string) => void;
  readonly apellidoMaterno: string;
  readonly setApellidoMaterno: (val: string) => void;
  readonly telefono: string;
  readonly setTelefono: (val: string) => void;
  readonly fechaNacimiento: string;
  readonly setFechaNacimiento: (val: string) => void;
  readonly sexo: string;
  readonly setSexo: (val: string) => void;
  readonly domicilio: string;
  readonly setDomicilio: (val: string) => void;
  readonly selectedMunicipioNombre: string;
  readonly setShowMunicipioModal: (val: boolean) => void;
  readonly selectedMunicipioId: number | null;
  readonly setErrorMessage: (val: string | null) => void;
  readonly setShowLocalidadModal: (val: boolean) => void;
  readonly localidadNombre: string;
  readonly handleUpdateProfile: () => void;
}

function ProfileEditTab({
  isSubmitting,
  nombre,
  setNombre,
  apellidoPaterno,
  setApellidoPaterno,
  apellidoMaterno,
  setApellidoMaterno,
  telefono,
  setTelefono,
  fechaNacimiento,
  setFechaNacimiento,
  sexo,
  setSexo,
  domicilio,
  setDomicilio,
  selectedMunicipioNombre,
  setShowMunicipioModal,
  selectedMunicipioId,
  setErrorMessage,
  setShowLocalidadModal,
  localidadNombre,
  handleUpdateProfile,
}: ProfileEditTabProps): React.JSX.Element {
  return (
    <View className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
      <Text className="mb-4 border-b border-slate-200 pb-2 text-lg font-semibold text-slate-900">
        Editar Perfil
      </Text>

      <Text className="mb-1 text-sm font-medium text-slate-700">Nombre *</Text>
      <TextInput
        className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
        placeholder="Nombre"
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
        placeholder="Teléfono"
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

      <Text className="mb-1 text-sm font-medium text-slate-700">Género *</Text>
      <View className="mb-3 flex-row space-x-2">
        {['M', 'F', 'O'].map((g) => (
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
        placeholderTextColor={PLACEHOLDER_COLOR}
        value={domicilio}
        onChangeText={setDomicilio}
      />

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

      <Button
        mode="contained"
        disabled={isSubmitting}
        onPress={handleUpdateProfile}
        style={styles.submitButton}
        contentStyle={styles.buttonContent}
      >
        {isSubmitting ? <ActivityIndicator color="#fff" /> : 'Guardar Cambios'}
      </Button>
    </View>
  );
}

// ── SUB-COMPONENT: Change Password Tab ───────────────────────
interface ProfilePasswordTabProps {
  readonly isSubmitting: boolean;
  readonly oldPassword: string;
  readonly setOldPassword: (val: string) => void;
  readonly newPassword: string;
  readonly setNewPassword: (val: string) => void;
  readonly confirmPassword: string;
  readonly setConfirmPassword: (val: string) => void;
  readonly handleChangePassword: () => void;
}

function ProfilePasswordTab({
  isSubmitting,
  oldPassword,
  setOldPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  handleChangePassword,
}: ProfilePasswordTabProps): React.JSX.Element {
  return (
    <View className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
      <Text className="mb-4 border-b border-slate-200 pb-2 text-lg font-semibold text-slate-900">
        Cambiar Contraseña
      </Text>

      <Text className="mb-1 text-sm font-medium text-slate-700">
        Contraseña Actual *
      </Text>
      <TextInput
        className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
        placeholder="••••••••"
        placeholderTextColor={PLACEHOLDER_COLOR}
        secureTextEntry
        value={oldPassword}
        onChangeText={setOldPassword}
      />

      <Text className="mb-1 text-sm font-medium text-slate-700">
        Nueva Contraseña (mínimo 6 caracteres) *
      </Text>
      <TextInput
        className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
        placeholder="••••••••"
        placeholderTextColor={PLACEHOLDER_COLOR}
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />

      <Text className="mb-1 text-sm font-medium text-slate-700">
        Confirmar Nueva Contraseña *
      </Text>
      <TextInput
        className="mb-4 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
        placeholder="••••••••"
        placeholderTextColor={PLACEHOLDER_COLOR}
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <Button
        mode="contained"
        disabled={isSubmitting}
        onPress={handleChangePassword}
        style={styles.submitButton}
        contentStyle={styles.buttonContent}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          'Cambiar Contraseña'
        )}
      </Button>
    </View>
  );
}

// ── MAIN COMPONENT: ProfileScreen ────────────────────────────
export default function ProfileScreen(): React.JSX.Element {
  const { user, updateProfile, logout } = useAuth();
  const netInfo = useNetInfo();

  const [activeTab, setActiveTab] = useState<ActiveTab>('ver');

  // Edit Profile States
  const [nombre, setNombre] = useState(user?.nombre ?? '');
  const [apellidoPaterno, setApellidoPaterno] = useState(
    user?.apellido_paterno ?? '',
  );
  const [apellidoMaterno, setApellidoMaterno] = useState(
    user?.apellido_materno ?? '',
  );
  const [telefono, setTelefono] = useState(user?.telefono ?? '');
  const [fechaNacimiento, setFechaNacimiento] = useState(
    user?.fecha_nacimiento ?? '',
  );
  const [sexo, setSexo] = useState(user?.genero ?? 'M');
  const [domicilio, setDomicilio] = useState(user?.direccion ?? '');
  const [localidadId, setLocalidadId] = useState<number | null>(
    user?.localidad ?? null,
  );
  const [localidadNombre, setLocalidadNombre] = useState(
    user?.localidad_nombre ?? '',
  );

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

  // Change Password States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Load Municipios on Edit Tab
  useEffect(() => {
    if (activeTab === 'editar') {
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
    }
  }, [activeTab]);

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

  // Handle Edit Profile Submission
  async function handleUpdateProfile() {
    if (isSubmitting) return;
    setSuccessMessage(null);
    setErrorMessage(null);

    if (netInfo.isConnected === false) {
      setErrorMessage('Sin conexión a Internet.');
      return;
    }

    if (
      !nombre.trim() ||
      !apellidoPaterno.trim() ||
      !telefono.trim() ||
      !fechaNacimiento.trim() ||
      !domicilio.trim() ||
      localidadId === null
    ) {
      setErrorMessage('Por favor, completa todos los campos obligatorios.');
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
        nombre: nombre.trim(),
        apellido_paterno: apellidoPaterno.trim(),
        apellido_materno: apellidoMaterno.trim() || null,
        telefono: telefono.trim(),
        fecha_nacimiento: fechaNacimiento,
        sexo,
        domicilio: domicilio.trim(),
        fk_localidad: localidadId,
      };

      await updateProfile(payload);
      setSuccessMessage('Perfil actualizado exitosamente.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Error al actualizar perfil.',
      );
      Sentry.captureException(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Change Password Submission
  async function handleChangePassword() {
    if (isSubmitting) return;
    setSuccessMessage(null);
    setErrorMessage(null);

    if (netInfo.isConnected === false) {
      setErrorMessage('Sin conexión a Internet.');
      return;
    }

    if (!oldPassword || !newPassword || !confirmPassword) {
      setErrorMessage('Por favor, completa todos los campos.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('La confirmación de la contraseña no coincide.');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('/auth/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
      });

      setSuccessMessage('Contraseña cambiada exitosamente. Cerrando sesión...');
      // eslint-disable-next-line no-undef -- setTimeout is global in RN
      setTimeout(() => {
        void logout();
      }, 2000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Error al cambiar contraseña.',
      );
      Sentry.captureException(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-white px-6 py-6"
      contentContainerStyle={styles.scrollContent}
    >
      {/* Profile Header */}
      <View className="mb-6 items-center rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
        <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-emerald-600">
          <Text className="text-2xl font-bold text-white">
            {user?.nombre ? user.nombre.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <Text className="text-xl font-semibold text-slate-900">
          {user?.nombre} {user?.apellido_paterno}
        </Text>
        <Text className="text-sm text-slate-500">{user?.email}</Text>
        <View className="mt-2 rounded-full bg-emerald-100 px-3 py-1">
          <Text className="text-xs font-semibold text-emerald-800">
            {getRoleLabel(user?.role)}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View className="mb-6 flex-row rounded-xl border border-slate-200 bg-slate-50 p-1">
        <TouchableOpacity
          onPress={() => {
            setActiveTab('ver');
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`flex-1 rounded-lg py-2 ${
            activeTab === 'ver' ? 'bg-white shadow-sm' : ''
          }`}
        >
          <Text
            className={`text-center text-sm font-medium ${
              activeTab === 'ver' ? 'text-emerald-700' : 'text-slate-600'
            }`}
          >
            Ver
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setActiveTab('editar');
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`flex-1 rounded-lg py-2 ${
            activeTab === 'editar' ? 'bg-white shadow-sm' : ''
          }`}
        >
          <Text
            className={`text-center text-sm font-medium ${
              activeTab === 'editar' ? 'text-emerald-700' : 'text-slate-600'
            }`}
          >
            Editar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setActiveTab('password');
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`flex-1 rounded-lg py-2 ${
            activeTab === 'password' ? 'bg-white shadow-sm' : ''
          }`}
        >
          <Text
            className={`text-center text-sm font-medium ${
              activeTab === 'password' ? 'text-emerald-700' : 'text-slate-600'
            }`}
          >
            Seguridad
          </Text>
        </TouchableOpacity>
      </View>

      {/* Feedback Messages */}
      {successMessage ? (
        <View className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4">
          <Text className="text-center text-sm font-medium text-green-800">
            {successMessage}
          </Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <Text className="text-center text-sm font-medium text-red-800">
            {errorMessage}
          </Text>
        </View>
      ) : null}

      {/* TAB CONTENT */}
      {activeTab === 'ver' && <ProfileViewTab user={user} />}

      {activeTab === 'editar' && (
        <ProfileEditTab
          isSubmitting={isSubmitting}
          nombre={nombre}
          setNombre={setNombre}
          apellidoPaterno={apellidoPaterno}
          setApellidoPaterno={setApellidoPaterno}
          apellidoMaterno={apellidoMaterno}
          setApellidoMaterno={setApellidoMaterno}
          telefono={telefono}
          setTelefono={setTelefono}
          fechaNacimiento={fechaNacimiento}
          setFechaNacimiento={setFechaNacimiento}
          sexo={sexo}
          setSexo={setSexo}
          domicilio={domicilio}
          setDomicilio={setDomicilio}
          selectedMunicipioNombre={selectedMunicipioNombre}
          setShowMunicipioModal={setShowMunicipioModal}
          selectedMunicipioId={selectedMunicipioId}
          setErrorMessage={setErrorMessage}
          setShowLocalidadModal={setShowLocalidadModal}
          localidadNombre={localidadNombre}
          handleUpdateProfile={handleUpdateProfile}
        />
      )}

      {activeTab === 'password' && (
        <ProfilePasswordTab
          isSubmitting={isSubmitting}
          oldPassword={oldPassword}
          setOldPassword={setOldPassword}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          handleChangePassword={handleChangePassword}
        />
      )}

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
