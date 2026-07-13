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

import CatalogSelector from '@/components/CatalogSelector';
import { colors } from '@/constants/colors';
import { useCatalogs } from '@/hooks/useCatalogs';
import { useAuth } from '@/store/AuthContext';
import type { Localidad, Municipio } from '@/types';
import { getGenderLabel } from '@/utils/gender';
import { DATE_REGEX, MIN_PASSWORD_LENGTH } from '@/utils/validation';

type ActiveTab = 'ver' | 'editar' | 'password';

const PASSWORD_CHANGE_LOGOUT_DELAY_MS = 2000;

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
interface ProfileFormFields {
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
  readonly sexo: 'M' | 'F' | 'O';
  readonly setSexo: (val: 'M' | 'F' | 'O') => void;
  readonly domicilio: string;
  readonly setDomicilio: (val: string) => void;
}

interface ProfileLocationFields {
  readonly selectedMunicipioId: number | null;
  readonly selectedMunicipioNombre: string;
  readonly localidadId: number | null;
  readonly localidadNombre: string;
  readonly municipios: Municipio[];
  readonly localidades: Localidad[];
  readonly isLoadingMunicipios: boolean;
  readonly isLoadingLocalidades: boolean;
  readonly errorMunicipios: string | null;
  readonly errorLocalidades: string | null;
  readonly refetchMunicipios: () => void;
  readonly refetchLocalidades: () => void;
  readonly handleSelectMunicipio: (id: number, nombre: string) => void;
  readonly handleSelectLocalidad: (id: number, nombre: string) => void;
}

interface ProfileEditTabProps {
  readonly isSubmitting: boolean;
  readonly form: ProfileFormFields;
  readonly location: ProfileLocationFields;
  readonly callbacks: {
    readonly handleUpdateProfile: () => void;
    readonly setErrorMessage: (val: string | null) => void;
  };
}

