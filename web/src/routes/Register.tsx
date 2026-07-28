import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthLayout } from '~/components/layout/AuthLayout';

import WebDatePickerModal from '~/components/WebDatePickerModal';
import { getColors } from '~/constants/colors';
import { useAuth } from '~/hooks/useAuth';
import { useCatalogs } from '~/hooks/useCatalogs';
import { useTheme } from '~/providers/ThemeProvider';
import api from '~/services/api';
import type { User } from '~/types';
import { normalizeRole } from '~/types';

import { parseApiError } from '~/utils/apiErrors';
import {
  cleanAddress,
  cleanName,
  formatPhoneNumber,
} from '~/utils/validation';
import {
  buildRegistrationPayload,
  validateRegistrationForm,
} from '~/utils/validation';

function mapRegisterUser(raw: Record<string, unknown>): User {
  return {
    id: raw.id_usuario as number,
    email: raw.email as string,
    nombre: raw.nombre as string,
    apellido_paterno: raw.apellido_paterno as string,
    apellido_materno: (raw.apellido_materno as string | undefined) ?? undefined,
    telefono: (raw.telefono as string | undefined) ?? undefined,
    fecha_nacimiento: (raw.fecha_nacimiento as string | undefined) ?? undefined,
    genero: (raw.sexo as string | undefined) ?? undefined,
    direccion: (raw.domicilio as string | undefined) ?? undefined,
    municipio_id: (raw.fk_municipio as number | undefined) ?? undefined,
    municipio_nombre:
      (raw.fk_municipio_nombre as string | undefined) ?? undefined,
    localidad: (raw.fk_localidad as number | undefined) ?? undefined,
    localidad_nombre:
      (raw.fk_localidad_nombre as string | undefined) ?? undefined,
    rol: normalizeRole((raw.rol ?? raw.role) as string | undefined),
  };
}

function registerErrors(fields: {
  readonly nombre: string;
  readonly apellido: string;
  readonly email: string;
  readonly password: string;
  readonly telefono: string;
  readonly fechaNacimiento: string;
  readonly sexo: string;
  readonly domicilio: string;
  readonly localidadId: number | null;
}): string | null {
  const {
    nombre,
    apellido,
    email,
    password,
    telefono,
    fechaNacimiento,
    sexo,
    domicilio,
    localidadId,
  } = fields;

  const err = validateRegistrationForm({
    email,
    password,
    telefono,
    nombre,
    apellidoPaterno: apellido,
    fechaNacimiento,
    domicilio,
    localidadId,
  });
  if (err) return err;

  if (!sexo) return 'Selecciona un género.';
  return null;
}

