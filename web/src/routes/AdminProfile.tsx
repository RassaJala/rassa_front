import { useCallback, useEffect, useState } from 'react';

import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import api from '../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Municipio {
  id_municipio: number;
  nombre: string;
}

interface Localidad {
  id_localidad: number;
  nombre: string;
  municipio_id: number;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const NAME_REGEX = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s'-]+$/;
const PHONE_ALLOWED = /^[\d\s\-()]+$/;
const FILTER_NAME = /[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s'-]/g;
const FILTER_PHONE = /[^\d\s\-()]/g;

function filterNameInput(value: string): string {
  return value.replace(FILTER_NAME, '');
}

function filterPhoneInput(value: string): string {
  return value.replace(FILTER_PHONE, '');
}

interface FieldErrors {
  nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  telefono?: string;
  fecha_nacimiento?: string;
  genero?: string;
  direccion?: string;
  municipio_id?: string;
  localidad_id?: string;
}

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
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | undefined): string {
  if (!iso) return 'No especificado';
  try {
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  } catch {
    return iso;
  }
}

const generoOptions = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
  { value: 'O', label: 'Otro' },
];

function getGeneroLabel(value: string | undefined): string {
  return (
    generoOptions.find((o) => o.value === value)?.label ?? 'No especificado'
  );
}

const labelClass =
  'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider';
const valueClass = 'text-sm font-medium text-brand-ink dark:text-gray-100';

// ---------------------------------------------------------------------------
// Field row helper (view mode)
// ---------------------------------------------------------------------------

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={labelClass}>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ProfileForm {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  email: string;
  telefono: string;
  fecha_nacimiento: string;
  genero: string;
  direccion: string;
  municipio_id: number | null;
  localidad_id: number | null;
  localidad_nombre: string;
  municipio_nombre: string;
}

