import type { Role } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../providers/ThemeProvider';

export function Topbar({ role }: { role: Role }) {
  const { logout } = useAuth();
  const { resolved, toggle } = useTheme();
  const isDark = resolved === 'dark';
  const border = isDark ? '#2A332A' : '#D6DAD4';
  const bg = isDark ? '#1A211B' : '#F5F7F0';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const brand = isDark ? '#4A8A63' : '#24563C';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '16px 32px',
        borderBottom: `1px solid ${border}`,
        background: bg,
        position: 'sticky',
        top: 0,
        zIndex: 10,
        transition: 'background 0.4s, border-color 0.4s',
      }}
    >


      {/* Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginLeft: 'auto',
        }}
      >

        {/* Notifications — hidden for agricultor */}
        {role !== 'agricultor' && (
          <button
            aria-label="Notificaciones"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: `1px solid ${border}`,
              background: surface,
              fontSize: 16,
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              color: fg,
              position: 'relative',
            }}
          >
            🔔
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#DE393A',
                position: 'absolute',
                top: 6,
                right: 6,
              }}
            />
          </button>
        )}


        <button
          onClick={toggle}
          aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            border: `1px solid ${border}`,
            background: surface,
            fontSize: 16,
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            color: fg,
          }}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          style={{
            height: 40,
            padding: '0 14px',
            borderRadius: 10,
            border: `1px solid ${border}`,
            background: surface,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: muted,
            marginLeft: 8,
          }}
        >
          🚪 Salir
        </button>
      </div>
    </header>
  );
}
