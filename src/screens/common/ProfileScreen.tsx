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
import { colors } from '@/constants/colors';
import { useCatalogs } from '@/hooks/useCatalogs';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import { getRoleLabel } from '@/utils/labels';
import {
  cleanPhoneNumber,
  formatPhoneNumber,
  MIN_PASSWORD_LENGTH,
  validateBirthdate,
  validatePassword,
  validatePhone,
} from '@/utils/validation';

type ActiveTab = 'ver' | 'editar' | 'password';

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
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const netInfo = useNetInfo();
  const isMounted = useRef(true);

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;

  const [activeTab, setActiveTab] = useState<ActiveTab>('ver');

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

  const catalog = useCatalogs(
    user?.localidad ?? null,
    user?.localidad ?? null,
    '',
    user?.localidad_nombre ?? '',
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- user is the only meaningful dependency; catalog and setters are stable references
  }, [user]);

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
    refetchMunicipios: () => {
      void catalog.refetchMunicipios();
    },
    refetchLocalidades: () => {
      void catalog.refetchLocalidades();
    },
    handleSelectMunicipio: catalog.handleSelectMunicipio,
    handleSelectLocalidad: catalog.handleSelectLocalidad,
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={{ padding: 16 }}>
        {/* Profile Header */}
        <View
          style={{
            marginBottom: 24,
            alignItems: 'center',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: border,
            backgroundColor: surface,
            padding: 16,
          }}
        >
          <View
            style={{
              marginBottom: 12,
              width: 64,
              height: 64,
              borderRadius: 32,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: surface,
              borderWidth: 2,
              borderColor: colors.brandRedCoral,
            }}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: '700',
                color: colors.brandRedCoral,
              }}
            >
              {user?.nombre ? user.nombre.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: fg,
              letterSpacing: -0.3,
            }}
          >
            {user?.nombre} {user?.apellido_paterno}
          </Text>
          <Text
            style={{
              marginTop: 2,
              fontSize: 14,
              color: muted,
            }}
          >
            {user?.email}
          </Text>
          <View
            style={{
              marginTop: 8,
              borderRadius: 999,
              backgroundColor: colors.admCoralBgD,
              paddingHorizontal: 12,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: colors.brandRedCoral,
              }}
            >
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
          <View
            style={{
              marginBottom: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: brand,
              backgroundColor: isDark
                ? colors.admActiveBgD
                : colors.admActiveBgL,
              padding: 16,
            }}
          >
            <Text
              style={{
                textAlign: 'center',
                fontSize: 14,
                fontWeight: '700',
                color: brand,
              }}
            >
              {successMessage}
            </Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View
            style={{
              marginBottom: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.brandRedCoral,
              backgroundColor: isDark ? colors.admCoralBgD : colors.admCoralBgL,
              padding: 16,
            }}
          >
            <Text
              style={{
                textAlign: 'center',
                fontSize: 14,
                fontWeight: '700',
                color: colors.brandRedCoral,
              }}
            >
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
              handleUpdateProfile: () => {
                void handleUpdateProfile();
              },
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
            handleChangePassword={() => {
              void handleChangePassword();
            }}
          />
        )}
        <DatePickerModal
          visible={isDatePickerVisible}
          onClose={() => setIsDatePickerVisible(false)}
          onSelectDate={setFechaNacimiento}
          initialDate={fechaNacimiento}
        />
      </View>
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
