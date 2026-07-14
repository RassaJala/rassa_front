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
import * as Sentry from '@sentry/react-native';

import CatalogSelector from '@/components/CatalogSelector';
import DatePickerModal from '@/components/DatePickerModal';
import { useCatalogs } from '@/hooks/useCatalogs';
import { useAuth } from '@/store/AuthContext';
import type { Localidad, Municipio } from '@/types';
import { getGenderLabel } from '@/utils/gender';
import {
  cleanAddress,
  cleanName,
  cleanPhoneNumber,
  DATE_REGEX,
  formatPhoneNumber,
  MIN_PASSWORD_LENGTH,
} from '@/utils/validation';

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
    <View className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <Text className="mb-4 border-b border-gray-200 pb-2 text-lg font-bold text-brand-ink dark:border-gray-800 dark:text-gray-100">
        Detalles Personales
      </Text>

      <View className="space-y-4">
        <View className="mb-3">
          <Text className="text-xs text-gray-500 dark:text-gray-400">Nombre Completo</Text>
          <Text className="text-base font-normal text-brand-ink dark:text-gray-200">
            {user?.nombre} {user?.apellido_paterno}{' '}
            {user?.apellido_materno ?? ''}
          </Text>
        </View>

        <View className="mb-3">
          <Text className="text-xs text-gray-500 dark:text-gray-400">Teléfono</Text>
          <Text className="text-base font-normal text-brand-ink dark:text-gray-200">
            {user?.telefono ?? 'No especificado'}
          </Text>
        </View>

        <View className="mb-3">
          <Text className="text-xs text-gray-500 dark:text-gray-400">Fecha de Nacimiento</Text>
          <Text className="text-base font-normal text-brand-ink dark:text-gray-200">
            {user?.fecha_nacimiento}
          </Text>
        </View>

        <View className="mb-3">
          <Text className="text-xs text-gray-500 dark:text-gray-400">Género</Text>
          <Text className="text-base font-normal text-brand-ink dark:text-gray-200">
            {user?.genero ? getGenderLabel(user.genero) : 'No especificado'}
          </Text>
        </View>

        <View className="mb-3">
          <Text className="text-xs text-gray-500 dark:text-gray-400">Dirección</Text>
          <Text className="text-base font-normal text-brand-ink dark:text-gray-200">
            {user?.direccion}
          </Text>
        </View>

        <View className="mb-3">
          <Text className="text-xs text-gray-500 dark:text-gray-400">Localidad</Text>
          <Text className="text-base font-normal text-brand-ink dark:text-gray-200">
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
    readonly onOpenDatePicker: () => void;
  };
}

