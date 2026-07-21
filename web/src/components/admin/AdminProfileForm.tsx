import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { LocationSelector } from '~/components/admin/LocationSelector';
import type {
  FieldErrors,
  Localidad,
  Municipio,
  ProfileForm,
} from '~/components/admin/types';
import { generoOptions } from '~/components/admin/types';

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

const FILTER_NAME = /[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s'-]/g;
const FILTER_PHONE = /[^\d\s\-()]/g;

function filterNameInput(value: string): string {
  return value.replace(FILTER_NAME, '');
}

function filterPhoneInput(value: string): string {
  return value.replace(FILTER_PHONE, '');
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const inputClass =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-brand-ink focus:border-brand-red-coral focus:outline-none focus:ring-1 focus:ring-brand-red-coral dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 w-full';
const inputErrorClass =
  'rounded-lg border border-red-500 bg-white px-3 py-2 text-sm text-brand-ink focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-red-700 dark:bg-gray-900 dark:text-gray-100 w-full';
const selectClass = inputClass;
const selectErrorClass = inputErrorClass;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AdminProfileFormProps {
  profile: ProfileForm;
  fieldErrors: FieldErrors;
  municipios: Municipio[];
  localidades: Localidad[];
  loadingMunicipios: boolean;
  loadingLocalidades: boolean;
  catalogError: string | null;
  loading: boolean;
  onChange: (updated: ProfileForm) => void;
  onClearError: (field: keyof FieldErrors) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  onLoadMunicipios: () => void;
  onFetchLocalidades: (municipioId: number | null) => Promise<void>;
}

export function AdminProfileForm({
  profile,
  fieldErrors,
  municipios,
  localidades,
  loadingMunicipios,
  loadingLocalidades,
  catalogError,
  loading,
  onChange,
  onClearError,
  onSave,
  onCancel,
  onLoadMunicipios,
  onFetchLocalidades,
}: AdminProfileFormProps) {
  const handleMunicipioChange = (id: number | null) => {
    onChange({ ...profile, municipio_id: id, localidad_id: null });
    onClearError('municipio_id');
    onClearError('localidad_id');
    onFetchLocalidades(id);
  };

  const handleLocalidadChange = (id: number | null) => {
    onChange({ ...profile, localidad_id: id });
    onClearError('localidad_id');
  };

  return (
    <form onSubmit={onSave} className="space-y-4">
      <h3 className="text-lg font-bold text-brand-ink dark:text-gray-100">
        Editar Información
      </h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Input
            label="Nombre *"
            value={profile.nombre}
            maxLength={100}
            onChange={(e) => {
              onChange({ ...profile, nombre: filterNameInput(e.target.value) });
              onClearError('nombre');
            }}
            error={fieldErrors.nombre}
            required
          />
        </div>
        <div>
          <Input
            label="Apellido Paterno *"
            value={profile.apellido_paterno}
            maxLength={100}
            onChange={(e) => {
              onChange({
                ...profile,
                apellido_paterno: filterNameInput(e.target.value),
              });
              onClearError('apellido_paterno');
            }}
            error={fieldErrors.apellido_paterno}
            required
          />
        </div>
        <div>
          <Input
            label="Apellido Materno"
            value={profile.apellido_materno}
            maxLength={100}
            onChange={(e) => {
              onChange({
                ...profile,
                apellido_materno: filterNameInput(e.target.value),
              });
              onClearError('apellido_materno');
            }}
            error={fieldErrors.apellido_materno}
          />
        </div>
        <div>
          <Input
            label="Teléfono *"
            value={profile.telefono}
            maxLength={15}
            onChange={(e) => {
              onChange({
                ...profile,
                telefono: filterPhoneInput(e.target.value),
              });
              onClearError('telefono');
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
              onChange({ ...profile, fecha_nacimiento: e.target.value });
              onClearError('fecha_nacimiento');
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
              onChange({ ...profile, genero: e.target.value });
              onClearError('genero');
            }}
            className={fieldErrors.genero ? selectErrorClass : selectClass}
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
        <div className="sm:col-span-2">
          <Input
            label="Dirección *"
            value={profile.direccion}
            maxLength={255}
            onChange={(e) => {
              onChange({ ...profile, direccion: e.target.value });
              onClearError('direccion');
            }}
            error={fieldErrors.direccion}
            required
          />
        </div>
      </div>

      {/* --- Municipio / Localidad --- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <LocationSelector
          municipios={municipios}
          localidades={localidades}
          selectedMunicipioId={profile.municipio_id}
          selectedLocalidadId={profile.localidad_id}
          loadingMunicipios={loadingMunicipios}
          loadingLocalidades={loadingLocalidades}
          catalogError={catalogError}
          fieldErrors={fieldErrors}
          onMunicipioChange={handleMunicipioChange}
          onLocalidadChange={handleLocalidadChange}
          onRetryMunicipios={onLoadMunicipios}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