export function AdminProfile() {
  // --- Profile state ---
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [profile, setProfile] = useState<ProfileForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState<string | null>(null);

  // --- Catalog state ---
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [loadingLocalidades, setLoadingLocalidades] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

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
      .catch(() => setCatalogError('Error al cargar municipios. Verifica tu conexión.'));
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

  // --- Update profile ---
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setSuccess(null);

    // Client-side validation
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
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail ?? 'Error al actualizar perfil.');
      } else {
        setError('Error al actualizar perfil.');
      }
    } finally {
      setLoading(false);
    }
  }

  // --- Password change state ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

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

  // --- Derived data ---
  const fullName = profile
    ? `${profile.nombre}${profile.apellido_paterno ? ` ${profile.apellido_paterno}` : ''}${profile.apellido_materno ? ` ${profile.apellido_materno}` : ''}`
    : '';

  const inputClass =
    'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-brand-ink focus:border-brand-red-coral focus:outline-none focus:ring-1 focus:ring-brand-red-coral dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 w-full';
  const inputErrorClass =
    'rounded-lg border border-red-500 bg-white px-3 py-2 text-sm text-brand-ink focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-red-700 dark:bg-gray-900 dark:text-gray-100 w-full';
  const selectClass = inputClass;
  const selectErrorClass = inputErrorClass;

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
            <Button variant="primary" onClick={() => setEditing(true)}>
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
            /* --- Edit Form --- */
            <form onSubmit={handleSave} className="space-y-4">
              <h3 className="text-lg font-bold text-brand-ink dark:text-gray-100">
                Editar Información
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Input
                    label="Nombre *"
                    value={profile.nombre}
                    onChange={(e) => {
                      setProfile({
                        ...profile,
                        nombre: filterNameInput(e.target.value),
                      });
                      setFieldErrors({ ...fieldErrors, nombre: undefined });
                    }}
                    error={fieldErrors.nombre}
                    required
                  />
                </div>
                <div>
                  <Input
                    label="Apellido Paterno *"
                    value={profile.apellido_paterno}
                    onChange={(e) => {
                      setProfile({
                        ...profile,
                        apellido_paterno: filterNameInput(e.target.value),
                      });
                      setFieldErrors({
                        ...fieldErrors,
                        apellido_paterno: undefined,
                      });
                    }}
                    error={fieldErrors.apellido_paterno}
                    required
                  />
                </div>
                <div>
                  <Input
                    label="Apellido Materno"
                    value={profile.apellido_materno}
                    onChange={(e) => {
                      setProfile({
                        ...profile,
                        apellido_materno: filterNameInput(e.target.value),
                      });
                      setFieldErrors({
                        ...fieldErrors,
                        apellido_materno: undefined,
                      });
                    }}
                    error={fieldErrors.apellido_materno}
                  />
                </div>
                <div>
                  <Input
                    label="Teléfono *"
                    value={profile.telefono}
                    onChange={(e) => {
                      setProfile({
                        ...profile,
                        telefono: filterPhoneInput(e.target.value),
                      });
                      setFieldErrors({ ...fieldErrors, telefono: undefined });
                    }}
                    error={fieldErrors.telefono}
                    required
                  />
                </div>
                <div>
                  <Input
                    label="Fecha de Nacimiento *"
                    type="date"
                    value={profile.fecha_nacimiento}
                    onChange={(e) => {
                      setProfile({
                        ...profile,
                        fecha_nacimiento: e.target.value,
                      });
                      setFieldErrors({
                        ...fieldErrors,
                        fecha_nacimiento: undefined,
                      });
                    }}
                    error={fieldErrors.fecha_nacimiento}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Género *
                  </label>
                  <select
                    value={profile.genero}
                    onChange={(e) => {
                      setProfile({ ...profile, genero: e.target.value });
                      setFieldErrors({ ...fieldErrors, genero: undefined });
                    }}
                    className={
                      fieldErrors.genero ? selectErrorClass : selectClass
                    }
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {generoOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.genero && (
                    <p className="text-xs text-red-500">{fieldErrors.genero}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Dirección *
                  </label>
                  <input
                    value={profile.direccion}
                    onChange={(e) => {
                      setProfile({ ...profile, direccion: e.target.value });
                      setFieldErrors({ ...fieldErrors, direccion: undefined });
                    }}
                    className={
                      fieldErrors.direccion ? inputErrorClass : inputClass
                    }
                    required
                  />
                  {fieldErrors.direccion && (
                    <p className="text-xs text-red-500">
                      {fieldErrors.direccion}
                    </p>
                  )}
                </div>
              </div>

              {/* --- Municipio / Localidad --- */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {catalogError && (
                  <div className="mb-2 rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/20">
                    <p className="text-sm text-red-600 dark:text-red-400">{catalogError}</p>
                    <button
                      type="button"
                      onClick={loadMunicipios}
                      className="mt-1 text-sm font-medium text-red-600 underline dark:text-red-400"
                    >
                      Reintentar
                    </button>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Municipio *
                  </label>
                  <select
                    value={profile.municipio_id ?? ''}
                    onChange={async (e) => {
                      const id = e.target.value ? Number(e.target.value) : null;
                      setProfile({
                        ...profile,
                        municipio_id: id,
                        localidad_id: null,
                      });
                      setFieldErrors({
                        ...fieldErrors,
                        municipio_id: undefined,
                        localidad_id: undefined,
                      });
                      await fetchLocalidades(id);
                    }}
                    className={
                      fieldErrors.municipio_id ? selectErrorClass : selectClass
                    }
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {municipios.map((m) => (
                      <option key={m.id_municipio} value={m.id_municipio}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.municipio_id && (
                    <p className="text-xs text-red-500">
                      {fieldErrors.municipio_id}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Localidad *
                  </label>
                  <select
                    value={profile.localidad_id ?? ''}
                    onChange={(e) => {
                      const id = e.target.value ? Number(e.target.value) : null;
                      setProfile({ ...profile, localidad_id: id });
                      setFieldErrors({
                        ...fieldErrors,
                        localidad_id: undefined,
                      });
                    }}
                    className={
                      fieldErrors.localidad_id ? selectErrorClass : selectClass
                    }
                    required
                    disabled={!profile.municipio_id || loadingLocalidades}
                  >
                    <option value="">
                      {loadingLocalidades
                        ? 'Cargando...'
                        : profile.municipio_id
                          ? 'Seleccionar...'
                          : 'Primero selecciona un municipio'}
                    </option>
                    {localidades.map((l) => (
                      <option key={l.id_localidad} value={l.id_localidad}>
                        {l.nombre}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.localidad_id && (
                    <p className="text-xs text-red-500">
                      {fieldErrors.localidad_id}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar cambios'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                    setFieldErrors({});
                    fetchProfile();
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            /* --- View Mode --- */
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FieldRow label="Nombre Completo" value={fullName} />
              <FieldRow
                label="Teléfono"
                value={profile?.telefono || 'No especificado'}
              />
              <FieldRow
                label="Correo Electrónico"
                value={profile?.email || 'No especificado'}
              />
              <FieldRow
                label="Fecha de Nacimiento"
                value={formatDate(profile?.fecha_nacimiento)}
              />
              <FieldRow
                label="Género"
                value={getGeneroLabel(profile?.genero)}
              />
              <FieldRow
                label="Dirección"
                value={profile?.direccion || 'No especificado'}
              />
              <FieldRow
                label="Localidad"
                value={profile?.localidad_nombre || 'No especificado'}
              />
              <FieldRow
                label="Municipio"
                value={profile?.municipio_nombre || 'No especificado'}
              />
            </div>
          )}
        </Card>

        {/* --- Password Change Card --- */}
        {editing && (
          <Card className="space-y-4 p-6">
            <h3 className="text-lg font-bold text-brand-ink dark:text-gray-100">
              Cambiar Contraseña
            </h3>

            {passwordError && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-600 dark:border-red-700 dark:bg-red-950 dark:text-red-400">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-600 dark:border-green-700 dark:bg-green-950 dark:text-green-400">
                {passwordSuccess}
              </div>
            )}

            <div className="space-y-4">
              <Input
                label="Contraseña Actual *"
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPasswordError(null);
                }}
                required
              />
              <Input
                label="Nueva Contraseña (mínimo 8 caracteres) *"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError(null);
                }}
                required
              />
              <Input
                label="Confirmar Nueva Contraseña *"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError(null);
                }}
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="primary"
                disabled={passwordSubmitting}
                onClick={handlePasswordChange}
              >
                {passwordSubmitting ? 'Cambiando...' : 'Cambiar Contraseña'}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