function ProfileEditTab({
  isSubmitting,
  form,
  location,
  callbacks,
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
        placeholderTextColor={colors.placeholder}
        value={form.nombre}
        onChangeText={form.setNombre}
      />

      <Text className="mb-1 text-sm font-medium text-slate-700">
        Apellido Paterno *
      </Text>
      <TextInput
        className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
        placeholder="Apellido Paterno"
        placeholderTextColor={colors.placeholder}
        value={form.apellidoPaterno}
        onChangeText={form.setApellidoPaterno}
      />

      <Text className="mb-1 text-sm font-medium text-slate-700">
        Apellido Materno
      </Text>
      <TextInput
        className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
        placeholder="Apellido Materno"
        placeholderTextColor={colors.placeholder}
        value={form.apellidoMaterno}
        onChangeText={form.setApellidoMaterno}
      />

      <Text className="mb-1 text-sm font-medium text-slate-700">
        Teléfono *
      </Text>
      <TextInput
        className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
        placeholder="Teléfono"
        placeholderTextColor={colors.placeholder}
        keyboardType="phone-pad"
        value={form.telefono}
        onChangeText={form.setTelefono}
      />

      <Text className="mb-1 text-sm font-medium text-slate-700">
        Fecha de Nacimiento (AAAA-MM-DD) *
      </Text>
      <TextInput
        className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
        placeholder="AAAA-MM-DD"
        placeholderTextColor={colors.placeholder}
        value={form.fechaNacimiento}
        onChangeText={form.setFechaNacimiento}
      />

      <Text className="mb-1 text-sm font-medium text-slate-700">Género *</Text>
      <View className="mb-3 flex-row space-x-2">
        {(['M', 'F', 'O'] as const).map((g) => (
          <TouchableOpacity
            key={g}
            onPress={() => form.setSexo(g)}
            className={`flex-1 rounded-xl border py-2.5 ${
              form.sexo === g
                ? 'border-emerald-600 bg-emerald-50'
                : 'border-slate-300 bg-white'
            }`}
          >
            <Text
              className={`text-center font-medium ${
                form.sexo === g ? 'text-emerald-700' : 'text-slate-600'
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
        placeholderTextColor={colors.placeholder}
        value={form.domicilio}
        onChangeText={form.setDomicilio}
      />

      <CatalogSelector
        selectedMunicipioId={location.selectedMunicipioId}
        selectedMunicipioNombre={location.selectedMunicipioNombre}
        onSelectMunicipio={location.handleSelectMunicipio}
        localidadId={location.localidadId}
        localidadNombre={location.localidadNombre}
        onSelectLocalidad={location.handleSelectLocalidad}
        municipios={location.municipios}
        localidades={location.localidades}
        isLoadingMunicipios={location.isLoadingMunicipios}
        isLoadingLocalidades={location.isLoadingLocalidades}
        errorMunicipios={location.errorMunicipios}
        errorLocalidades={location.errorLocalidades}
        refetchMunicipios={location.refetchMunicipios}
        refetchLocalidades={location.refetchLocalidades}
        setErrorMessage={callbacks.setErrorMessage}
      />

      <Button
        testID="save-changes-button"
        mode="contained"
        disabled={isSubmitting}
        onPress={callbacks.handleUpdateProfile}
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
        testID="old-password-input"
        className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
        placeholder="••••••••"
        placeholderTextColor={colors.placeholder}
        secureTextEntry
        value={oldPassword}
        onChangeText={setOldPassword}
      />

      <Text className="mb-1 text-sm font-medium text-slate-700">
        Nueva Contraseña (mínimo 6 caracteres) *
      </Text>
      <TextInput
        testID="new-password-input"
        className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
        placeholder="••••••••"
        placeholderTextColor={colors.placeholder}
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />

      <Text className="mb-1 text-sm font-medium text-slate-700">
        Confirmar Nueva Contraseña *
      </Text>
      <TextInput
        testID="confirm-password-input"
        className="mb-4 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900"
        placeholder="••••••••"
        placeholderTextColor={colors.placeholder}
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <Button
        testID="change-password-button"
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
  const { user, updateProfile, changePassword, logout } = useAuth();
  const netInfo = useNetInfo();
  const isMounted = useRef(true);

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
  const [sexo, setSexo] = useState<'M' | 'F' | 'O'>(
    (user?.genero as 'M' | 'F' | 'O') ?? 'M',
  );
  const [domicilio, setDomicilio] = useState(user?.direccion ?? '');

  // Catalog Hook (Pass user's current values to initialize correctly)
  const catalog = useCatalogs(
    user?.localidad ?? null,
    user?.localidad ?? null,
    '',
    user?.localidad_nombre ?? '',
  );

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Change Password States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Sync state if user data loads late
  useEffect(() => {
    if (user) {
      setNombre(user.nombre ?? '');
      setApellidoPaterno(user.apellido_paterno ?? '');
      setApellidoMaterno(user.apellido_materno ?? '');
      setTelefono(user.telefono ?? '');
      setFechaNacimiento(user.fecha_nacimiento ?? '');
      setSexo((user.genero as 'M' | 'F' | 'O') ?? 'M');
      setDomicilio(user.direccion ?? '');
      if (user.localidad) {
        catalog.setLocalidadId(user.localidad);
        catalog.setLocalidadNombre(user.localidad_nombre ?? '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- catalog object reference changes on every render, including it would cause infinite rerender loop
  }, [user]);

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
      catalog.localidadId === null
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
        fk_localidad: catalog.localidadId,
      };

      await updateProfile(payload);
      if (isMounted.current) {
        setSuccessMessage('Perfil actualizado exitosamente.');
      }
    } catch (error) {
      if (isMounted.current) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Error al actualizar perfil.',
        );
      }
      Sentry.captureException(error);
    } finally {
      if (isMounted.current) {
        setIsSubmitting(false);
      }
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

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(
        `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('La confirmación de la contraseña no coincide.');
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });

      if (isMounted.current) {
        setSuccessMessage(
          'Contraseña cambiada exitosamente. Cerrando sesión...',
        );
      }
      // eslint-disable-next-line no-undef -- setTimeout is global in RN
      setTimeout(() => {
        void logout();
      }, PASSWORD_CHANGE_LOGOUT_DELAY_MS);
    } catch (error) {
      if (isMounted.current) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Error al cambiar contraseña.',
        );
      }
      Sentry.captureException(error);
    } finally {
      if (isMounted.current) {
        setIsSubmitting(false);
      }
    }
  }

  const formFields: ProfileFormFields = {
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
  };

  const locationFields: ProfileLocationFields = {
    selectedMunicipioId: catalog.selectedMunicipioId,
    selectedMunicipioNombre: catalog.selectedMunicipioNombre,
    localidadId: catalog.localidadId,
    localidadNombre: catalog.localidadNombre,
    municipios: catalog.municipios,
    localidades: catalog.localidades,
    isLoadingMunicipios: catalog.isLoadingMunicipios,
    isLoadingLocalidades: catalog.isLoadingLocalidades,
    errorMunicipios: catalog.errorMunicipios,
    errorLocalidades: catalog.errorLocalidades,
    refetchMunicipios: catalog.refetchMunicipios,
    refetchLocalidades: catalog.refetchLocalidades,
    handleSelectMunicipio: catalog.handleSelectMunicipio,
    handleSelectLocalidad: catalog.handleSelectLocalidad,
  };

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

      {/* Tab Contents */}
      {activeTab === 'ver' && <ProfileViewTab user={user} />}

      {activeTab === 'editar' && (
        <ProfileEditTab
          isSubmitting={isSubmitting}
          form={formFields}
          location={locationFields}
          callbacks={{
            handleUpdateProfile,
            setErrorMessage,
          }}
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
    marginTop: 16,
  },
  buttonContent: {
    paddingVertical: 6,
  },
});
