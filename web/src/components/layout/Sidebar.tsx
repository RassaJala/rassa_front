import { NavLink } from 'react-router-dom';
import { useTheme } from '../../providers/ThemeProvider';

interface NavItem {
  key: string;
  label: string;
  icon: string;
  path: string;
}

const adminNav: NavItem[] = [
  { key: 'dashboard', label: 'Panel', icon: '📊', path: '/admin' },
  { key: 'products', label: 'Productos', icon: '🥬', path: '/admin/productos' },
  {
    key: 'categories',
    label: 'Categorías',
    icon: '📁',
    path: '/admin/categorias',
  },
  { key: 'units', label: 'Unidades', icon: '📏', path: '/admin/unidades' },
  {
    key: 'municipios',
    label: 'Municipios',
    icon: '🏛️',
    path: '/admin/municipios',
  },
  {
    key: 'localidades',
    label: 'Localidades',
    icon: '📍',
    path: '/admin/localidades',
  },
];

const roleNavMap: Record<string, NavItem[]> = {
  admin: adminNav,
  agricultor: [
    {
      key: 'products',
      label: 'Productos',
      icon: '🥬',
      path: '/agricultor/productos',
    },
    {
      key: 'orders',
      label: 'Pedidos',
      icon: '📦',
      path: '/agricultor/pedidos',
    },
  ],
  vendedor: [
    { key: 'sales', label: 'Ventas', icon: '📊', path: '/vendedor/ventas' },
    { key: 'orders', label: 'Pedidos', icon: '📦', path: '/vendedor/pedidos' },
  ],
};

export function Sidebar({ role }: { role: string }) {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const items = roleNavMap[role] ?? adminNav;

  const sidebarBg = isDark ? '#161B17' : '#F5F7F0';
  const borderColor = isDark ? '#2A332A' : '#D6DAD4';
  const activeBg = isDark ? '#1C2D22' : '#E2F0E6';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const brand = isDark ? '#4A8A63' : '#24563C';

  return (
    <aside
      style={{
        width: 260,
        minHeight: '100vh',
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: sidebarBg,
        borderRight: `1px solid ${borderColor}`,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        transition: 'background 0.4s, border-color 0.4s',
      }}
    >
      {/* Brand */}
      <a
        href="/admin"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 20px 24px',
          borderBottom: `1px solid ${borderColor}`,
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${brand}, #4A8E68)`,
            display: 'grid',
            placeItems: 'center',
            fontSize: 18,
            color: '#fff',
          }}
        >
          🌱
        </span>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: fg,
          }}
        >
          RASSA-JALA
        </h1>
      </a>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {items.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.key === 'dashboard'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '11px 14px',
              borderRadius: 10,
              textDecoration: 'none',
              color: isActive ? brand : muted,
              fontSize: 14,
              fontWeight: isActive ? 600 : 500,
              background: isActive ? activeBg : 'transparent',
              transition: 'background 0.15s, color 0.15s',
            })}
          >
            <span
              style={{
                fontSize: 18,
                width: 22,
                textAlign: 'center',
                flexShrink: 0,
              }}
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: `1px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: '#DE393A',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          AD
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: fg }}>Admin</div>
          <div style={{ fontSize: 12, color: muted }}>Administrador</div>
        </div>
      </div>
    </aside>
  );
}