function ProfileEditTab({
  isSubmitting,
  form,
  location,
  callbacks,
}: ProfileEditTabProps): React.JSX.Element {
  return (
    <View className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <Text className="mb-4 border-b border-gray-200 pb-2 text-lg font-bold text-brand-ink dark:border-gray-800 dark:text-gray-100">
        Editar Perfil
      </Text>

      <TextInput
        mode="outlined"
        label="Nombre *"
        className="mb-4 bg-white dark:bg-gray-900"
        placeholder="Nombre"
        value={form.nombre}
        onChangeText={(val) => form.setNombre(cleanName(val))}
      />

      <TextInput
        mode="outlined"
        label="Apellido Paterno *"
        className="mb-4 bg-white dark:bg-gray-900"
        placeholder="Apellido Paterno"
        value={form.apellidoPaterno}
        onChangeText={(val) => form.setApellidoPaterno(cleanName(val))}
      />

      <TextInput
        mode="outlined"
        label="Apellido Materno"
        className="mb-4 bg-white dark:bg-gray-900"
        placeholder="Apellido Materno"
        value={form.apellidoMaterno}
        onChangeText={(val) => form.setApellidoMaterno(cleanName(val))}
      />

      <TextInput
        mode="outlined"
        label="Teléfono *"
        className="mb-4 bg-white dark:bg-gray-900"
        placeholder="xxx-xxx-xx-xx"
        keyboardType="phone-pad"
        value={form.telefono}
        onChangeText={(val) => form.setTelefono(formatPhoneNumber(val))}
      />

      <TouchableOpacity
        testID="birthdate-pressable"
        onPress={callbacks.onOpenDatePicker}
      >
        <TextInput
          mode="outlined"
          label="Fecha de Nacimiento *"
          className="mb-4 bg-white dark:bg-gray-900"
          placeholder="AAAA-MM-DD"
          value={form.fechaNacimiento}
          showSoftInputOnFocus={false}
          onChangeText={form.setFechaNacimiento}
        />
      </TouchableOpacity>

      <Text className="mb-2 text-sm font-normal text-gray-700 dark:text-gray-300">Género *</Text>
      <SegmentedButtons
        value={form.sexo}
        onValueChange={form.setSexo}
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
        value={form.domicilio}
        onChangeText={(val) => form.setDomicilio(cleanAddress(val))}
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
        buttonColor="#DE393A"
        className="mt-4 rounded-lg"
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
    <View className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <Text className="mb-4 border-b border-gray-200 pb-2 text-lg font-bold text-brand-ink dark:border-gray-800 dark:text-gray-100">
        Cambiar Contraseña
      </Text>

      <TextInput
        testID="old-password-input"
        mode="outlined"
        label="Contraseña Actual *"
        className="mb-4 bg-white dark:bg-gray-900"
        placeholder="••••••••"
        secureTextEntry
        value={oldPassword}
        onChangeText={setOldPassword}
      />

      <TextInput
        testID="new-password-input"
        mode="outlined"
        label="Nueva Contraseña (mínimo 6 caracteres) *"
        className="mb-4 bg-white dark:bg-gray-900"
        placeholder="••••••••"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />

      <TextInput
        testID="confirm-password-input"
        mode="outlined"
        label="Confirmar Nueva Contraseña *"
        className="mb-4 bg-white dark:bg-gray-900"
        placeholder="••••••••"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <Button
        testID="change-password-button"
        mode="contained"
        disabled={isSubmitting}
        onPress={handleChangePassword}
        buttonColor="#DE393A"
        className="mt-4 rounded-lg"
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
  const [telefono, setTelefono] = useState(
    formatPhoneNumber(user?.telefono ?? ''),
  );
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
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

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
      setTelefono(formatPhoneNumber(user.telefono ?? ''));
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

    const rawTelefono = cleanPhoneNumber(telefono);
    if (
      !nombre.trim() ||
      !apellidoPaterno.trim() ||
      !rawTelefono ||
      !fechaNacimiento.trim() ||
      !domicilio.trim() ||
      catalog.localidadId === null
    ) {
      setErrorMessage('Por favor, completa todos los campos obligatorios.');
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
        nombre: nombre.trim(),
        apellido_paterno: apellidoPaterno.trim(),
        apellido_materno: apellidoMaterno.trim() || null,
        telefono: rawTelefono,
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
      className="flex-1 bg-gray-50 px-4 py-4 dark:bg-gray-955"
      contentContainerStyle={styles.scrollContent}
    >
      {/* Profile Header */}
      <View className="mb-6 items-center rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-brand-red-coral">
          <Text className="text-2xl font-bold text-white">
            {user?.nombre ? user.nombre.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <Text className="text-xl font-bold text-brand-ink dark:text-gray-100">
          {user?.nombre} {user?.apellido_paterno}
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</Text>
        <View className="mt-2 rounded-full bg-red-50 px-3 py-1 dark:bg-brand-red-coral/20">
          <Text className="text-xs font-bold text-brand-red-coral">
            {getRoleLabel(user?.role)}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <SegmentedButtons
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val);
          setErrorMessage(null);
          setSuccessMessage(null);
        }}
        buttons={[
          { value: 'ver', label: 'Ver' },
          { value: 'editar', label: 'Editar' },
          { value: 'password', label: 'Seguridad' },
        ]}
        style={styles.tabsButtons}
      />

      {/* Feedback Messages */}
      {successMessage ? (
        <View className="mb-4 rounded-xl border border-brand-green-forest bg-brand-green-forest/10 p-4">
          <Text className="text-center text-sm font-bold text-brand-green-forest">
            {successMessage}
          </Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View className="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-955/20">
          <Text className="text-center text-sm font-bold text-red-600 dark:text-red-400">
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
            onOpenDatePicker: () => setIsDatePickerVisible(true),
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
  tabsButtons: {
    marginBottom: 24,
  },
});

