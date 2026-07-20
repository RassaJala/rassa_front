import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Button,
  Dialog,
  Portal,
  SegmentedButtons,
  TextInput,
} from 'react-native-paper';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import axios from 'axios';

import DatePickerModal from '@/components/DatePickerModal';
import { useCatalogs } from '@/hooks/useCatalogs';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { AdminStackParamList } from '@/types';
import { getGenderLabel, getRoleLabel } from '@/utils/labels';
import {
  cleanAddress,
  cleanName,
  cleanPhoneNumber,
  formatPhoneNumber,
  MIN_PASSWORD_LENGTH,
  validateBirthdate,
  validatePassword,
  validatePhone,
} from '@/utils/validation';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'AdminProfile'>;

interface Props {
  readonly navigation: Nav;
}

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

function getProfileError(error: unknown): string {
  return axios.isAxiosError(error) && error.response?.data
    ? typeof error.response.data === 'string'
      ? error.response.data
      : ((error.response.data as Record<string, unknown>)?.detail?.toString() ??
        (error.response.data as Record<string, unknown>)?.message?.toString() ??
        'Error al actualizar perfil.')
    : error instanceof Error
      ? error.message
      : 'Error al actualizar perfil.';
}

function validateAdminPasswordChange(
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

export default function AdminProfileScreen({
  navigation,
}: Props): React.JSX.Element {
  const { colorScheme } = useTheme();
  const { user, updateProfile, changePassword } = useAuth();
  const netInfo = useNetInfo();
  const isMounted = useRef(true);
  const isDark = colorScheme === 'dark';

  // ── Colors ─────────────────────────────────────────────
  const bg = isDark ? '#1A211B' : '#F5F7F0';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const border = isDark ? '#353D35' : '#E2E6DF';
  const brand = isDark ? '#4A8A63' : '#24563C';
  const accentBg = isDark ? 'rgba(74,138,99,0.12)' : 'rgba(36,86,60,0.07)';
  const inputBg = isDark ? '#1A211B' : '#F9FAF8';
  const inputText = isDark ? '#E8EAE4' : '#2D3328';
  const placeholderColor = isDark ? '#6B7A6B' : '#9CA89C';
  const errorColor = '#DE393A';
  const errorBg = isDark ? 'rgba(222,57,58,0.12)' : 'rgba(222,57,58,0.07)';
  const white = '#FFFFFF';

  // ── UI state ───────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);

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
  const [showMunicipioDialog, setShowMunicipioDialog] = useState(false);
  const [showLocalidadDialog, setShowLocalidadDialog] = useState(false);

  // ── Change Password States ──────────────────────────
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Sync state if user data loads late or changes
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- catalog reference changes on every render
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
        fk_localidad: catalog.localidadId ?? 0,
      };

      await updateProfile(payload);
      if (isMounted.current) {
        setSuccessMessage('Perfil actualizado exitosamente.');
        setIsEditing(false);
      }
    } catch (error) {
      if (isMounted.current) {
        setErrorMessage(getProfileError(error));
      }
    } finally {
      if (isMounted.current) {
        setIsSubmitting(false);
      }
    }
  }

  // ── Handle Change Password ──────────────────────────
  async function handleChangePassword() {
    if (isChangingPassword) return;
    setSuccessMessage(null);
    setErrorMessage(null);

    if (netInfo.isConnected === false) {
      setErrorMessage('Sin conexión a Internet.');
      return;
    }

    const validationError = validateAdminPasswordChange(
      oldPassword,
      newPassword,
      confirmPassword,
    );

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsChangingPassword(true);

    try {
      await changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });

      if (isMounted.current) {
        setSuccessMessage('Contraseña cambiada exitosamente.');
        setShowPasswordForm(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      if (isMounted.current) {
        // Try to get a more specific error from the backend
        const msg =
          axios.isAxiosError(error) && error.response?.data
            ? typeof error.response.data === 'string'
              ? error.response.data
              : ((
                  error.response.data as Record<string, unknown>
                )?.old_password?.toString() ??
                (
                  error.response.data as Record<string, unknown>
                )?.new_password?.toString() ??
                (
                  error.response.data as Record<string, unknown>
                )?.detail?.toString() ??
                (
                  error.response.data as Record<string, unknown>
                )?.message?.toString() ??
                'La contraseña actual es incorrecta.')
            : error instanceof Error
              ? error.message
              : 'Error al cambiar contraseña.';
        setErrorMessage(msg);
      }
    } finally {
      if (isMounted.current) {
        setIsChangingPassword(false);
      }
    }
  }

  const locationFields = {
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

  // ── View mode ──────────────────────────────────────
  function renderViewMode(): React.JSX.Element {
    return (
      <>
        {/* Avatar + Nombre + Rol */}
        <View
          style={{
            alignItems: 'center',
            backgroundColor: surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: border,
            paddingVertical: 28,
            paddingHorizontal: 20,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: accentBg,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 32, fontWeight: '700', color: brand }}>
              {user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'A'}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 22,
              fontWeight: '700',
              color: fg,
              letterSpacing: -0.2,
            }}
          >
            {user?.nombre} {user?.apellido_paterno}
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: muted,
              marginTop: 4,
            }}
          >
            {user?.email}
          </Text>
          <View
            style={{
              marginTop: 12,
              backgroundColor: accentBg,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 20,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: brand,
              }}
            >
              {getRoleLabel(user?.role)}
            </Text>
          </View>
        </View>

        {/* Información Personal */}
        <View
          style={{
            backgroundColor: surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: border,
            padding: 20,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: fg,
              letterSpacing: -0.15,
              marginBottom: 20,
            }}
          >
            Información Personal
          </Text>

          <InfoRow
            label="Nombre Completo"
            value={`${user?.nombre ?? ''} ${user?.apellido_paterno ?? ''}${user?.apellido_materno ? ` ${user.apellido_materno}` : ''}`}
            icon="account-outline"
            muted={muted}
            fg={fg}
          />
          <View
            style={{ height: 1, backgroundColor: border, marginVertical: 14 }}
          />
          <InfoRow
            label="Teléfono"
            value={user?.telefono ?? 'No especificado'}
            icon="phone-outline"
            muted={muted}
            fg={fg}
          />
          <View
            style={{ height: 1, backgroundColor: border, marginVertical: 14 }}
          />
          <InfoRow
            label="Correo Electrónico"
            value={user?.email ?? ''}
            icon="email-outline"
            muted={muted}
            fg={fg}
          />
          <View
            style={{ height: 1, backgroundColor: border, marginVertical: 14 }}
          />
          <InfoRow
            label="Fecha de Nacimiento"
            value={user?.fecha_nacimiento ?? 'No especificado'}
            icon="cake-variant-outline"
            muted={muted}
            fg={fg}
          />
          <View
            style={{ height: 1, backgroundColor: border, marginVertical: 14 }}
          />
          <InfoRow
            label="Género"
            value={
              user?.genero ? getGenderLabel(user.genero) : 'No especificado'
            }
            icon="gender-male-female"
            muted={muted}
            fg={fg}
          />
          <View
            style={{ height: 1, backgroundColor: border, marginVertical: 14 }}
          />
          <InfoRow
            label="Dirección"
            value={user?.direccion ?? 'No especificado'}
            icon="map-marker-outline"
            muted={muted}
            fg={fg}
          />
          <View
            style={{ height: 1, backgroundColor: border, marginVertical: 14 }}
          />
          <InfoRow
            label="Localidad"
            value={user?.localidad_nombre ?? 'No especificado'}
            icon="city-variant-outline"
            muted={muted}
            fg={fg}
          />
          <View
            style={{ height: 1, backgroundColor: border, marginVertical: 14 }}
          />
          <InfoRow
            label="Municipio"
            value={user?.municipio_nombre ?? 'No especificado'}
            icon="map-marker-radius-outline"
            muted={muted}
            fg={fg}
          />
        </View>

        {renderPasswordSection()}
      </>
    );
  }

  // ── Edit form ──────────────────────────────────────
  function renderEditForm(): React.JSX.Element {
    return (
      <>
        {/* Avatar + Rol (read-only) */}
        <View
          style={{
            alignItems: 'center',
            backgroundColor: surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: border,
            paddingVertical: 24,
            paddingHorizontal: 20,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: accentBg,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 28, fontWeight: '700', color: brand }}>
              {user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'A'}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: fg,
              letterSpacing: -0.2,
            }}
          >
            {user?.email}
          </Text>
          <View
            style={{
              marginTop: 8,
              backgroundColor: accentBg,
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 20,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: brand }}>
              {getRoleLabel(user?.role)}
            </Text>
          </View>
        </View>

        {/* Formulario */}
        <View
          style={{
            backgroundColor: surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: border,
            padding: 20,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: fg,
              letterSpacing: -0.15,
              marginBottom: 20,
            }}
          >
            Editar Información
          </Text>

          {/* Nombre */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: muted,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: 0.04,
            }}
          >
            Nombre *
          </Text>
          <TextInput
            mode="outlined"
            placeholder="Nombre"
            placeholderTextColor={placeholderColor}
            value={nombre}
            onChangeText={(val) => setNombre(cleanName(val))}
            style={{ marginBottom: 14, backgroundColor: inputBg }}
            theme={{
              colors: {
                text: inputText,
                primary: brand,
                outline: border,
                placeholder: placeholderColor,
              },
            }}
          />

          {/* Apellido Paterno */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: muted,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: 0.04,
            }}
          >
            Apellido Paterno *
          </Text>
          <TextInput
            mode="outlined"
            placeholder="Apellido Paterno"
            placeholderTextColor={placeholderColor}
            value={apellidoPaterno}
            onChangeText={(val) => setApellidoPaterno(cleanName(val))}
            style={{ marginBottom: 14, backgroundColor: inputBg }}
            theme={{
              colors: {
                text: inputText,
                primary: brand,
                outline: border,
                placeholder: placeholderColor,
              },
            }}
          />

          {/* Apellido Materno */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: muted,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: 0.04,
            }}
          >
            Apellido Materno
          </Text>
          <TextInput
            mode="outlined"
            placeholder="Apellido Materno"
            placeholderTextColor={placeholderColor}
            value={apellidoMaterno}
            onChangeText={(val) => setApellidoMaterno(cleanName(val))}
            style={{ marginBottom: 14, backgroundColor: inputBg }}
            theme={{
              colors: {
                text: inputText,
                primary: brand,
                outline: border,
                placeholder: placeholderColor,
              },
            }}
          />

          {/* Teléfono */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: muted,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: 0.04,
            }}
          >
            Teléfono *
          </Text>
          <TextInput
            mode="outlined"
            placeholder="xxx-xxx-xx-xx"
            placeholderTextColor={placeholderColor}
            keyboardType="phone-pad"
            value={telefono}
            onChangeText={(val) => setTelefono(formatPhoneNumber(val))}
            style={{ marginBottom: 14, backgroundColor: inputBg }}
            theme={{
              colors: {
                text: inputText,
                primary: brand,
                outline: border,
                placeholder: placeholderColor,
              },
            }}
          />

          {/* Fecha de Nacimiento */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: muted,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: 0.04,
            }}
          >
            Fecha de Nacimiento *
          </Text>
          <TouchableOpacity onPress={() => setIsDatePickerVisible(true)}>
            <TextInput
              mode="outlined"
              placeholder="AAAA-MM-DD"
              placeholderTextColor={placeholderColor}
              value={fechaNacimiento}
              showSoftInputOnFocus={false}
              onChangeText={setFechaNacimiento}
              style={{ marginBottom: 14, backgroundColor: inputBg }}
              theme={{
                colors: {
                  text: inputText,
                  primary: brand,
                  outline: border,
                  placeholder: placeholderColor,
                },
              }}
            />
          </TouchableOpacity>

          {/* Género */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: muted,
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 0.04,
            }}
          >
            Género *
          </Text>
          <View style={{ marginBottom: 14, alignItems: 'flex-start' }}>
            <SegmentedButtons
              value={sexo}
              onValueChange={(val) => setSexo(val)}
              buttons={[
                { value: 'M', label: 'Masculino' },
                { value: 'F', label: 'Femenino' },
                { value: 'O', label: 'Otro' },
              ]}
              theme={{
                colors: {
                  secondaryContainer: accentBg,
                  onSecondaryContainer: brand,
                  outline: border,
                },
              }}
            />
          </View>

          {/* Dirección */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: muted,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: 0.04,
            }}
          >
            Dirección *
          </Text>
          <TextInput
            mode="outlined"
            placeholder="Calle, número, colonia"
            placeholderTextColor={placeholderColor}
            value={domicilio}
            onChangeText={(val) => setDomicilio(cleanAddress(val))}
            style={{ marginBottom: 14, backgroundColor: inputBg }}
            theme={{
              colors: {
                text: inputText,
                primary: brand,
                outline: border,
                placeholder: placeholderColor,
              },
            }}
          />

          {/* Selector de Municipio */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: muted,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: 0.04,
            }}
          >
            Municipio *
          </Text>
          {locationFields.errorMunicipios ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: errorColor,
                backgroundColor: errorBg,
                paddingHorizontal: 16,
                paddingVertical: 10,
              }}
            >
              <Text style={{ fontSize: 14, color: errorColor, flex: 1 }}>
                {locationFields.errorMunicipios}
              </Text>
              <TouchableOpacity
                onPress={() => void locationFields.refetchMunicipios()}
              >
                <Text
                  style={{ fontSize: 14, fontWeight: '600', color: errorColor }}
                >
                  Reintentar
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowMunicipioDialog(true)}
              disabled={locationFields.isLoadingMunicipios}
              style={{
                marginBottom: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: inputBg,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
            >
              {locationFields.isLoadingMunicipios ? (
                <ActivityIndicator size="small" color={brand} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons
                    name="map-marker-radius-outline"
                    size={20}
                    color={muted}
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      color: locationFields.selectedMunicipioNombre
                        ? inputText
                        : placeholderColor,
                    }}
                  >
                    {locationFields.selectedMunicipioNombre ||
                      'Seleccionar Municipio'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Selector de Localidad */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: muted,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: 0.04,
            }}
          >
            Localidad *
          </Text>
          {locationFields.selectedMunicipioId &&
          locationFields.errorLocalidades ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: errorColor,
                backgroundColor: errorBg,
                paddingHorizontal: 16,
                paddingVertical: 10,
              }}
            >
              <Text style={{ fontSize: 14, color: errorColor, flex: 1 }}>
                {locationFields.errorLocalidades}
              </Text>
              <TouchableOpacity
                onPress={() => void locationFields.refetchLocalidades()}
              >
                <Text
                  style={{ fontSize: 14, fontWeight: '600', color: errorColor }}
                >
                  Reintentar
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                if (!locationFields.selectedMunicipioId) {
                  setErrorMessage('Selecciona primero un municipio.');
                  return;
                }
                setShowLocalidadDialog(true);
              }}
              disabled={locationFields.isLoadingLocalidades}
              style={{
                marginBottom: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: inputBg,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
            >
              {locationFields.isLoadingLocalidades ? (
                <ActivityIndicator size="small" color={brand} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons
                    name="city-variant-outline"
                    size={20}
                    color={muted}
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      color: locationFields.localidadNombre
                        ? inputText
                        : placeholderColor,
                    }}
                  >
                    {locationFields.localidadNombre || 'Seleccionar Localidad'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Botones */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <Pressable
              onPress={() => {
                setIsEditing(false);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: muted }}>
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              onPress={handleUpdateProfile}
              disabled={isSubmitting}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: brand,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed || isSubmitting ? 0.7 : 1,
              })}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ fontSize: 15, fontWeight: '700', color: white }}>
                  Guardar
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  // ── Change Password Section ─────────────────────────
  function renderPasswordSection(): React.JSX.Element {
    return (
      <View
        style={{
          backgroundColor: surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: border,
          padding: 20,
          marginTop: 16,
        }}
      >
        {/* Header */}
        <Pressable
          onPress={() => {
            setShowPasswordForm((prev) => !prev);
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <MaterialCommunityIcons name="lock-outline" size={22} color={brand} />
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: fg,
              letterSpacing: -0.15,
              flex: 1,
            }}
          >
            Cambiar Contraseña
          </Text>
          <MaterialCommunityIcons
            name={showPasswordForm ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={muted}
          />
        </Pressable>

        {showPasswordForm ? (
          <>
            {/* Current Password */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: muted,
                marginBottom: 4,
                marginTop: 20,
                textTransform: 'uppercase',
                letterSpacing: 0.04,
              }}
            >
              Contraseña Actual *
            </Text>
            <TextInput
              mode="outlined"
              placeholder="••••••••"
              placeholderTextColor={placeholderColor}
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
              style={{ marginBottom: 14, backgroundColor: inputBg }}
              theme={{
                colors: {
                  text: inputText,
                  primary: brand,
                  outline: border,
                  placeholder: placeholderColor,
                },
              }}
            />

            {/* New Password */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: muted,
                marginBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: 0.04,
              }}
            >
              Nueva Contraseña *
            </Text>
            <TextInput
              mode="outlined"
              placeholder="••••••••"
              placeholderTextColor={placeholderColor}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              style={{ marginBottom: 14, backgroundColor: inputBg }}
              theme={{
                colors: {
                  text: inputText,
                  primary: brand,
                  outline: border,
                  placeholder: placeholderColor,
                },
              }}
            />

            {/* Confirm Password */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: muted,
                marginBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: 0.04,
              }}
            >
              Confirmar Nueva Contraseña *
            </Text>
            <TextInput
              mode="outlined"
              placeholder="••••••••"
              placeholderTextColor={placeholderColor}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={{ marginBottom: 14, backgroundColor: inputBg }}
              theme={{
                colors: {
                  text: inputText,
                  primary: brand,
                  outline: border,
                  placeholder: placeholderColor,
                },
              }}
            />

            {/* Submit Button */}
            <Pressable
              onPress={handleChangePassword}
              disabled={isChangingPassword}
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: errorColor,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed || isChangingPassword ? 0.7 : 1,
              })}
            >
              {isChangingPassword ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: white,
                  }}
                >
                  Cambiar Contraseña
                </Text>
              )}
            </Pressable>
          </>
        ) : null}
      </View>
    );
  }

  // ── Header ──────────────────────────────────────────
  function renderHeader(): React.JSX.Element {
    return (
      <View
        style={{
          paddingTop: 56,
          paddingHorizontal: 20,
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => {
            if (isEditing) {
              setIsEditing(false);
              setErrorMessage(null);
              setSuccessMessage(null);
            } else {
              navigation.goBack();
            }
          }}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: surface,
            borderWidth: 1,
            borderColor: border,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={fg} />
        </Pressable>
        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            letterSpacing: -0.3,
            color: fg,
            flex: 1,
          }}
        >
          {isEditing ? 'Editar Perfil' : 'Mi Perfil'}
        </Text>
        {!isEditing ? (
          <Pressable
            onPress={() => {
              setIsEditing(true);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: brand,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialCommunityIcons name="pencil" size={22} color="#fff" />
          </Pressable>
        ) : null}
      </View>
    );
  }

  // ── Feedback messages ──────────────────────────────
  function renderFeedback(): React.JSX.Element | null {
    return (
      <>
        {successMessage ? (
          <View
            style={{
              marginBottom: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: brand,
              backgroundColor: accentBg,
              padding: 14,
            }}
          >
            <Text
              style={{
                textAlign: 'center',
                fontSize: 14,
                fontWeight: '600',
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
              borderRadius: 12,
              borderWidth: 1,
              borderColor: errorColor,
              backgroundColor: errorBg,
              padding: 14,
            }}
          >
            <Text
              style={{
                textAlign: 'center',
                fontSize: 14,
                fontWeight: '600',
                color: errorColor,
              }}
            >
              {errorMessage}
            </Text>
          </View>
        ) : null}
      </>
    );
  }

  // ── Dialogs ─────────────────────────────────────────
  function renderDialogs(): React.JSX.Element {
    return (
      <>
        <Portal>
          <Dialog
            visible={showMunicipioDialog}
            onDismiss={() => setShowMunicipioDialog(false)}
            style={{ backgroundColor: surface }}
          >
            <Dialog.Title style={{ color: fg }}>
              Seleccionar Municipio
            </Dialog.Title>
            <Dialog.Content>
              <FlatList
                data={locationFields.municipios}
                keyExtractor={(item) => String(item.id_municipio)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      locationFields.handleSelectMunicipio(
                        item.id_municipio,
                        item.nombre,
                      );
                      setShowMunicipioDialog(false);
                    }}
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: border,
                      paddingVertical: 16,
                    }}
                  >
                    <Text style={{ fontSize: 16, color: fg }}>
                      {item.nombre}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button
                onPress={() => setShowMunicipioDialog(false)}
                textColor={brand}
              >
                Cerrar
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
        <Portal>
          <Dialog
            visible={showLocalidadDialog}
            onDismiss={() => setShowLocalidadDialog(false)}
            style={{ backgroundColor: surface }}
          >
            <Dialog.Title style={{ color: fg }}>
              Seleccionar Localidad
            </Dialog.Title>
            <Dialog.Content>
              <FlatList
                data={locationFields.localidades}
                keyExtractor={(item) => String(item.id_localidad)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      locationFields.handleSelectLocalidad(
                        item.id_localidad,
                        item.nombre,
                      );
                      setShowLocalidadDialog(false);
                    }}
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: border,
                      paddingVertical: 16,
                    }}
                  >
                    <Text style={{ fontSize: 16, color: fg }}>
                      {item.nombre}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button
                onPress={() => setShowLocalidadDialog(false)}
                textColor={brand}
              >
                Cerrar
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
        <DatePickerModal
          visible={isDatePickerVisible}
          onClose={() => setIsDatePickerVisible(false)}
          onSelectDate={setFechaNacimiento}
          initialDate={fechaNacimiento}
        />
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {renderHeader()}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        {renderFeedback()}
        {isEditing ? renderEditForm() : renderViewMode()}
      </ScrollView>
      {renderDialogs()}
    </View>
  );
}

// ── Componente interno para fila de información (solo vista) ──
interface InfoRowProps {
  readonly label: string;
  readonly value: string;
  readonly icon: string;
  readonly muted: string;
  readonly fg: string;
}

function InfoRow({
  label,
  value,
  icon,
  muted,
  fg,
}: InfoRowProps): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <MaterialCommunityIcons
        name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={22}
        color={muted}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: muted,
            letterSpacing: 0.04,
            textTransform: 'uppercase',
            marginBottom: 2,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '500',
            color: fg,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
