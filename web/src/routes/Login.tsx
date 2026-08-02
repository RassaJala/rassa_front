import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthLayout } from '~/components/layout/AuthLayout';
import { getColors } from '~/constants/colors';
import { useAuth } from '~/hooks/useAuth';
import { useTheme } from '~/providers/ThemeProvider';
import api from '~/services/api';
import type { User } from '~/types';
import { normalizeRole } from '~/types';

import { parseApiError } from '~/utils/apiErrors';
import { EMAIL_REGEX } from '~/utils/validation';

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

function loginErrors(
  email: string,
  password: string,
): { email?: string; password?: string } {
  const errs: { email?: string; password?: string } = {};
  if (!email.trim()) errs.email = 'Ingresá tu correo electrónico';
  else if (!EMAIL_REGEX.test(email.trim()))
    errs.email = 'El correo no tiene formato válido';
  if (!password) errs.password = 'Ingresá tu contraseña';
  else if (password.length < 8)
    errs.password = 'La contraseña debe tener al menos 8 caracteres.';
  return errs;
}

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
    if (loading) return;
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
      setGeneralError(parseApiError(err, 'Error al iniciar sesión.'));
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
                borderColor: errors.email ? theme.coral : theme.border,
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
            <span style={{ fontSize: 12, color: theme.coral }}>
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
              minLength={8}
              style={{
                ...inputBase,
                borderColor: errors.password ? theme.coral : theme.border,
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
            <span style={{ fontSize: 12, color: theme.coral }}>
              {errors.password}
            </span>
          )}
        </div>

        {/* General error */}
        {generalError && (
          <p style={{ textAlign: 'center', fontSize: 14, color: theme.coral }}>
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
            background: loading ? `${theme.coral}99` : theme.coral,
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
          ¿No tienes cuenta?{' '}
          <Link
            to="/register"
            style={{
              color: theme.brand,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Crear cuenta
          </Link>
        </p>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AuthLayout>
  );
}
