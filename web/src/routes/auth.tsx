import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthLayout } from '../components/layout/AuthLayout';
import WebDatePickerModal from '../components/WebDatePickerModal';
import { getColors } from '../constants/colors';
import { useAuth } from '../hooks/useAuth';
import { useCatalogs } from '../hooks/useCatalogs';
import { useTheme } from '../providers/ThemeProvider';
import api from '../services/api';
import type { Role, User } from '../types';
import { AuthLayout } from '~/components/layout/AuthLayout';
import { Button } from '~/components/ui/Button';
import { useAuth } from '~/hooks/useAuth';
import api from '~/services/api';
import type { Role, User } from '~/types';
import { normalizeRole } from '~/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mapRegisterUser(raw: Record<string, unknown>): User {
  return {
    id: raw.id_usuario as number,
    email: raw.email as string,
    nombre: raw.nombre as string,
    apellido_paterno: (raw.apellido_paterno as string) ?? '',
    rol: normalizeRole((raw.rol ?? raw.role) as string | undefined),
  };
}

function mapMeUser(raw: Record<string, unknown>): User {
  return {
    id: raw.id_usuario as number,
    email: raw.email as string,
    nombre: raw.nombre as string,
    apellido_paterno: raw.apellido_paterno as string,
    apellido_materno: raw.apellido_materno as string | undefined,
    telefono: raw.telefono as string | undefined,
    fecha_nacimiento: raw.fecha_nacimiento as string | undefined,
    genero: raw.genero as string | undefined,
    direccion: raw.direccion as string | undefined,
    municipio_id: raw.municipio_id as number | undefined,
    municipio_nombre: raw.municipio_nombre as string | undefined,
    localidad: raw.localidad as number | undefined,
    localidad_nombre: raw.localidad_nombre as string | undefined,
    rol: normalizeRole((raw.rol ?? raw.role) as string | undefined),
  };
}

// ponytail: inline validation, add zod when forms grow beyond 2 pages
function loginErrors(
  email: string,
  password: string,
): { email?: string; password?: string } {
  const errs: { email?: string; password?: string } = {};
  if (!email.trim()) errs.email = 'Ingresá tu correo electrónico';
  else if (!EMAIL_RE.test(email.trim()))
    errs.email = 'El correo no tiene formato válido';
  if (!password) errs.password = 'Ingresá tu contraseña';
  else if (password.length < 6)
    errs.password = 'La contraseña debe tener al menos 6 caracteres.';
  return errs;
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
  const { nombre, apellido, email, password, telefono, fechaNacimiento, sexo, domicilio, localidadId } = fields;

  if (!email.trim()) return 'El email es obligatorio.';
  if (!EMAIL_RE.test(email.trim())) return 'Ingresa un correo electrónico válido.';
  if (!password) return 'La contraseña es obligatoria.';
  if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
  if (!telefono.trim()) return 'El teléfono es obligatorio.';
  const digits = telefono.replace(/\D/g, '');
  const cleanedPhone = telefono.trim().startsWith('+')
    ? digits.slice(0, 12)
    : digits.slice(0, 10);
  if (cleanedPhone.length !== 10 && cleanedPhone.length !== 12) return 'El teléfono debe tener 10 dígitos (nacional) o 12 dígitos (internacional).';
  if (!nombre.trim()) return 'El nombre es obligatorio.';
  if (!apellido.trim()) return 'El apellido paterno es obligatorio.';
  if (!fechaNacimiento.trim()) return 'La fecha de nacimiento es obligatoria.';
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(fechaNacimiento)) return 'La fecha de nacimiento debe tener el formato AAAA-MM-DD.';
  if (!sexo) return 'Seleccioná un género.';
  if (!domicilio.trim()) return 'La dirección es obligatoria.';
  if (localidadId === null) return 'Seleccioná una localidad.';
function registerErrors(
  fields: {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    telefono: string;
  },
  passwordConfirm: string,
): string | null {
  const { nombre, apellido, email, password, telefono } = fields;
  if (!nombre.trim() || !apellido.trim() || !email.trim() || !password) {
    return 'Nombre, apellido, email y contraseña son obligatorios.';
  }
  if (!EMAIL_RE.test(email.trim())) return 'Email inválido.';
  if (password.length < 6)
    return 'La contraseña debe tener al menos 6 caracteres.';
  if (password !== passwordConfirm) return 'Las contraseñas no coinciden.';
  if (telefono && telefono.length < 7) return 'Número de teléfono inválido.';
  return null;
}

