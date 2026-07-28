import React from 'react';
import WebDatePickerModal from '../WebDatePickerModal';

interface UserFormFieldsProps {
  readonly formNombre: string;
  readonly setFormNombre: (v: string) => void;
  readonly formApePat: string;
  readonly setFormApePat: (v: string) => void;
  readonly formApeMat: string;
  readonly setFormApeMat: (v: string) => void;
  readonly formEmail: string;
  readonly setFormEmail: (v: string) => void;
  readonly formPassword: string;
  readonly setFormPassword: (v: string) => void;
  readonly formTelefono: string;
  readonly setFormTelefono: (v: string) => void;
  readonly formFechaNac: string;
  readonly setFormFechaNac: (v: string) => void;
  readonly formSexo: 'M' | 'F' | 'O';
  readonly setFormSexo: (v: 'M' | 'F' | 'O') => void;
  readonly formDomicilio: string;
  readonly setFormDomicilio: (v: string) => void;
  readonly showPassword: boolean;
  readonly setShowPassword: (v: boolean) => void;
  readonly showDatePicker: boolean;
  readonly setShowDatePicker: (v: boolean) => void;
  readonly formFocused: string | null;
  readonly setFormFocused: (v: string | null) => void;
  readonly formError: string | null;
  readonly isDark: boolean;
  readonly fg: string;
  readonly muted: string;
  readonly border: string;
  readonly bg: string;
  readonly brand: string;
  readonly coral: string;
  readonly catalogs: {
    readonly municipios: readonly {
      readonly id_municipio: number;
      readonly nombre: string;
    }[];
    readonly localidades: readonly {
      readonly id_localidad: number;
      readonly nombre: string;
    }[];
    readonly selectedMunicipioId: number | null;
    readonly localidadId: number | null;
    readonly isLoadingMunicipios: boolean;
    readonly isLoadingLocalidades: boolean;
    readonly errorMunicipios: string | null;
    readonly errorLocalidades: string | null;
    readonly handleSelectMunicipio: (id: number) => void;
    readonly setLocalidadId: (id: number | null) => void;
    readonly refetchMunicipios: () => void;
    readonly refetchLocalidades: () => void;
  };
}

