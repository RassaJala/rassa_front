import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../providers/ThemeProvider';
import { getColors } from '../../constants/colors';

export function Topbar() {
  const { logout } = useAuth();
  const { resolved, toggle } = useTheme();
  const isDark = resolved === 'dark';
  const c = getColors(isDark);
  const { border, bg, surface, fg, muted, brand, coral } = c;

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
      {/* Search */}
      <div style={{ flex: 1, maxWidth: 360, position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 15,
            opacity: 0.5,
            pointerEvents: 'none',
          }}
        >
          🔍
        </span>
        <input
          type="search"
          placeholder="Buscar pedidos, productos, productores…"
          aria-label="Buscar"
          style={{
            width: '100%',
            height: 40,
            border: `1.5px solid ${border}`,
            borderRadius: 10,
            padding: '0 14px 0 38px',
            fontSize: 14,
            fontFamily: 'inherit',
            background: surface,
            color: fg,
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = brand;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = border;
          }}
        />
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginLeft: 'auto',
        }}
      >
        {/* Notifications */}
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
              background: coral,
              position: 'absolute',
              top: 6,
              right: 6,
            }}
          />
        </button>

        {/* Theme toggle */}
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
