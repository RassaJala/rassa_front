import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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

import DatePickerModal from '@/components/DatePickerModal';
import { useCatalogs } from '@/hooks/useCatalogs';
import { useAuth } from '@/store/AuthContext';
import type { User } from '@/types';
import { getRoleLabel } from '@/utils/labels';
import {
  cleanAddress,
  cleanName,
  cleanPhoneNumber,
  formatPhoneNumber,
  validateBirthdate,
  validatePhone,
} from '@/utils/validation';

import AdminChangePassword from './AdminChangePassword';
import { useProfileColors } from './profileColors';

// ── Validation ──────────────────────────────────────────
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

// ── Props ───────────────────────────────────────────────
interface AdminProfileEditFormProps {
  readonly user: User | null;
  readonly onUpdateSuccess: (message: string) => void;
  readonly onCancel: () => void;
}

// ── Component ──────────────────────────────────────────
export default function AdminProfileEditForm({
  user,
  onUpdateSuccess,
  onCancel,
}: AdminProfileEditFormProps): React.JSX.Element {
  const c = useProfileColors();
  const { updateProfile } = useAuth();
  const netInfo = useNetInfo();
  const isMounted = useRef(true);

  // ── Form state ─────────────────────────────────────
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
    user?.municipio_id ?? null,
    user?.localidad ?? null,
    user?.municipio_nombre ?? '',
    user?.localidad_nombre ?? '',
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [showMunicipioDialog, setShowMunicipioDialog] = useState(false);
  const [showLocalidadDialog, setShowLocalidadDialog] = useState(false);

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

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Sync state if user data loads late
  const syncLocalidadId = catalog.setLocalidadId;
  const syncLocalidadNombre = catalog.setLocalidadNombre;

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
        syncLocalidadId(user.localidad);
        syncLocalidadNombre(user.localidad_nombre ?? '');
      }
    }
  }, [user, syncLocalidadId, syncLocalidadNombre]);

  // ── Handlers ───────────────────────────────────────
  async function handleUpdateProfile(): Promise<void> {
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
        onUpdateSuccess('Perfil actualizado exitosamente.');
      }
    } catch (error) {
      if (isMounted.current) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Error al actualizar perfil.',
        );
      }
    } finally {
      if (isMounted.current) {
        setIsSubmitting(false);
      }
    }
  }

  function handlePasswordChanged(): void {
    onUpdateSuccess('Contraseña cambiada exitosamente.');
  }

  function handleCancel(): void {
    setErrorMessage(null);
    setSuccessMessage(null);
    onCancel();
  }

  // ── Render feedback ─────────────────────────────────
  function renderFeedback(): React.JSX.Element | null {
    return (
      <>
        {successMessage ? (
          <View
            style={{
              marginBottom: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.brand,
              backgroundColor: c.accentBg,
              padding: 14,
            }}
          >
            <Text
              style={{
                textAlign: 'center',
                fontSize: 14,
                fontWeight: '600',
                color: c.brand,
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
              borderColor: c.errorColor,
              backgroundColor: c.errorBg,
              padding: 14,
            }}
          >
            <Text
              style={{
                textAlign: 'center',
                fontSize: 14,
                fontWeight: '600',
                color: c.errorColor,
              }}
            >
              {errorMessage}
            </Text>
          </View>
        ) : null}
      </>
    );
  }

  // ── Change password section ─────────────────────────
  function renderChangePassword(): React.JSX.Element {
    return (
      <AdminChangePassword
        onPasswordChanged={handlePasswordChanged}
      />
    );
  }

  // ── Municipio dialog ────────────────────────────────
  function renderMunicipioDialog(): React.JSX.Element {
    return (
      <Portal>
        <Dialog
          visible={showMunicipioDialog}
          onDismiss={() => setShowMunicipioDialog(false)}
          style={{ backgroundColor: c.surface }}
        >
          <Dialog.Title style={{ color: c.fg }}>
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
                    borderBottomColor: c.border,
                    paddingVertical: 16,
                  }}
                >
                  <Text style={{ fontSize: 16, color: c.fg }}>
                    {item.nombre}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setShowMunicipioDialog(false)}
              textColor={c.brand}
            >
              Cerrar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  }

  // ── Localidad dialog ────────────────────────────────
  function renderLocalidadDialog(): React.JSX.Element {
    return (
      <Portal>
        <Dialog
          visible={showLocalidadDialog}
          onDismiss={() => setShowLocalidadDialog(false)}
          style={{ backgroundColor: c.surface }}
        >
          <Dialog.Title style={{ color: c.fg }}>
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
                    borderBottomColor: c.border,
                    paddingVertical: 16,
                  }}
                >
                  <Text style={{ fontSize: 16, color: c.fg }}>
                    {item.nombre}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setShowLocalidadDialog(false)}
              textColor={c.brand}
            >
              Cerrar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  }

  // ── Main render ─────────────────────────────────────
  return (
    <>
      {/* Avatar + Rol (read-only) */}
      <View
        style={{
          alignItems: 'center',
          backgroundColor: c.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border,
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
            backgroundColor: c.accentBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 28, fontWeight: '700', color: c.brand }}>
            {user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'A'}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: c.fg,
            letterSpacing: -0.2,
          }}
        >
          {user?.email}
        </Text>
        <View
          style={{
            marginTop: 8,
            backgroundColor: c.accentBg,
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 20,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: c.brand }}>
            {getRoleLabel(user?.role)}
          </Text>
        </View>
      </View>

      {renderFeedback()}

      {/* Formulario */}
      <View
        style={{
          backgroundColor: c.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border,
          padding: 20,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: c.fg,
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
            color: c.muted,
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
          placeholderTextColor={c.placeholderColor}
          value={nombre}
          onChangeText={(val) => setNombre(cleanName(val))}
          style={{ marginBottom: 14, backgroundColor: c.inputBg }}
          theme={{
            colors: {
              text: c.inputText,
              primary: c.brand,
              outline: c.border,
              placeholder: c.placeholderColor,
            },
          }}
        />

        {/* Apellido Paterno */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: c.muted,
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
          placeholderTextColor={c.placeholderColor}
          value={apellidoPaterno}
          onChangeText={(val) => setApellidoPaterno(cleanName(val))}
          style={{ marginBottom: 14, backgroundColor: c.inputBg }}
          theme={{
            colors: {
              text: c.inputText,
              primary: c.brand,
              outline: c.border,
              placeholder: c.placeholderColor,
            },
          }}
        />

        {/* Apellido Materno */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: c.muted,
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
          placeholderTextColor={c.placeholderColor}
          value={apellidoMaterno}
          onChangeText={(val) => setApellidoMaterno(cleanName(val))}
          style={{ marginBottom: 14, backgroundColor: c.inputBg }}
          theme={{
            colors: {
              text: c.inputText,
              primary: c.brand,
              outline: c.border,
              placeholder: c.placeholderColor,
            },
          }}
        />

        {/* Teléfono */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: c.muted,
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
          placeholderTextColor={c.placeholderColor}
          keyboardType="phone-pad"
          value={telefono}
          onChangeText={(val) => setTelefono(formatPhoneNumber(val))}
          style={{ marginBottom: 14, backgroundColor: c.inputBg }}
          theme={{
            colors: {
              text: c.inputText,
              primary: c.brand,
              outline: c.border,
              placeholder: c.placeholderColor,
            },
          }}
        />

        {/* Fecha de Nacimiento */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: c.muted,
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
            placeholderTextColor={c.placeholderColor}
            value={fechaNacimiento}
            showSoftInputOnFocus={false}
            onChangeText={setFechaNacimiento}
            style={{ marginBottom: 14, backgroundColor: c.inputBg }}
            theme={{
              colors: {
                text: c.inputText,
                primary: c.brand,
                outline: c.border,
                placeholder: c.placeholderColor,
              },
            }}
          />
        </TouchableOpacity>

        {/* Género */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: c.muted,
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
                secondaryContainer: c.accentBg,
                onSecondaryContainer: c.brand,
                outline: c.border,
              },
            }}
          />
        </View>

        {/* Dirección */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: c.muted,
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
          placeholderTextColor={c.placeholderColor}
          value={domicilio}
          onChangeText={(val) => setDomicilio(cleanAddress(val))}
          style={{ marginBottom: 14, backgroundColor: c.inputBg }}
          theme={{
            colors: {
              text: c.inputText,
              primary: c.brand,
              outline: c.border,
              placeholder: c.placeholderColor,
            },
          }}
        />

        {/* Selector de Municipio */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: c.muted,
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
              borderColor: c.errorColor,
              backgroundColor: c.errorBg,
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}
          >
            <Text style={{ fontSize: 14, color: c.errorColor, flex: 1 }}>
              {locationFields.errorMunicipios}
            </Text>
            <TouchableOpacity
              onPress={() => void locationFields.refetchMunicipios()}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: c.errorColor,
                }}
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
              borderColor: c.border,
              backgroundColor: c.inputBg,
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            {locationFields.isLoadingMunicipios ? (
              <ActivityIndicator size="small" color={c.brand} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons
                  name="map-marker-radius-outline"
                  size={20}
                  color={c.muted}
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={{
                    fontSize: 16,
                    color: locationFields.selectedMunicipioNombre
                      ? c.inputText
                      : c.placeholderColor,
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
            color: c.muted,
            marginBottom: 4,
            textTransform: 'uppercase',
            letterSpacing: 0.04,
          }}
        >
          Localidad *
        </Text>
        {locationFields.selectedMunicipioId && locationFields.errorLocalidades ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.errorColor,
              backgroundColor: c.errorBg,
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}
          >
            <Text style={{ fontSize: 14, color: c.errorColor, flex: 1 }}>
              {locationFields.errorLocalidades}
            </Text>
            <TouchableOpacity
              onPress={() => void locationFields.refetchLocalidades()}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: c.errorColor,
                }}
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
              borderColor: c.border,
              backgroundColor: c.inputBg,
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            {locationFields.isLoadingLocalidades ? (
              <ActivityIndicator size="small" color={c.brand} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons
                  name="city-variant-outline"
                  size={20}
                  color={c.muted}
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={{
                    fontSize: 16,
                    color: locationFields.localidadNombre
                      ? c.inputText
                      : c.placeholderColor,
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
            onPress={handleCancel}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.border,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: c.muted }}>
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
              backgroundColor: c.brand,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed || isSubmitting ? 0.7 : 1,
            })}
          >
            {isSubmitting ? (
              <ActivityIndicator color={c.white} size="small" />
            ) : (
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '700',
                  color: c.white,
                }}
              >
                Guardar
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      {renderChangePassword()}

      {/* Dialogs */}
      {renderMunicipioDialog()}
      {renderLocalidadDialog()}

      <DatePickerModal
        visible={isDatePickerVisible}
        onClose={() => setIsDatePickerVisible(false)}
        onSelectDate={setFechaNacimiento}
        initialDate={fechaNacimiento}
      />
    </>
  );
}
