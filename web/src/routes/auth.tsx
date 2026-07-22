import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import axios from 'axios';
import { AuthLayout } from '~/components/layout/AuthLayout';
import { Button } from '~/components/ui/Button';
import { useAuth } from '~/hooks/useAuth';
import api from '~/services/api';
import type { Role, User } from '~/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_MAP: Record<string, Role> = {
  admin: 'admin',
  administrador: 'admin',
  farmer: 'agricultor',
  agricultor: 'agricultor',
  productor: 'agricultor',
  seller: 'vendedor',
  vendedor: 'vendedor',
  buyer: 'comprador',
  comprador: 'comprador',
  cliente: 'comprador',
};

// ponytail: normalize backend role strings to web Role type
function normalizeRole(raw: string): Role {
  return ROLE_MAP[raw.toLowerCase()] ?? 'comprador';
}

function mapRegisterUser(raw: Record<string, unknown>): User {
  return {
    id: raw.id_usuario as number,
    email: raw.email as string,
    nombre: raw.nombre as string,
    rol: normalizeRole(raw.role as string),
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
    rol: raw.role as string as Role,
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

      // ponytail: pasar token explícitamente porque AuthProvider aún no guardó (#21)
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
              color: '#5E6B5E',
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
                borderColor: errors.email ? errColor : '#D6DAD4',
                background: '#FFFFFF',
                color: '#2D3328',
              }}
              onFocus={(e) => {
                if (!errors.email) e.target.style.borderColor = brand;
              }}
              onBlur={(e) => {
                if (!errors.email) e.target.style.borderColor = '#D6DAD4';
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
              color: '#5E6B5E',
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
                borderColor: errors.password ? errColor : '#D6DAD4',
                background: '#FFFFFF',
                color: '#2D3328',
              }}
              onFocus={(e) => {
                if (!errors.password) e.target.style.borderColor = brand;
              }}
              onBlur={(e) => {
                if (!errors.password) e.target.style.borderColor = '#D6DAD4';
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
                color: '#5E6B5E',
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
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AuthLayout>
  );
}

export function RegisterScreen() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [sexo, setSexo] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [localidad, setLocalidad] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = registerErrors(
      { nombre, apellido, email, password, telefono },
      passwordConfirm,
    );
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setLoading(true);

    const payload = {
      email: email.trim(),
      password,
      nombre: nombre.trim(),
      apellido_paterno: apellido.trim(),
      apellido_materno: null,
      telefono: telefono.trim() || null,
      fecha_nacimiento: fechaNacimiento || null,
      sexo: sexo || null,
      domicilio: domicilio.trim() || null,
      fk_localidad: localidad ? Number(localidad) : null,
      role: 'comprador',
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
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-brand-ink placeholder:text-gray-400 focus:border-brand-red-coral focus:outline-none focus:ring-1 focus:ring-brand-red-coral dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500';

  return (
    <AuthLayout title="Crear cuenta">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Nombre
            </label>
            <input
              type="text"
              placeholder="Juan"
              autoComplete="given-name"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Apellido
            </label>
            <input
              type="text"
              placeholder="Pérez"
              autoComplete="family-name"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Email
          </label>
          <input
            type="email"
            placeholder="tu@email.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="relative">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Contraseña
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} w-full pr-10`}
            />
          </div>
          <button
            type="button"
            className="absolute right-3 top-[34px] text-xs font-medium text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
          >
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirmar contraseña
          </label>
          <input
            type="password"
            placeholder="Repetí la contraseña"
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Teléfono
          </label>
          <input
            type="tel"
            placeholder="11 1234-5678"
            autoComplete="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Fecha de nacimiento
          </label>
          <input
            type="date"
            className={inputClass}
            value={fechaNacimiento}
            onChange={(e) => setFechaNacimiento(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Sexo
          </label>
          <select
            className={inputClass}
            value={sexo}
            onChange={(e) => setSexo(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="O">Otro</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Domicilio
          </label>
          <input
            type="text"
            placeholder="Calle 123"
            autoComplete="street-address"
            value={domicilio}
            onChange={(e) => setDomicilio(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Localidad (ID)
          </label>
          <input
            type="number"
            placeholder="1"
            value={localidad}
            onChange={(e) => setLocalidad(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && <p className="text-center text-sm text-red-500">{error}</p>}

        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Registrando…' : 'Registrarse'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        ¿Ya tienes cuenta?{' '}
        <a
          href="/login"
          className="font-medium text-brand-red-coral hover:underline"
        >
          Inicia sesión
        </a>
      </p>
    </AuthLayout>
  );
}
