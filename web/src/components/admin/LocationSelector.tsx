import type {
  FieldErrors,
  Localidad,
  Municipio,
} from '~/components/admin/types';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const selectClass =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-brand-ink focus:border-brand-red-coral focus:outline-none focus:ring-1 focus:ring-brand-red-coral dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 w-full';
const selectErrorClass =
  'rounded-lg border border-red-500 bg-white px-3 py-2 text-sm text-brand-ink focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-red-700 dark:bg-gray-900 dark:text-gray-100 w-full';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface LocationSelectorProps {
  municipios: Municipio[];
  localidades: Localidad[];
  selectedMunicipioId: number | null;
  selectedLocalidadId: number | null;
  loadingLocalidades: boolean;
  catalogError: string | null;
  fieldErrors: FieldErrors;
  onMunicipioChange: (id: number | null) => void;
  onLocalidadChange: (id: number | null) => void;
  onRetryMunicipios: () => void;
}

export function LocationSelector({
  municipios,
  localidades,
  selectedMunicipioId,
  selectedLocalidadId,
  loadingLocalidades,
  catalogError,
  fieldErrors,
  onMunicipioChange,
  onLocalidadChange,
  onRetryMunicipios,
}: LocationSelectorProps) {
  return (
    <>
      {catalogError && (
        <div className="mb-2 rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">
            {catalogError}
          </p>
          <button
            type="button"
            onClick={onRetryMunicipios}
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
          value={selectedMunicipioId ?? ''}
          onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : null;
            onMunicipioChange(id);
          }}
          className={fieldErrors.municipio_id ? selectErrorClass : selectClass}
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
          <p className="text-xs text-red-500">{fieldErrors.municipio_id}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Localidad *
        </label>
        <select
          value={selectedLocalidadId ?? ''}
          onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : null;
            onLocalidadChange(id);
          }}
          className={fieldErrors.localidad_id ? selectErrorClass : selectClass}
          required
          disabled={!selectedMunicipioId || loadingLocalidades}
        >
          <option value="">
            {loadingLocalidades
              ? 'Cargando...'
              : selectedMunicipioId
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
          <p className="text-xs text-red-500">{fieldErrors.localidad_id}</p>
        )}
      </div>
    </>
  );
}