export function RegisterScreen() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { resolved } = useTheme();
  const theme = getColors(resolved === 'dark');

  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [sexo, setSexo] = useState('');
  const [domicilio, setDomicilio] = useState('');

  const catalogs = useCatalogs();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const err = registerErrors({
      nombre,
      apellido: apellidoPaterno,
      email,
      password,
      telefono,
      fechaNacimiento,
      sexo,
      domicilio,
      localidadId: catalogs.localidadId,
    });
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setLoading(true);

    const payload = buildRegistrationPayload({
      email,
      password,
      role: 'buyer',
      telefono,
      nombre,
      apellidoPaterno,
      apellidoMaterno,
      fechaNacimiento,
      sexo,
      domicilio,
      localidadId: catalogs.localidadId,
    });

    try {
      const { data: body } = await api.post<{
        data: Record<string, unknown>;
      }>('/auth/register/', payload);

      const raw = body.data ?? body;
      const access = raw.access as string;
      const refresh = raw.refresh as string | undefined;
      const user = mapRegisterUser(raw);

      if (!access) throw new Error('No se recibió el token de acceso.');

      if (refresh) sessionStorage.setItem('refresh_token', refresh);
      login(access, user);

      const roleRoutes: Record<string, string> = {
        admin: '/admin/usuarios',
        vendedor: '/vendedor/ventas',
        agricultor: '/agricultor/productos',
        cliente: '/cliente',
      };
      navigate(roleRoutes[user.rol] ?? '/cliente', {
        replace: true,
      });
    } catch (err: unknown) {
      setError(parseApiError(err, 'Error al registrarse.'));
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    height: 38,
    border: `1.5px solid ${focusedField === field ? theme.brand : theme.border}`,
    borderRadius: 8,
    padding: '0 12px',
    fontSize: 14,
    fontFamily: 'inherit',
    background: theme.bg,
    color: theme.fg,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  });

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: theme.muted,
  };

  const fieldWrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  };

  const btnBaseStyle: React.CSSProperties = {
    height: 36,
    padding: '0 16px',
    borderRadius: 8,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    letterSpacing: '0.01em',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };

  return (
    <AuthLayout title="Crear cuenta">
      <form className="flex flex-col gap-[10px]" onSubmit={handleSubmit}>
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
        >
          <div style={fieldWrapperStyle}>
            <label style={labelStyle}>Nombre *</label>
            <input
              type="text"
              placeholder="Juan"
              autoComplete="given-name"
              value={nombre}
              onChange={(e) => setNombre(cleanName(e.target.value))}
              required
              style={inputStyle('nombre')}
              onFocus={() => setFocusedField('nombre')}
              onBlur={() => setFocusedField(null)}
            />
          </div>
          <div style={fieldWrapperStyle}>
            <label style={labelStyle}>Apellido Paterno *</label>
            <input
              type="text"
              placeholder="Pérez"
              autoComplete="family-name"
              value={apellidoPaterno}
              onChange={(e) => setApellidoPaterno(cleanName(e.target.value))}
              required
              style={inputStyle('apellidoPaterno')}
              onFocus={() => setFocusedField('apellidoPaterno')}
              onBlur={() => setFocusedField(null)}
            />
          </div>
        </div>

        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
        >
          <div style={fieldWrapperStyle}>
            <label style={labelStyle}>Apellido Materno</label>
            <input
              type="text"
              placeholder="Opcional"
              autoComplete="additional-name"
              value={apellidoMaterno}
              onChange={(e) => setApellidoMaterno(cleanName(e.target.value))}
              style={inputStyle('apellidoMaterno')}
              onFocus={() => setFocusedField('apellidoMaterno')}
              onBlur={() => setFocusedField(null)}
            />
          </div>
          <div style={fieldWrapperStyle}>
            <label style={labelStyle}>Correo electrónico *</label>
            <input
              type="email"
              placeholder="tu@correo.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle('email')}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </div>
        </div>

        <div style={fieldWrapperStyle}>
          <label style={labelStyle}>Contraseña *</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              style={{ ...inputStyle('password'), paddingRight: 40 }}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{
                position: 'absolute',
                right: 4,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                padding: 8,
                color: theme.muted,
              }}
              tabIndex={-1}
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
        >
          <div style={fieldWrapperStyle}>
            <label style={labelStyle}>Teléfono *</label>
            <input
              type="tel"
              placeholder="10 dígitos"
              autoComplete="tel"
              value={telefono}
              onChange={(e) => setTelefono(formatPhoneNumber(e.target.value))}
              required
              style={inputStyle('telefono')}
              onFocus={() => setFocusedField('telefono')}
              onBlur={() => setFocusedField(null)}
            />
            <span
              style={{ fontSize: 10, color: theme.muted, lineHeight: '1.2' }}
            >
              Para números extranjeros inicia con + (ej. +1...)
            </span>
          </div>
          <div style={fieldWrapperStyle}>
            <label style={labelStyle}>Fecha de nacimiento *</label>
            <button
              type="button"
              onClick={() => setShowDatePicker(true)}
              style={{
                ...inputStyle('fechaNacimiento'),
                textAlign: 'left',
                cursor: 'pointer',
                color: fechaNacimiento ? theme.fg : theme.muted,
              }}
            >
              {fechaNacimiento || 'AAAA-MM-DD'}
            </button>
          </div>
        </div>

        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
        >
          <div style={fieldWrapperStyle}>
            <label style={labelStyle}>Género *</label>
            <select
              value={sexo}
              onChange={(e) => setSexo(e.target.value)}
              required
              style={inputStyle('sexo')}
            >
              <option value="">Seleccionar</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="O">Otro</option>
            </select>
          </div>
          <div style={fieldWrapperStyle}>
            <label style={labelStyle}>Dirección *</label>
            <input
              type="text"
              placeholder="Calle, número, colonia"
              autoComplete="street-address"
              value={domicilio}
              onChange={(e) => setDomicilio(cleanAddress(e.target.value))}
              required
              style={inputStyle('domicilio')}
              onFocus={() => setFocusedField('domicilio')}
              onBlur={() => setFocusedField(null)}
            />
          </div>
        </div>

        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
        >
          <div style={fieldWrapperStyle}>
            <label style={labelStyle}>Municipio *</label>
            {catalogs.errorMunicipios ? (
              <div
                style={{
                  ...inputStyle('municipio'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderColor: theme.coral,
                }}
              >
                <span style={{ fontSize: 13, color: theme.coral }}>
                  {catalogs.errorMunicipios}
                </span>
                <button
                  type="button"
                  onClick={() => void catalogs.refetchMunicipios()}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: theme.brand,
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
                disabled={catalogs.isLoadingMunicipios}
                style={inputStyle('municipio')}
                onFocus={() => setFocusedField('municipio')}
                onBlur={() => setFocusedField(null)}
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

          <div style={fieldWrapperStyle}>
            <label style={labelStyle}>Localidad *</label>
            {catalogs.errorLocalidades ? (
              <div
                style={{
                  ...inputStyle('localidad'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderColor: theme.coral,
                }}
              >
                <span style={{ fontSize: 13, color: theme.coral }}>
                  {catalogs.errorLocalidades}
                </span>
                <button
                  type="button"
                  onClick={() => void catalogs.refetchLocalidades()}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: theme.brand,
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
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  if (id) catalogs.setLocalidadId(id);
                }}
                disabled={
                  !catalogs.selectedMunicipioId || catalogs.isLoadingLocalidades
                }
                style={inputStyle('localidad')}
                onFocus={() => setFocusedField('localidad')}
                onBlur={() => setFocusedField(null)}
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

        {error && (
          <p style={{ textAlign: 'center', fontSize: 13, color: theme.coral }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              ...btnBaseStyle,
              background: loading ? `${theme.coral}99` : theme.coral,
              color: '#fff',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
              flex: 1,
              height: 38,
            }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    width: 18,
                    height: 18,
                    border: '2.5px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                    display: 'inline-block',
                  }}
                />
                <span>Registrando…</span>
              </>
            ) : (
              'Registrarse'
            )}
          </button>
        </div>

        <p
          style={{
            textAlign: 'center',
            fontSize: 13,
            color: theme.muted,
          }}
        >
          ¿Ya tienes cuenta?{' '}
          <Link
            to="/login"
            style={{
              color: theme.brand,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Iniciar sesión
          </Link>
        </p>
      </form>

      <WebDatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(date) => setFechaNacimiento(date)}
        initialDate={fechaNacimiento}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AuthLayout>
  );
}
