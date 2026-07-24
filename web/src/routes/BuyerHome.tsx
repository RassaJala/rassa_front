import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { getColors } from '../constants/colors';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../providers/ThemeProvider';
import { useCartStore } from '../store/cartStore';
import api from '../services/api';

interface CatalogProduct {
  id_producto_semanal: number;
  producto: string;
  unidad: string;
  stock: number;
  precio: string;
  foto: string | null;
}

interface CatalogPublication {
  id_publicacion: number;
  agricultor: { id_usuario: number; nombre: string; apellido: string };
  productos: CatalogProduct[];
}

function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/api\/?$/, '');
  return `${base}${path}`;
}

export function BuyerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.cantidad, 0));
  const { resolved } = useTheme();
  const c = getColors(resolved === 'dark');

  const [featured, setFeatured] = useState<CatalogProduct[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get<{ data: CatalogPublication[] }>('/publicaciones/current/');
        if (cancelled) return;
        const products = res.data.data
          .flatMap((p) => p.productos)
          .filter((p) => p.stock > 0)
          .slice(0, 6);
        setFeatured(products);
      } catch {
        // silent — featured is optional
      } finally {
        if (!cancelled) setLoadingFeatured(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const firstName = user?.nombre ?? '';

  // ── Shared styles ─────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    borderRadius: 16,
    border: `1px solid ${c.border}`,
    backgroundColor: c.surface,
    padding: 20,
  };

  const quickLinkStyle: React.CSSProperties = {
    ...cardStyle,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    textDecoration: 'none',
  };

  return (
    <>
      <PageHeader title="Inicio" />

      {/* Welcome */}
      <div className="mb-2">
        <h2 className="text-2xl font-bold" style={{ color: c.fg }}>
          {firstName ? `Bienvenido, ${firstName}` : 'Bienvenido'}
        </h2>
        <p className="mt-1 max-w-lg text-sm" style={{ color: c.muted }}>
          Explorá los productos frescos de productores locales. Usá el menú
          lateral para navegar entre las secciones.
        </p>
      </div>

      {/* Cart summary */}
      <div style={{ ...cardStyle, marginTop: 24, marginBottom: 24 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 28 }}>🛒</span>
            <div>
              <p className="text-sm font-medium" style={{ color: c.muted }}>Productos en el carrito</p>
              <p className="text-2xl font-bold" style={{ color: c.fg }}>{cartCount}</p>
            </div>
          </div>
          {cartCount > 0 && (
            <button
              onClick={() => navigate('/cliente/carrito')}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: c.brand }}
            >
              Ver carrito
            </button>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-8">
        <div
          style={quickLinkStyle}
          onClick={() => navigate('/cliente/catalogo')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/cliente/catalogo'); }}
        >
          <span style={{ fontSize: 32 }}>🛍️</span>
          <div>
            <p className="text-base font-bold" style={{ color: c.fg }}>Catálogo</p>
            <p className="text-xs" style={{ color: c.muted }}>Explorá productos frescos</p>
          </div>
        </div>
        <div
          style={quickLinkStyle}
          onClick={() => navigate('/cliente/carrito')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/cliente/carrito'); }}
        >
          <span style={{ fontSize: 32 }}>🛒</span>
          <div>
            <p className="text-base font-bold" style={{ color: c.fg }}>Mi Carrito</p>
            <p className="text-xs" style={{ color: c.muted }}>{cartCount} {cartCount === 1 ? 'producto' : 'productos'}</p>
          </div>
        </div>
      </div>

      {/* Featured products */}
      <h3 className="mb-4 text-lg font-bold" style={{ color: c.fg }}>Productos destacados</h3>
      {loadingFeatured ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-200 border-t-brand-green-forest" />
        </div>
      ) : featured.length === 0 ? (
        <p className="py-6 text-center text-sm" style={{ color: c.muted }}>No hay productos disponibles por el momento.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {featured.map((item) => {
            const imageUri = mediaUrl(item.foto);
            const precio = Number(item.precio);
            return (
              <div
                key={item.id_producto_semanal}
                style={{
                  borderRadius: 14,
                  border: `1px solid ${c.border}`,
                  backgroundColor: c.surface,
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
                onClick={() => navigate('/cliente/catalogo')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate('/cliente/catalogo'); }}
              >
                <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
                  {imageUri ? (
                    <img src={imageUri} alt={item.producto} className="h-full w-full object-cover" />
                  ) : (
                    <span style={{ fontSize: 32, color: c.muted }}>🥬</span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="truncate text-xs font-bold" style={{ color: c.fg }}>{item.producto}</p>
                  <p className="mt-0.5 text-xs font-bold" style={{ color: c.brand }}>${precio.toFixed(2)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
