import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { colors } from '../../constants/colors';
import { useCatalogs } from '../../hooks/useCatalogs';
import api from '../../services/api';
import { parseApiError } from '../../utils/apiErrors';
import {
  cleanAddress,
  cleanName,
  cleanPhoneNumber,
  validateRegistrationForm,
} from '../../utils/validation';
import WebDatePickerModal from '../WebDatePickerModal';

interface FormColors {
  readonly fg: string;
  readonly muted: string;
  readonly border: string;
  readonly bg: string;
  readonly brand: string;
  readonly coral: string;
  readonly surface: string;
}

interface NuevoUsuarioFormProps {
  readonly colors: FormColors;
  readonly isDark: boolean;
  readonly onCreated: () => void;
  readonly showToast: (message: string, type: 'success' | 'error') => void;
}

export default function NuevoUsuarioForm({
  colors,
  isDark,
  onCreated,
  showToast,
}: NuevoUsuarioFormProps) {
  const { fg, muted, border, bg, brand, coral, surface } = colors;
  const queryClient = useQueryClient();
  const catalogs = useCatalogs();
  const [formNombre, setFormNombre] = useState('');
  const [formApePat, setFormApePat] = useState('');
  const [formApeMat, setFormApeMat] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formTelefono, setFormTelefono] = useState('');
  const [formFechaNac, setFormFechaNac] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formSexo, setFormSexo] = useState<'M' | 'F' | 'O'>('M');
  const [formDomicilio, setFormDomicilio] = useState('');
  const [formRole, setFormRole] = useState<'farmer' | 'seller' | 'buyer'>(
    'buyer',
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [formFocused, setFormFocused] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post(
        formRole === 'farmer' ? '/auth/create-farmer/' : '/auth/register/',
        payload,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast('Usuario creado correctamente', 'success');
      onCreated();
    },
    onError: (err: unknown) => {
      setFormError(parseApiError(err, 'Error al crear el usuario.'));
    },
  });

  function handleCreateUser() {
    setFormError(null);

    const validationError = validateRegistrationForm({
      email: formEmail,
      password: formPassword,
      telefono: formTelefono,
      nombre: formNombre,
      apellidoPaterno: formApePat,
      fechaNacimiento: formFechaNac,
      domicilio: formDomicilio,
      localidadId: catalogs.localidadId,
    });
    if (validationError) {
      setFormError(validationError);
      return;
    }
    if (!formSexo) {
      setFormError('Seleccioná un género.');
      return;
    }

    const basePayload: Record<string, unknown> = {
      email: formEmail.trim(),
      password: formPassword,
      nombre: cleanName(formNombre),
      apellido_paterno: cleanName(formApePat),
      apellido_materno: formApeMat.trim() ? cleanName(formApeMat) : null,
      telefono: cleanPhoneNumber(formTelefono),
      fecha_nacimiento: formFechaNac,
      sexo: formSexo,
      domicilio: cleanAddress(formDomicilio),
      fk_localidad: catalogs.localidadId,
    };
    if (formRole !== 'farmer') basePayload.role = formRole;
    createMutation.mutate(basePayload);
  }

  const formLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
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
    <div
      style={{
        background: surface,
        borderRadius: 16,
        border: `1px solid ${border}`,
        padding: 20,
      }}
    >
      <h3
        style={{ fontSize: 18, fontWeight: 700, color: fg, marginBottom: 16 }}
      >
        Nuevo usuario
      </h3>

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

      {/* Role selector */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ ...formLabel, marginBottom: 6, display: 'block' }}>
          Rol
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['farmer', 'seller', 'buyer'] as const).map((r) => {
            const labels = {
              farmer: 'Agricultor',
              seller: 'Vendedor',
              buyer: 'Cliente',
            };
            const colorsMap = {
              farmer: colors.primary,
              seller: colors.accent,
              buyer: colors.info,
            };
            const active = formRole === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setFormRole(r)}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 8,
                  border: `1.5px solid ${active ? colorsMap[r] : border}`,
                  background: active ? `${colorsMap[r]}12` : 'transparent',
                  color: active ? colorsMap[r] : muted,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                {labels[r]}
              </button>
            );
          })}
        </div>
      </div>

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
              onClick={() => setShowPassword((v) => !v)}
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

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button
          type="button"
          onClick={handleCreateUser}
          disabled={createMutation.isPending}
          style={{
            flex: 1,
            height: 38,
            borderRadius: 8,
            border: 'none',
            background: createMutation.isPending ? `${coral}99` : coral,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: createMutation.isPending ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onCreated}
          style={{
            height: 38,
            padding: '0 18px',
            borderRadius: 8,
            border: `1.5px solid ${border}`,
            background: 'transparent',
            color: fg,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
      </div>

      <WebDatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(date) => setFormFechaNac(date)}
        initialDate={formFechaNac}
      />
    </div>
  );
}