export default function UserFormFields({
  formNombre,
  setFormNombre,
  formApePat,
  setFormApePat,
  formApeMat,
  setFormApeMat,
  formEmail,
  setFormEmail,
  formPassword,
  setFormPassword,
  formTelefono,
  setFormTelefono,
  formFechaNac,
  setFormFechaNac,
  formSexo,
  setFormSexo,
  formDomicilio,
  setFormDomicilio,
  showPassword,
  setShowPassword,
  showDatePicker,
  setShowDatePicker,
  formFocused,
  setFormFocused,
  formError,
  isDark,
  fg,
  muted,
  border,
  bg,
  brand,
  coral,
  catalogs,
}: UserFormFieldsProps): React.JSX.Element {
  const formLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: muted,
  };

  function formInputStyle(field: string): React.CSSProperties {
    return {
      width: '100%',
      height: 38,
      border: `1.5px solid ${formFocused === field ? brand : border}`,
      borderRadius: 8,
      padding: '0 12px',
      fontSize: 14,
      fontFamily: 'inherit',
      background: bg,
      color: fg,
      outline: 'none',
      boxSizing: 'border-box',
    };
  }

  return (
    <>
      {formError && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            background: isDark ? 'rgba(222,57,58,0.12)' : '#FEF2F2',
            border: `1px solid ${isDark ? 'rgba(222,57,58,0.3)' : '#FECACA'}`,
            color: coral,
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 16,
          }}
        >
          {formError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={formLabel}>Nombre *</label>
          <input
            type="text"
            placeholder="Juan"
            value={formNombre}
            onChange={(e) => setFormNombre(e.target.value)}
            style={formInputStyle('nombre')}
            onFocus={() => setFormFocused('nombre')}
            onBlur={() => setFormFocused(null)}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={formLabel}>Apellido Paterno *</label>
          <input
            type="text"
            placeholder="Pérez"
            value={formApePat}
            onChange={(e) => setFormApePat(e.target.value)}
            style={formInputStyle('apePat')}
            onFocus={() => setFormFocused('apePat')}
            onBlur={() => setFormFocused(null)}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginTop: 10,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={formLabel}>Apellido Materno</label>
          <input
            type="text"
            placeholder="Opcional"
            value={formApeMat}
            onChange={(e) => setFormApeMat(e.target.value)}
            style={formInputStyle('apeMat')}
            onFocus={() => setFormFocused('apeMat')}
            onBlur={() => setFormFocused(null)}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={formLabel}>Correo electrónico *</label>
          <input
            type="email"
            placeholder="tu@correo.com"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            style={formInputStyle('email')}
            onFocus={() => setFormFocused('email')}
            onBlur={() => setFormFocused(null)}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginTop: 10,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={formLabel}>Contraseña *</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 8 caracteres"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              style={{ ...formInputStyle('password'), paddingRight: 36 }}
              onFocus={() => setFormFocused('password')}
              onBlur={() => setFormFocused(null)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 6,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
                padding: 4,
                color: muted,
              }}
              title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={formLabel}>Teléfono *</label>
          <input
            type="tel"
            placeholder="10 dígitos"
            value={formTelefono}
            onChange={(e) => setFormTelefono(e.target.value)}
            style={formInputStyle('telefono')}
            onFocus={() => setFormFocused('telefono')}
            onBlur={() => setFormFocused(null)}
          />
          <span style={{ fontSize: 10, color: muted, lineHeight: '1.2' }}>
            Para números extranjeros inicia con + (ej. +1...)
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginTop: 10,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={formLabel}>Fecha de nacimiento *</label>
          <button
            type="button"
            onClick={() => setShowDatePicker(true)}
            style={{
              ...formInputStyle('fechaNac'),
              textAlign: 'left',
              cursor: 'pointer',
              color: formFechaNac ? fg : muted,
            }}
          >
            {formFechaNac || 'AAAA-MM-DD'}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={formLabel}>Género *</label>
          <select
            value={formSexo}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'M' || v === 'F' || v === 'O') setFormSexo(v);
            }}
            style={formInputStyle('sexo')}
          >
            <option value="" disabled>
              Seleccionar
            </option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="O">Otro</option>
          </select>
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <label style={formLabel}>Dirección *</label>
        <input
          type="text"
          placeholder="Calle, número, colonia"
          value={formDomicilio}
          onChange={(e) => setFormDomicilio(e.target.value)}
          style={formInputStyle('domicilio')}
          onFocus={() => setFormFocused('domicilio')}
          onBlur={() => setFormFocused(null)}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginTop: 10,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={formLabel}>Municipio *</label>
          {catalogs.errorMunicipios ? (
            <div
              style={{
                ...formInputStyle('municipio'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderColor: coral,
              }}
            >
              <span style={{ fontSize: 13, color: coral }}>
                {catalogs.errorMunicipios}
              </span>
              <button
                type="button"
                onClick={() => void catalogs.refetchMunicipios()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: brand,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              >
                Reintentar
              </button>
            </div>
          ) : (
            <select
              value={catalogs.selectedMunicipioId ?? ''}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : null;
                if (id) catalogs.handleSelectMunicipio(id);
              }}
              style={formInputStyle('municipio')}
            >
              <option value="">
                {catalogs.isLoadingMunicipios ? 'Cargando...' : 'Seleccionar'}
              </option>
              {catalogs.municipios.map((m) => (
                <option key={m.id_municipio} value={m.id_municipio}>
                  {m.nombre}
                </option>
              ))}
            </select>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={formLabel}>Localidad *</label>
          {catalogs.errorLocalidades ? (
            <div
              style={{
                ...formInputStyle('localidad'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderColor: coral,
              }}
            >
              <span style={{ fontSize: 13, color: coral }}>
                {catalogs.errorLocalidades}
              </span>
              <button
                type="button"
                onClick={() => void catalogs.refetchLocalidades()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: brand,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              >
                Reintentar
              </button>
            </div>
          ) : (
            <select
              value={catalogs.localidadId ?? ''}
              disabled={!catalogs.selectedMunicipioId}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : null;
                if (id) catalogs.setLocalidadId(id);
              }}
              style={formInputStyle('localidad')}
            >
              <option value="">
                {catalogs.isLoadingLocalidades
                  ? 'Cargando...'
                  : !catalogs.selectedMunicipioId
                    ? 'Elegí un municipio'
                    : 'Seleccionar'}
              </option>
              {catalogs.localidades.map((l) => (
                <option key={l.id_localidad} value={l.id_localidad}>
                  {l.nombre}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <WebDatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(date) => setFormFechaNac(date)}
        initialDate={formFechaNac}
      />
    </>
  );
}
