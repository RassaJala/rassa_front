import { useCallback, useEffect, useRef, useState } from 'react';

import { AdminChangePassword } from '~/components/admin/AdminChangePassword';
import { AdminProfileForm } from '~/components/admin/AdminProfileForm';
import { AdminProfileView } from '~/components/admin/AdminProfileView';
import { Button } from '~/components/ui/Button';
import { Card } from '~/components/ui/Card';
import { PageHeader } from '~/components/layout/PageHeader';
import type {
  FieldErrors,
  Localidad,
  Municipio,
  ProfileForm,
} from '~/components/admin/types';
import api from '~/services/api';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const NAME_REGEX = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s'-]+$/;
const PHONE_ALLOWED = /^[\d\s\-()]+$/;

function cleanPhoneNumber(val: string): string {
  return val.replace(/[\s\-()]+/g, '');
}

function isAdult(birthDate: string): boolean {
  if (!DATE_REGEX.test(birthDate)) return false;
  const born = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - born.getFullYear();
  const monthDiff = today.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) {
    return age - 1 >= 18;
  }
  return age >= 18; // Mayoría de edad en México (Código Civil Federal, Art. 646)
}

function validateForm(form: ProfileForm): FieldErrors {
  const errors: FieldErrors = {};

  // --- Nombre ---
  if (!form.nombre.trim()) {
    errors.nombre = 'El nombre es obligatorio.';
  } else if (!NAME_REGEX.test(form.nombre)) {
    errors.nombre = 'El nombre solo puede contener letras.';
  }

  // --- Apellido Paterno ---
  if (!form.apellido_paterno.trim()) {
    errors.apellido_paterno = 'El apellido paterno es obligatorio.';
  } else if (!NAME_REGEX.test(form.apellido_paterno)) {
    errors.apellido_paterno = 'El apellido solo puede contener letras.';
  }

  // --- Apellido Materno ---
  if (form.apellido_materno.trim() && !NAME_REGEX.test(form.apellido_materno)) {
    errors.apellido_materno = 'El apellido solo puede contener letras.';
  }

  // --- Teléfono ---
  const rawTelefono = cleanPhoneNumber(form.telefono);
  if (!rawTelefono) {
    errors.telefono = 'El teléfono es obligatorio.';
  } else if (!PHONE_ALLOWED.test(form.telefono)) {
    errors.telefono =
      'El teléfono solo puede contener números, guiones y paréntesis.';
  } else if (rawTelefono.length !== 10 && rawTelefono.length !== 12) {
    errors.telefono =
      'El teléfono debe tener 10 dígitos (nacional) o 12 (internacional).';
  }

  // --- Fecha de Nacimiento ---
  if (!form.fecha_nacimiento.trim()) {
    errors.fecha_nacimiento = 'La fecha de nacimiento es obligatoria.';
  } else if (!DATE_REGEX.test(form.fecha_nacimiento)) {
    errors.fecha_nacimiento = 'Formato inválido (AAAA-MM-DD).';
  } else if (!isAdult(form.fecha_nacimiento)) {
    errors.fecha_nacimiento = 'Debes ser mayor de 18 años.';
  }

  // --- Género ---
  if (!form.genero) {
    errors.genero = 'Selecciona un género.';
  }

  // --- Dirección ---
  if (!form.direccion.trim()) {
    errors.direccion = 'La dirección es obligatoria.';
  }

  // --- Municipio ---
  if (form.municipio_id === null) {
    errors.municipio_id = 'Selecciona un municipio.';
  }

  // --- Localidad ---
  if (form.localidad_id === null) {
    errors.localidad_id = 'Selecciona una localidad.';
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminProfile() {
  // --- Profile state ---
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [profile, setProfile] = useState<ProfileForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState<string | null>(null);

  // --- Password state ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // --- Catalog state ---
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [loadingLocalidades, setLoadingLocalidades] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const profileSnapshot = useRef<ProfileForm | null>(null);

  // --- Fetch current profile ---
  const fetchProfile = useCallback(async () => {
    setFetching(true);
    try {
      const { data } = await api.get<{ data: Record<string, unknown> }>(
        '/auth/me/',
      );
      const raw = data.data;
      const municipioId = (raw.municipio_id as number) ?? null;
      const localidadId = (raw.localidad as number) ?? null;
      setProfile({
        nombre: (raw.nombre as string) ?? '',
        apellido_paterno: (raw.apellido_paterno as string) ?? '',
        apellido_materno: (raw.apellido_materno as string) ?? '',
        email: (raw.email as string) ?? '',
        telefono: (raw.telefono as string) ?? '',
        fecha_nacimiento: (raw.fecha_nacimiento as string) ?? '',
        genero: (raw.genero as string) ?? '',
        direccion: (raw.direccion as string) ?? '',
        municipio_id: municipioId,
        localidad_id: localidadId,
        localidad_nombre: (raw.localidad_nombre as string) ?? '',
        municipio_nombre: (raw.municipio_nombre as string) ?? '',
      });
    } catch {
      setError('Error al cargar perfil');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // --- Fetch municipios (once on mount) ---
  const loadMunicipios = useCallback(() => {
    setCatalogError(null);
    api
      .get<{ data: Municipio[] }>('/municipios/')
      .then((res) => setMunicipios(res.data.data ?? []))
      .catch(() =>
        setCatalogError('Error al cargar municipios. Verifica tu conexión.'),
      );
  }, []);

  useEffect(() => {
    loadMunicipios();
  }, [loadMunicipios]);

  // --- Fetch localidades for a given municipio ---
  const fetchLocalidades = useCallback(async (municipioId: number | null) => {
    if (!municipioId) {
      setLocalidades([]);
      return;
    }
    setLoadingLocalidades(true);
    setCatalogError(null);
    try {
      const res = await api.get<{ data: Localidad[] }>(
        `/localidades/?municipio_id=${municipioId}`,
      );
      setLocalidades(res.data.data ?? []);
    } catch {
      setLocalidades([]);
      setCatalogError('Error al cargar localidades. Verifica tu conexión.');
    } finally {
      setLoadingLocalidades(false);
    }
  }, []);

  // --- Load localidades when entering edit mode ---
  useEffect(() => {
    if (editing && profile?.municipio_id) {
      fetchLocalidades(profile.municipio_id);
    }
  }, [editing, profile?.municipio_id, fetchLocalidades]);

  // --- Save profile ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setSuccess(null);

    const errors = validateForm(profile);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);

    try {
      await api.patch('/auth/me/', {
        nombre: profile.nombre.trim(),
        apellido_paterno: profile.apellido_paterno.trim(),
        apellido_materno: profile.apellido_materno.trim() || null,
        telefono: cleanPhoneNumber(profile.telefono),
        fecha_nacimiento: profile.fecha_nacimiento,
        sexo: profile.genero || null,
        domicilio: profile.direccion.trim(),
        fk_localidad: profile.localidad_id ?? null,
      });

      await fetchProfile();
      setSuccess('Perfil actualizado exitosamente.');
      setEditing(false);
      setFieldErrors({});
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response?: { data?: { detail?: string } };
        };
        setError(
          axiosErr.response?.data?.detail ?? 'Error al actualizar perfil.',
        );
      } else {
        setError('Error al actualizar perfil.');
      }
    } finally {
      setLoading(false);
    }
  }

  // --- Password validation ---
  function validatePasswordForm(): string | null {
    if (!currentPassword) return 'La contraseña actual es obligatoria.';
    if (!newPassword) return 'La nueva contraseña es obligatoria.';
    if (newPassword.length < 8)
      return 'La nueva contraseña debe tener al menos 8 caracteres.';
    if (!confirmPassword)
      return 'La confirmación de contraseña es obligatoria.';
    if (newPassword !== confirmPassword) return 'Las contraseñas no coinciden.';
    return null;
  }

  // --- Change password ---
  async function handlePasswordChange() {
    setPasswordError(null);
    setPasswordSuccess(null);

    const validationError = validatePasswordForm();
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    setPasswordSubmitting(true);
    try {
      await api.post('/auth/change-password/', {
        old_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess('Contraseña actualizada exitosamente.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response?: {
            data?: {
              detail?: string;
              old_password?: string[];
              new_password?: string[];
            };
          };
        };
        const detail =
          axiosErr.response?.data?.detail ??
          axiosErr.response?.data?.old_password?.[0] ??
          axiosErr.response?.data?.new_password?.[0] ??
          'Error al cambiar contraseña.';
        setPasswordError(detail);
      } else {
        setPasswordError('Error al cambiar contraseña.');
      }
    } finally {
      setPasswordSubmitting(false);
    }
  }

  // --- Loading ---
  if (fetching) {
    return (
      <>
        <PageHeader title="Mi Perfil" />
        <div className="flex items-center justify-center py-20 text-gray-400">
          Cargando perfil...
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Mi Perfil"
        action={
          !editing ? (
            <Button
              variant="primary"
              onClick={() => {
                profileSnapshot.current = profile;
                setEditing(true);
              }}
            >
              Editar perfil
            </Button>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-2xl space-y-6">
        {/* --- Profile Card --- */}
        <Card className="space-y-6 p-6">
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-600 dark:border-red-700 dark:bg-red-950 dark:text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-600 dark:border-green-700 dark:bg-green-950 dark:text-green-400">
              {success}
            </div>
          )}

          {editing && profile ? (
            <>
              <AdminProfileForm
                profile={profile}
                fieldErrors={fieldErrors}
                municipios={municipios}
                localidades={localidades}
                loadingLocalidades={loadingLocalidades}
                catalogError={catalogError}
                loading={loading}
                onChange={(updated) => setProfile(updated)}
                onClearError={(field) =>
                  setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
                }
                onSave={handleSave}
                onCancel={() => {
                  setEditing(false);
                  setError(null);
                  setFieldErrors({});
                  setProfile(structuredClone(profileSnapshot.current));
                }}
                onLoadMunicipios={loadMunicipios}
                onFetchLocalidades={fetchLocalidades}
              />

              <AdminChangePassword
                currentPassword={currentPassword}
                newPassword={newPassword}
                confirmPassword={confirmPassword}
                passwordError={passwordError}
                passwordSuccess={passwordSuccess}
                passwordSubmitting={passwordSubmitting}
                onCurrentPasswordChange={setCurrentPassword}
                onNewPasswordChange={setNewPassword}
                onConfirmPasswordChange={setConfirmPassword}
                onPasswordErrorClear={() => setPasswordError(null)}
                onSubmit={handlePasswordChange}
              />
            </>
          ) : (
            <AdminProfileView profile={profile} />
          )}
        </Card>
      </div>
    </>
  );
}