const brand = '#24563C';
const coral = '#DE393A';
const errColor = '#DE393A';
// ponytail: oklch equivalents — brand: oklch(42% 0.14 148), coral: oklch(60% 0.17 18)

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export function LoginScreen() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { resolved } = useTheme();
  const theme = getColors(resolved === 'dark');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = loginErrors(email, password);
    if (errs.email || errs.password) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setGeneralError(null);
    setLoading(true);

    try {
      const { data: tokens } = await api.post<{
        access: string;
        refresh: string;
      }>('/token/', { email: email.trim(), password });

      localStorage.setItem('token', tokens.access);
      if (tokens.refresh)
        sessionStorage.setItem('refresh_token', tokens.refresh);

      const { data: meData } = await api.get<{ data: Record<string, unknown> }>(
        '/auth/me/',
        { headers: { Authorization: `Bearer ${tokens.access}` } },
      );
      const user = mapMeUser(meData.data);

      login(tokens.access, user);

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
      const respData = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      let msg = (err as Error)?.message ?? 'Error al iniciar sesión.';
      if (respData?.detail && typeof respData.detail === 'string') {
        msg = respData.detail;
      // ponytail: sanitizar — no exponer err.message crudo (puede filtrar infra)
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401) setGeneralError('Credenciales inválidas.');
        else if (status === 429)
          setGeneralError('Límite de peticiones excedido. Intentá más tarde.');
        else if (status && status >= 500)
          setGeneralError('Error del servidor. Intentá más tarde.');
        else setGeneralError('Error al iniciar sesión.');
      } else {
        setGeneralError('Error al iniciar sesión.');
      }
      setGeneralError(msg);
    } finally {
      setLoading(false);
    }
  }

  const inputBase = {
    width: '100%',
    height: 52,
    border: `1.5px solid`,
    borderRadius: 14,
    padding: '0 48px 0 44px',
    fontSize: 16,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  };

  return (
    <AuthLayout title="Iniciar sesión">
      <form
        className="flex flex-col gap-[18px]"
        onSubmit={handleSubmit}
        style={{}}
      >
        {/* Email field */}
        <div className="flex flex-col gap-[5px]">
          <label
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: theme.muted,
            }}
          >
            Correo electrónico
          </label>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: 14,
                fontSize: 16,
                opacity: 0.5,
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              📧
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email)
                  setErrors((p) => {
                    const n = { ...p };
                    delete n.email;
                    return n;
                  });
              }}
              placeholder="tu@correo.com"
              autoComplete="email"
              inputMode="email"
              required
              style={{
                ...inputBase,
                borderColor: errors.email ? errColor : theme.border,
                background: theme.surface,
                color: theme.fg,
              }}
              onFocus={(e) => {
                if (!errors.email) e.target.style.borderColor = theme.brand;
              }}
              onBlur={(e) => {
                if (!errors.email) e.target.style.borderColor = theme.border;
              }}
            />
          </div>
          {errors.email && (
            <span style={{ fontSize: 12, color: errColor }}>
              {errors.email}
            </span>
          )}
        </div>

        {/* Password field */}
        <div className="flex flex-col gap-[5px]">
          <label
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: theme.muted,
            }}
          >
            Contraseña
          </label>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: 14,
                fontSize: 16,
                opacity: 0.5,
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              🔒
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password)
                  setErrors((p) => {
                    const n = { ...p };
                    delete n.password;
                    return n;
                  });
              }}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              minLength={6}
              style={{
                ...inputBase,
                borderColor: errors.password ? errColor : theme.border,
                background: theme.surface,
                color: theme.fg,
              }}
              onFocus={(e) => {
                if (!errors.password) e.target.style.borderColor = theme.brand;
              }}
              onBlur={(e) => {
                if (!errors.password) e.target.style.borderColor = theme.border;
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{
                position: 'absolute',
                right: 6,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 18,
                padding: 10,
                color: theme.muted,
                minWidth: 44,
                minHeight: 44,
                display: 'grid',
                placeItems: 'center',
              }}
              aria-label={
                showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
              }
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
          {errors.password && (
            <span style={{ fontSize: 12, color: errColor }}>
              {errors.password}
            </span>
          )}
        </div>

        {/* General error */}
        {generalError && (
          <p style={{ textAlign: 'center', fontSize: 14, color: errColor }}>
            {generalError}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            height: 54,
            border: 'none',
            borderRadius: 16,
            background: loading ? `${coral}99` : coral,
            color: '#fff',
            fontSize: 17,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: '0.01em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 12,
            transition: 'background 0.15s, opacity 0.15s',
          }}
        >
          {loading ? (
            <>
              <span
                style={{
                  width: 20,
                  height: 20,
                  border: '2.5px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                  display: 'inline-block',
                }}
              />
              <span style={{ display: 'none' }}>Iniciar sesión</span>
            </>
          ) : (
            'Iniciar sesión'
          )}
        </button>

        <p
          style={{
            textAlign: 'center',
            fontSize: 14,
            color: theme.muted,
            marginTop: 4,
          }}
        >
          ¿No tenés cuenta?{' '}
          <Link
            to="/register"
            style={{ color: theme.brand, fontWeight: 600, textDecoration: 'none' }}
          >
            Crear cuenta
          </Link>
        </p>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AuthLayout>
  );
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

    const payload = {
      email: email.trim(),
      password,
      nombre: nombre.trim().replace(/[^\sA-Za-zÁÉÍÑÓÚÜáéíñóúü]/g, ''),
      apellido_paterno: apellidoPaterno.trim().replace(/[^\sA-Za-zÁÉÍÑÓÚÜáéíñóúü]/g, ''),
      apellido_materno: apellidoMaterno.trim() ? apellidoMaterno.trim().replace(/[^\sA-Za-zÁÉÍÑÓÚÜáéíñóúü]/g, '') : null,
      telefono: telefono.trim().startsWith('+')
        ? telefono.replace(/\D/g, '').slice(0, 12)
        : telefono.replace(/\D/g, '').slice(0, 10),
      fecha_nacimiento: fechaNacimiento,
      sexo,
      domicilio: domicilio.trim().replace(/[^\s#,\-./0-9A-Za-zÁÉÍÑÓÚÜáéíñóúü]/g, ''),
      fk_localidad: catalogs.localidadId,
      role: 'buyer',
    };

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
      const respData = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      let msg = (err as Error)?.message ?? 'Error al registrarse.';
      if (respData?.detail && typeof respData.detail === 'string') {
        msg = respData.detail;
      } else if (respData && typeof respData === 'object') {
        const fieldErrors: string[] = [];
        for (const [key, val] of Object.entries(respData)) {
          if (key === 'non_field_errors') {
            const arr = Array.isArray(val) ? val : [val];
            fieldErrors.push(...arr.map(String));
          } else if (Array.isArray(val)) {
            fieldErrors.push(`${key}: ${val.map(String).join(', ')}`);
          }
        }
        if (fieldErrors.length > 0) msg = fieldErrors.join('\n');
      // ponytail: sanitizar — no exponer err.message crudo
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data;
        const backendMsg =
          data && typeof data === 'object' && typeof data.detail === 'string'
            ? data.detail
            : null;
        if (backendMsg) {
          setError(backendMsg);
        } else if (status === 409) {
          setError('Ya existe una cuenta con ese correo.');
        } else if (status && status >= 500) {
          setError('Error del servidor. Intentá más tarde.');
        } else {
          setError('Error al registrarse.');
        }
      } else {
        setError('Error al registrarse.');
      }
      setError(msg);
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
              onChange={(e) => setNombre(e.target.value)}
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
              onChange={(e) => setApellidoPaterno(e.target.value)}
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
              onChange={(e) => setApellidoMaterno(e.target.value)}
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
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
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
              onChange={(e) => setTelefono(e.target.value)}
              required
              style={inputStyle('telefono')}
              onFocus={() => setFocusedField('telefono')}
              onBlur={() => setFocusedField(null)}
            />
            <span style={{ fontSize: 10, color: theme.muted, lineHeight: '1.2' }}>
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
              onChange={(e) => setDomicilio(e.target.value)}
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
                  {catalogs.isLoadingMunicipios
                    ? 'Cargando...'
                    : 'Seleccionar'}
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
          <p style={{ textAlign: 'center', fontSize: 13, color: errColor }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              ...btnBaseStyle,
              background: loading ? `${coral}99` : coral,
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
          ¿Ya tenés cuenta?{' '}
          <Link
            to="/login"
            style={{ color: theme.brand, fontWeight: 600, textDecoration: 'none' }}
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
