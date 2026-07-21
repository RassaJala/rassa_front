import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';

import { useNetInfo } from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import axios from 'axios';

import DatePickerModal from '@/components/DatePickerModal';
import type {
  ProfileFormFields,
  ProfileLocationFields,
} from '@/components/Profile/ProfileEditTab';
import ProfileEditTab from '@/components/Profile/ProfileEditTab';
import ProfilePasswordTab from '@/components/Profile/ProfilePasswordTab';
import ProfileViewTab from '@/components/Profile/ProfileViewTab';
import { useCatalogs } from '@/hooks/useCatalogs';
import { useAuth } from '@/store/AuthContext';
import { getRoleLabel } from '@/utils/labels';
import {
  cleanPhoneNumber,
  formatPhoneNumber,
  MIN_PASSWORD_LENGTH,
  validateBirthdate,
  validatePassword,
  validatePhone,
} from '@/utils/validation';

type ActiveTab = 'ver' | 'editar';

const PASSWORD_CHANGE_LOGOUT_DELAY_MS = 2000;

function validateProfileEdit(
  nombre: string,
  apellidoPaterno: string,
  rawTelefono: string,
  fechaNacimiento: string,
  domicilio: string,
  localidadId: number | null,
): string | null {
  if (
    !nombre.trim() ||
    !apellidoPaterno.trim() ||
    !rawTelefono ||
    !fechaNacimiento.trim() ||
    !domicilio.trim() ||
    localidadId === null
  ) {
    return 'Por favor, completa todos los campos obligatorios.';
  }

  const phoneErr = validatePhone(rawTelefono);
  if (phoneErr) return phoneErr;

  const birthdateErr = validateBirthdate(fechaNacimiento);
  if (birthdateErr) return birthdateErr;

  return null;
}

function validatePasswordChange(
  oldPass: string,
  newPass: string,
  confirmPass: string,
): string | null {
  if (!oldPass || !newPass || !confirmPass) {
    return 'Por favor, completa todos los campos.';
  }

  const newPassErr = validatePassword(newPass);
  if (newPassErr) {
    return `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  if (newPass !== confirmPass) {
    return 'La confirmación de la contraseña no coincide.';
  }

  if (oldPass === newPass) {
    return 'La nueva contraseña debe ser diferente a la actual.';
  }

  return null;
}

function getPasswordChangeErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    return 'Sesión expirada o no autorizada.';
  }

  return error instanceof Error
    ? error.message
    : 'Error al cambiar contraseña.';
}

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
  // eslint-disable-next-line no-undef -- setTimeout is global in RN
  const logoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (logoutTimeoutRef.current) {
        // eslint-disable-next-line no-undef -- clearTimeout is global in RN
        clearTimeout(logoutTimeoutRef.current);
        void logout();
      }
    };
  }, [logout]);

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
    const validationError = validateProfileEdit(
      nombre,
      apellidoPaterno,
      rawTelefono,
      fechaNacimiento,
      domicilio,
      catalog.localidadId,
    );

    if (validationError) {
      setErrorMessage(validationError);
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
        fk_localidad: catalog.localidadId ?? null,
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

    const validationError = validatePasswordChange(
      oldPassword,
      newPassword,
      confirmPassword,
    );

    if (validationError) {
      setErrorMessage(validationError);
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
      logoutTimeoutRef.current = setTimeout(() => {
        void logout();
      }, PASSWORD_CHANGE_LOGOUT_DELAY_MS);
    } catch (error) {
      if (isMounted.current) {
        setErrorMessage(getPasswordChangeErrorMessage(error));
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
      className="dark:bg-gray-955 flex-1 bg-gray-50 px-4 py-4"
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
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {user?.email}
        </Text>
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
        <View className="dark:bg-red-955/20 mb-4 rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-900/50">
          <Text className="text-center text-sm font-bold text-red-600 dark:text-red-400">
            {errorMessage}
          </Text>
        </View>
      ) : null}

      {/* Tab Contents */}
      {activeTab === 'ver' && <ProfileViewTab user={user} />}

      {activeTab === 'editar' && (
        <>
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
          <View className="mt-4">
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
          </View>
        </>
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
  tabsButtons: {
    marginBottom: 24,
  },
});
