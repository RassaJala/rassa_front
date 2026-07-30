import { NavLink } from 'react-router-dom';
import { useAuth } from '~/hooks/useAuth';
import { useTheme } from '~/providers/ThemeProvider';
import { getColors } from '~/constants/colors';
import type { Role } from '~/types';

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
  { key: 'families', label: 'Familias', icon: '👥', path: '/admin/familias' },
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
  { key: 'users', label: 'Usuarios', icon: '👥', path: '/admin/usuarios' },
  { key: 'chat', label: 'Chat', icon: '💬', path: '/admin/chat' },
  { key: 'profile', label: 'Mi Perfil', icon: '👤', path: '/admin/perfil' },
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
    { key: 'chat', label: 'Chat', icon: '💬', path: '/agricultor/chat' },
    {
      key: 'profile',
      label: 'Mi Perfil',
      icon: '👤',
      path: '/agricultor/perfil',
    },
  ],
  vendedor: [
    { key: 'sales', label: 'Ventas', icon: '📊', path: '/vendedor/ventas' },
    { key: 'orders', label: 'Pedidos', icon: '📦', path: '/vendedor/pedidos' },
    { key: 'chat', label: 'Chat', icon: '💬', path: '/vendedor/chat' },
    {
      key: 'profile',
      label: 'Mi Perfil',
      icon: '👤',
      path: '/vendedor/perfil',
    },
  ],
  cliente: [
    { key: 'home', label: 'Inicio', icon: '🏠', path: '/cliente' },
    {
      key: 'catalog',
      label: 'Catálogo',
      icon: '🛍️',
      path: '/cliente/catalogo',
    },
    { key: 'cart', label: 'Carrito', icon: '🛒', path: '/cliente/carrito' },
    { key: 'orders', label: 'Pedidos', icon: '📦', path: '/cliente/pedidos' },
    { key: 'chat', label: 'Chat', icon: '💬', path: '/cliente/chat' },
    { key: 'profile', label: 'Mi Perfil', icon: '👤', path: '/cliente/perfil' },
  ],
};

export function Sidebar({ role }: { role: Role }) {
  const { user } = useAuth();
  const { resolved } = useTheme();
  const c = getColors(resolved === 'dark');
  const items = roleNavMap[role] ?? adminNav;

  const sidebarBg = c.sidebarBg;
  const borderColor = c.border;
  const activeBg = c.activeBg;
  const fg = c.fg;
  const muted = c.muted;
  const brand = c.brand;

  const roleLabels: Record<
    string,
    { initials: string; label: string; subtitle: string }
  > = {
    admin: { initials: 'AD', label: 'Admin', subtitle: 'Administrador' },
    agricultor: { initials: 'AG', label: 'Agricultor', subtitle: 'Productor' },
    farmer: { initials: 'AG', label: 'Agricultor', subtitle: 'Productor' },
    vendedor: { initials: 'VD', label: 'Vendedor', subtitle: 'Vendedor' },
    cliente: { initials: 'CL', label: 'Cliente', subtitle: 'Cliente' },
  };

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
      <NavLink
        to={items[0]?.path ?? '/'}
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
      </NavLink>

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
            end
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
            background: brand,
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {user?.nombre?.slice(0, 2).toUpperCase() ??
            roleLabels[role]?.initials ??
            'AD'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: fg }}>
            {user?.nombre ?? roleLabels[role]?.label ?? 'Admin'}
          </div>
          <div style={{ fontSize: 12, color: muted }}>
            {roleLabels[role]?.subtitle ?? 'Administrador'}
          </div>
        </div>
      </div>
    </aside>
  );
}
