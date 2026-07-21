import { useState } from 'react';
import { useTheme } from '~/providers/ThemeProvider';
import type {
  FieldErrors,
  Localidad,
  Municipio,
} from '~/components/admin/types';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface LocationSelectorProps {
  municipios: Municipio[];
  localidades: Localidad[];
  selectedMunicipioId: number | null;
  selectedLocalidadId: number | null;
  loadingMunicipios: boolean;
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
  loadingMunicipios,
  loadingLocalidades,
  catalogError,
  fieldErrors,
  onMunicipioChange,
  onLocalidadChange,
  onRetryMunicipios,
}: LocationSelectorProps) {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const border = isDark ? '#2A332A' : '#D6DAD4';
  const bg = isDark ? '#1A241C' : '#F5F6F3';
  const coral = '#DE393A';
  const [focusedField, setFocusedField] = useState<string | null>(null);

  function selectStyle(fieldName: string, hasError: boolean) {
    return {
      width: '100%' as const,
      height: 44,
      border: `1.5px solid ${
        hasError ? '#ef4444' : focusedField === fieldName ? coral : border
      }`,
      borderRadius: 10,
      padding: '0 14px',
      fontSize: 15,
      fontFamily: 'inherit',
      background: bg,
      color: fg,
      outline: 'none',
      boxSizing: 'border-box' as const,
      cursor: 'pointer' as const,
    };
  }

  return (
    <>
      {catalogError && (
        <div
          style={{
            gridColumn: '1 / -1',
            borderRadius: 10,
            border: '1px solid #fca5a5',
            background: isDark ? '#451a1a' : '#fef2f2',
            padding: 12,
            fontSize: 14,
          }}
        >
          <p style={{ margin: 0, color: isDark ? '#fca5a5' : '#dc2626' }}>
            {catalogError}
          </p>
          <button
            type="button"
            onClick={onRetryMunicipios}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              marginTop: 4,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              color: isDark ? '#fca5a5' : '#dc2626',
              textDecoration: 'underline',
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: muted,
          }}
        >
          Municipio *
        </label>
        <select
          value={selectedMunicipioId ?? ''}
          onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : null;
            onMunicipioChange(id);
          }}
          style={selectStyle('municipio', !!fieldErrors.municipio_id)}
          disabled={loadingMunicipios}
          onFocus={() => setFocusedField('municipio')}
          onBlur={() => setFocusedField(null)}
          required
        >
          <option value="">
            {loadingMunicipios ? 'Cargando...' : 'Seleccionar...'}
          </option>
          {municipios.map((m) => (
            <option key={m.id_municipio} value={m.id_municipio}>
              {m.nombre}
            </option>
          ))}
        </select>
        {fieldErrors.municipio_id && (
          <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>
            {fieldErrors.municipio_id}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: muted,
          }}
        >
          Localidad *
        </label>
        <select
          value={selectedLocalidadId ?? ''}
          onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : null;
            onLocalidadChange(id);
          }}
          style={selectStyle('localidad', !!fieldErrors.localidad_id)}
          disabled={!selectedMunicipioId || loadingLocalidades}
          onFocus={() => setFocusedField('localidad')}
          onBlur={() => setFocusedField(null)}
          required
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
          <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>
            {fieldErrors.localidad_id}
          </p>
        )}
      </div>
    </>
  );
}
