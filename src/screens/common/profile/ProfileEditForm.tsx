import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { useNetInfo } from '@react-native-community/netinfo';

import { useCatalogs } from '@/hooks/useCatalogs';
import { useAuth } from '@/store/AuthContext';
import type { User } from '@/types';
import {
  cleanPhoneNumber,
  formatPhoneNumber,
  validateProfileEdit,
} from '@/utils/validation';

import CatalogDialogs from './CatalogDialogs';
import EditFormBody from './EditFormBody';
import FeedbackBanner from './FeedbackBanner';
import { useProfileColors } from './profileColors';
import ProfileHeader from './ProfileHeader';

// ── Props ───────────────────────────────────────────────
interface ProfileEditFormProps {
  readonly user: User | null;
  readonly onUpdateSuccess: (message: string) => void;
  readonly onCancel: () => void;
  readonly onOpenDatePicker: (currentDate: string) => void;
  readonly registerDatePicked: (fn: (date: string) => void) => void;
}

// ── Component ──────────────────────────────────────────
export default function ProfileEditForm({
  user,
  onUpdateSuccess,
  onCancel,
  onOpenDatePicker,
  registerDatePicked,
}: ProfileEditFormProps): React.JSX.Element {
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
  const [showMunicipioDialog, setShowMunicipioDialog] = useState(false);
  const [showLocalidadDialog, setShowLocalidadDialog] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    registerDatePicked(setFechaNacimiento);
  }, [registerDatePicked]);

  const prevUserRef = useRef(user);
  useEffect(() => {
    if (user && user !== prevUserRef.current) {
      prevUserRef.current = user;
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
    // Only re-sync when the user object identity changes (e.g. after save).
    // `catalog` reference changes every render and must NOT be a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
      await updateProfile({
        nombre: nombre.trim(),
        apellido_paterno: apellidoPaterno.trim(),
        apellido_materno: apellidoMaterno.trim() || null,
        telefono: rawTelefono,
        fecha_nacimiento: fechaNacimiento,
        sexo,
        domicilio: domicilio.trim(),
        fk_localidad: catalog.localidadId ?? null,
      });
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
      if (isMounted.current) setIsSubmitting(false);
    }
  }

  function handleCancel(): void {
    setErrorMessage(null);
    setSuccessMessage(null);
    onCancel();
  }

  // ── Render ─────────────────────────────────────────
  return (
    <>
      <ProfileHeader
        user={user}
        colors={c}
        avatarSize={64}
        paddingVertical={24}
      >
        <Text className="text-rassa-fg dark:text-rassa-fg-dark text-lg font-bold tracking-tight">
          {user?.email}
        </Text>
      </ProfileHeader>

      <FeedbackBanner type="success" message={successMessage} colors={c} />
      <FeedbackBanner type="error" message={errorMessage} colors={c} />

      <View className="border-rassa-border bg-rassa-surface dark:border-rassa-border-dark dark:bg-rassa-surface-dark rounded-2xl border p-5">
        <EditFormBody
          colors={c}
          nombre={nombre}
          apellidoPaterno={apellidoPaterno}
          apellidoMaterno={apellidoMaterno}
          telefono={telefono}
          fechaNacimiento={fechaNacimiento}
          sexo={sexo}
          domicilio={domicilio}
          isSubmitting={isSubmitting}
          selectedMunicipioNombre={catalog.selectedMunicipioNombre}
          isLoadingMunicipios={catalog.isLoadingMunicipios}
          errorMunicipios={catalog.errorMunicipios}
          localidadNombre={catalog.localidadNombre}
          isLoadingLocalidades={catalog.isLoadingLocalidades}
          errorLocalidades={catalog.errorLocalidades}
          selectedMunicipioId={catalog.selectedMunicipioId}
          onNombreChange={setNombre}
          onApellidoPaternoChange={setApellidoPaterno}
          onApellidoMaternoChange={setApellidoMaterno}
          onTelefonoChange={setTelefono}
          onSexoChange={setSexo}
          onDomicilioChange={setDomicilio}
          onOpenDatePicker={onOpenDatePicker}
          onOpenMunicipioDialog={() => setShowMunicipioDialog(true)}
          onOpenLocalidadDialog={() => setShowLocalidadDialog(true)}
          onRetryMunicipios={() => void catalog.refetchMunicipios()}
          onRetryLocalidades={() => void catalog.refetchLocalidades()}
          onSetError={setErrorMessage}
          onCancel={handleCancel}
          onSave={handleUpdateProfile}
        />
      </View>

      <CatalogDialogs
        showMunicipioDialog={showMunicipioDialog}
        showLocalidadDialog={showLocalidadDialog}
        onCloseMunicipio={() => setShowMunicipioDialog(false)}
        onCloseLocalidad={() => setShowLocalidadDialog(false)}
        municipios={catalog.municipios}
        localidades={catalog.localidades}
        onSelectMunicipio={catalog.handleSelectMunicipio}
        onSelectLocalidad={catalog.handleSelectLocalidad}
        colors={c}
      />
    </>
  );
}
