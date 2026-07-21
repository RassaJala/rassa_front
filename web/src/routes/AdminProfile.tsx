import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

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
const MAX_NOMBRE = 100;
const MAX_APELLIDO = 100;
const MAX_DIRECCION = 255;
const MAX_TELEFONO = 15;

function cleanPhoneNumber(val: string): string {
  return val.replace(/[\s\-()]+/g, '');
}

/** Normaliza fechas ISO del backend (2000-01-15T00:00:00Z → 2000-01-15) */
function normalizeDate(val: string): string {
  return val.split('T')[0] ?? val;
}

function str(val: unknown, fallback = ''): string {
  return typeof val === 'string' ? val : fallback;
}

function num(val: unknown, fallback: number | null = null): number | null {
  return typeof val === 'number' ? val : fallback;
}

function parseAxiosError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as {
      response?: { data?: { detail?: string } };
    };
    return axiosErr.response?.data?.detail ?? fallback;
  }
  return fallback;
}

function parsePasswordError(err: unknown): string {
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
    return (
      axiosErr.response?.data?.detail ??
      axiosErr.response?.data?.old_password?.[0] ??
      axiosErr.response?.data?.new_password?.[0] ??
      'Error al cambiar contraseña.'
    );
  }
  return 'Error al cambiar contraseña.';
}

function isRealDate(dateStr: string): boolean {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0] ?? '0', 10);
  const month = parseInt(parts[1] ?? '0', 10) - 1;
  const day = parseInt(parts[2] ?? '0', 10);
  const date = new Date(year, month, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
  );
}

function isAdult(birthDate: string): boolean {
  if (!DATE_REGEX.test(birthDate)) return false;
  const parts = birthDate.split('-');
  const year = parseInt(parts[0] || '0', 10);
  const month = parseInt(parts[1] || '0', 10) - 1;
  const day = parseInt(parts[2] || '0', 10);
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age--;
  }
  return age >= 18; // Mayoría de edad en México (Código Civil Federal, Art. 646)
}

function validateForm(form: ProfileForm): FieldErrors {
  const errors: FieldErrors = {};

  // --- Nombre ---
  if (!form.nombre.trim()) {
    errors.nombre = 'El nombre es obligatorio.';
  } else if (form.nombre.length > MAX_NOMBRE) {
    errors.nombre = `El nombre no puede exceder ${MAX_NOMBRE} caracteres.`;
  } else if (!NAME_REGEX.test(form.nombre)) {
    errors.nombre = 'El nombre solo puede contener letras.';
  }

  // --- Apellido Paterno ---
  if (!form.apellido_paterno.trim()) {
    errors.apellido_paterno = 'El apellido paterno es obligatorio.';
  } else if (form.apellido_paterno.length > MAX_APELLIDO) {
    errors.apellido_paterno = `El apellido paterno no puede exceder ${MAX_APELLIDO} caracteres.`;
  } else if (!NAME_REGEX.test(form.apellido_paterno)) {
    errors.apellido_paterno = 'El apellido solo puede contener letras.';
  }

  // --- Apellido Materno ---
  if (form.apellido_materno.trim() && form.apellido_materno.length > MAX_APELLIDO) {
    errors.apellido_materno = `El apellido materno no puede exceder ${MAX_APELLIDO} caracteres.`;
  } else if (form.apellido_materno.trim() && !NAME_REGEX.test(form.apellido_materno)) {
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
  } else if (!isRealDate(form.fecha_nacimiento)) {
    errors.fecha_nacimiento = 'Fecha inválida.';
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
  } else if (form.direccion.length > MAX_DIRECCION) {
    errors.direccion = `La dirección no puede exceder ${MAX_DIRECCION} caracteres.`;
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
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [loadingLocalidades, setLoadingLocalidades] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const profileSnapshot = useRef<ProfileForm | null>(null);
  // Controllers para catálogos (municipios/localidades) — se abortan al re-llamar
  const catalogRef = useRef<AbortController | null>(null);
  // Controlador para el perfil — solo se aborta al desmontar
  const profileRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      catalogRef.current?.abort();
      profileRef.current?.abort();
    };
  }, []);

  function catalogSignal(): AbortSignal {
    catalogRef.current?.abort();
    const controller = new AbortController();
    catalogRef.current = controller;
    return controller.signal;
  }

  function profileSignal(): AbortSignal {
    profileRef.current?.abort();
    const controller = new AbortController();
    profileRef.current = controller;
    return controller.signal;
  }

  // --- Fetch current profile ---
  const fetchProfile = useCallback(async () => {
    const signal = profileSignal();
    setFetching(true);
    setError(null);
    try {
      const { data } = await api.get<{ data: Record<string, unknown> }>(
        '/auth/me/',
        { signal },
      );
      const raw = data.data;
      setProfile({
        nombre: str(raw.nombre),
        apellido_paterno: str(raw.apellido_paterno),
        apellido_materno: str(raw.apellido_materno),
        email: str(raw.email),
        telefono: str(raw.telefono),
        fecha_nacimiento: normalizeDate(str(raw.fecha_nacimiento)),
        genero: str(raw.genero),
        direccion: str(raw.direccion),
        municipio_id: num(raw.municipio_id),
        localidad_id: num(raw.localidad),
        localidad_nombre: str(raw.localidad_nombre),
        municipio_nombre: str(raw.municipio_nombre),
      });
    } catch (err) {
      if (axios.isCancel(err)) return; // aborted
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          setError('Error de red — verifica tu conexión.');
        } else if (err.response.status === 401) {
          setError('Sesión expirada — inicia sesión de nuevo.');
        } else if (err.response.status >= 500) {
          setError('Error del servidor — intenta más tarde.');
        } else {
          setError('Error al cargar perfil');
        }
      } else {
        setError('Error inesperado al cargar perfil');
      }
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // --- Fetch municipios (once on mount) ---
  const loadMunicipios = useCallback(async () => {
    const signal = catalogSignal();
    setCatalogError(null);
    setLoadingMunicipios(true);
    try {
      const res = await api.get<{ data: Municipio[] }>('/municipios/', { signal });
      setMunicipios(res.data.data ?? []);
    } catch (err) {
      if (axios.isCancel(err)) return;
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          setCatalogError('Error de red — verifica tu conexión.');
        } else if (err.response.status >= 500) {
          setCatalogError('Error del servidor — intenta más tarde.');
        } else {
          setCatalogError('Error al cargar municipios.');
        }
      } else {
        setCatalogError('Error inesperado al cargar municipios.');
      }
    } finally {
      setLoadingMunicipios(false);
    }
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
    const signal = catalogSignal();
    setLoadingLocalidades(true);
    setCatalogError(null);
    try {
      const res = await api.get<{ data: Localidad[] }>(
        `/localidades/?municipio_id=${municipioId}`,
        { signal },
      );
      setLocalidades(res.data.data ?? []);
    } catch (err) {
      if (axios.isCancel(err)) return;
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
      setError(parseAxiosError(err, 'Error al actualizar perfil.'));
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
      setPasswordError(parsePasswordError(err));
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
          !editing && profile ? (
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
                loadingMunicipios={loadingMunicipios}
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
                  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                  setProfile(structuredClone(profileSnapshot.current ?? null));
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
          ) : !profile ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No se pudo cargar el perfil.
              </p>
              <Button variant="secondary" onClick={fetchProfile}>
                Reintentar
              </Button>
            </div>
          ) : (
            <AdminProfileView profile={profile} />
          )}
        </Card>
      </div>
    </>
  );
}
