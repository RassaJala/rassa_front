import { useState } from 'react';
import { useTheme } from '~/providers/ThemeProvider';
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
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const border = isDark ? '#2A332A' : '#D6DAD4';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const bg = isDark ? '#1A241C' : '#F5F6F3';
  const coral = '#DE393A';
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const btnStyle = {
    height: 40,
    padding: '0 18px',
    borderRadius: 10,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    letterSpacing: '0.01em',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  } as const;

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

  function renderField(label: string, fieldName: string, input: React.ReactNode) {
    const err = fieldErrors[fieldName as keyof FieldErrors];
    return (
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
          {label}
        </label>
        {input}
        {err && (
          <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{err}</p>
        )}
      </div>
    );
  }

  function inputStyle(fieldName: string) {
    const err = fieldErrors[fieldName as keyof FieldErrors];
    return {
      width: '100%' as const,
      height: 44,
      border: `1.5px solid ${
        err ? '#ef4444' : focusedField === fieldName ? coral : border
      }`,
      borderRadius: 10,
      padding: '0 14px',
      fontSize: 15,
      fontFamily: 'inherit',
      background: bg,
      color: fg,
      outline: 'none',
      boxSizing: 'border-box' as const,
    };
  }

  return (
    <form
      onSubmit={onSave}
      style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
    >
      <h3
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: fg,
          margin: 0,
        }}
      >
        Editar Información
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 18,
        }}
      >
        {renderField(
          'Nombre *',
          'nombre',
          <input
            type="text"
            value={profile.nombre}
            maxLength={100}
            onChange={(e) => {
              onChange({ ...profile, nombre: filterNameInput(e.target.value) });
              onClearError('nombre');
            }}
            style={inputStyle('nombre')}
            onFocus={() => setFocusedField('nombre')}
            onBlur={() => setFocusedField(null)}
            required
          />,
        )}

        {renderField(
          'Apellido Paterno *',
          'apellido_paterno',
          <input
            type="text"
            value={profile.apellido_paterno}
            maxLength={100}
            onChange={(e) => {
              onChange({
                ...profile,
                apellido_paterno: filterNameInput(e.target.value),
              });
              onClearError('apellido_paterno');
            }}
            style={inputStyle('apellido_paterno')}
            onFocus={() => setFocusedField('apellido_paterno')}
            onBlur={() => setFocusedField(null)}
            required
          />,
        )}

        {renderField(
          'Apellido Materno',
          'apellido_materno',
          <input
            type="text"
            value={profile.apellido_materno}
            maxLength={100}
            onChange={(e) => {
              onChange({
                ...profile,
                apellido_materno: filterNameInput(e.target.value),
              });
              onClearError('apellido_materno');
            }}
            style={inputStyle('apellido_materno')}
            onFocus={() => setFocusedField('apellido_materno')}
            onBlur={() => setFocusedField(null)}
          />,
        )}

        {renderField(
          'Teléfono *',
          'telefono',
          <input
            type="text"
            value={profile.telefono}
            maxLength={15}
            onChange={(e) => {
              onChange({
                ...profile,
                telefono: filterPhoneInput(e.target.value),
              });
              onClearError('telefono');
            }}
            style={inputStyle('telefono')}
            onFocus={() => setFocusedField('telefono')}
            onBlur={() => setFocusedField(null)}
            required
          />,
        )}

        {renderField(
          'Fecha de Nacimiento *',
          'fecha_nacimiento',
          <input
            type="date"
            value={profile.fecha_nacimiento}
            onChange={(e) => {
              onChange({ ...profile, fecha_nacimiento: e.target.value });
              onClearError('fecha_nacimiento');
            }}
            style={inputStyle('fecha_nacimiento')}
            onFocus={() => setFocusedField('fecha_nacimiento')}
            onBlur={() => setFocusedField(null)}
            required
          />,
        )}

        {renderField(
          'Género *',
          'genero',
          <select
            value={profile.genero}
            onChange={(e) => {
              onChange({ ...profile, genero: e.target.value });
              onClearError('genero');
            }}
            style={{
              ...inputStyle('genero'),
              appearance: 'auto' as const,
            }}
            onFocus={() => setFocusedField('genero')}
            onBlur={() => setFocusedField(null)}
            required
          >
            <option value="">Seleccionar...</option>
            {generoOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>,
        )}

        <div style={{ gridColumn: '1 / -1' }}>
          {renderField(
            'Dirección *',
            'direccion',
            <input
              type="text"
              value={profile.direccion}
              maxLength={255}
              onChange={(e) => {
                onChange({ ...profile, direccion: e.target.value });
                onClearError('direccion');
              }}
              style={inputStyle('direccion')}
              onFocus={() => setFocusedField('direccion')}
              onBlur={() => setFocusedField(null)}
              required
            />,
          )}
        </div>
      </div>

      {/* --- Municipio / Localidad --- */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 18,
        }}
      >
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

      <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            ...btnStyle,
            background: coral,
            color: '#fff',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            ...btnStyle,
            background: 'transparent',
            border: `1.5px solid ${border}`,
            color: fg,
          }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
