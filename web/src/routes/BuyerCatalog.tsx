import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Toast } from '../components/ui/Toast';
import type { ToastState } from '../components/ui/Toast';
import { getColors } from '../constants/colors';
import { useTheme } from '../providers/ThemeProvider';
import { useCartStore } from '../store/cartStore';
import api from '../services/api';
import { mediaUrl } from '../utils/mediaUrl';

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

interface FlatProduct extends CatalogProduct {
  id_publicacion: number;
  agricultor: string;
}

interface Categoria {
  id_categoria: number;
  nombre: string;
}

export function BuyerCatalog() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [products, setProducts] = useState<FlatProduct[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const addItem = useCartStore((s) => s.addItem);
  const { resolved } = useTheme();
  const c = getColors(resolved === 'dark');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [pubsRes, catsRes] = await Promise.all([
          api.get<{ data: CatalogPublication[] }>('/publicaciones/current/'),
          api.get<{ data: Categoria[] }>('/categorias/'),
        ]);
        if (cancelled) return;
        const flat: FlatProduct[] = pubsRes.data.data.flatMap((p) =>
          p.productos.map((prod) => ({
            ...prod,
            id_publicacion: p.id_publicacion,
            agricultor: `${p.agricultor.nombre} ${p.agricultor.apellido}`,
          })),
        );
        setProducts(flat);
        const catsData = catsRes.data.data;
        setCategories(Array.isArray(catsData) ? catsData : []);
      } catch {
        if (!cancelled) setError('No se pudieron cargar los productos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => !q || p.producto.toLowerCase().includes(q));
  }, [products, search]);

  const handleAddToCart = useCallback(
    (producto: CatalogProduct) => {
      const prod = products.find(
        (p) => p.id_producto_semanal === producto.id_producto_semanal,
      );
      addItem({
        id_producto_semanal: producto.id_producto_semanal,
        producto: producto.producto,
        unidad: producto.unidad,
        precio: Number(producto.precio),
        foto: producto.foto,
        agricultor: prod?.agricultor ?? '',
        stock: producto.stock,
      });
      setToast({
        message: `${producto.producto} agregado al carrito`,
        type: 'success',
      });
    },
    [addItem, products],
  );

  // ── Inline theme styles ──────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 12,
    border: `1px solid ${c.border}`,
    backgroundColor: c.surface,
    padding: '12px 16px',
    fontSize: 14,
    color: c.fg,
    outline: 'none',
    transition: 'border-color 0.15s',
  };

  const inputFocusClass =
    'focus:border-brand-green-forest focus:ring-1 focus:ring-brand-green-forest';

  const chipBase: React.CSSProperties = {
    borderRadius: 9999,
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 500,
    transition: 'background-color 0.15s, color 0.15s',
    cursor: 'pointer',
  };

  const cardStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: 16,
    border: `1px solid ${c.border}`,
    backgroundColor: c.surface,
  };

  const imgPlaceholderStyle: React.CSSProperties = {
    display: 'flex',
    height: 176,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bg,
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Catálogo" />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-green-forest" />
          <span className="ml-3 text-sm" style={{ color: c.muted }}>
            Cargando productos...
          </span>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Catálogo" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="mb-4 text-5xl">⚠️</span>
          <h3 className="text-lg font-semibold" style={{ color: c.fg }}>
            {error}
          </h3>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-brand-green-forest px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Reintentar
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Catálogo" />

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar productos..."
          style={inputStyle}
          className={inputFocusClass}
        />
      </div>

      {/* Category chips */}
      {categories.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              ...chipBase,
              ...(selectedCategory === null
                ? { backgroundColor: c.brand, color: '#fff' }
                : {
                    border: `1px solid ${c.border}`,
                    backgroundColor: c.surface,
                    color: c.fg,
                  }),
            }}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id_categoria}
              onClick={() => setSelectedCategory(cat.id_categoria)}
              style={{
                ...chipBase,
                ...(selectedCategory === cat.id_categoria
                  ? { backgroundColor: c.brand, color: '#fff' }
                  : {
                      border: `1px solid ${c.border}`,
                      backgroundColor: c.surface,
                      color: c.fg,
                    }),
              }}
            >
              {cat.nombre}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="mb-4 text-5xl">📦</span>
          <h3 className="text-lg font-semibold" style={{ color: c.fg }}>
            No se encontraron productos
          </h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => {
            const imageUri = mediaUrl(item.foto);
            const precio = Number(item.precio);
            return (
              <div key={item.id_producto_semanal} style={cardStyle}>
                {/* Image */}
                <div style={imgPlaceholderStyle}>
                  {imageUri ? (
                    <img
                      src={imageUri}
                      alt={item.producto}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl" style={{ color: c.muted }}>
                      🥬
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-base font-bold" style={{ color: c.fg }}>
                    {item.producto}
                  </h3>
                  <p
                    className="mt-1 text-lg font-bold"
                    style={{ color: c.brand }}
                  >
                    ${precio.toFixed(2)}/{item.unidad}
                  </p>
                  <p className="mt-1" style={{ fontSize: 12, color: c.muted }}>
                    Stock:{' '}
                    <span
                      style={{ fontWeight: 700, fontSize: 14, color: c.fg }}
                    >
                      {item.stock}
                    </span>{' '}
                    <span style={{ fontSize: 11 }}>
                      {item.unidad} disponibles
                    </span>
                  </p>
                  {item.agricultor ? (
                    <p
                      className="mt-1"
                      style={{ fontSize: 12, color: c.muted }}
                    >
                      🌱 {item.agricultor}
                    </p>
                  ) : null}

                  <div className="mt-auto pt-3">
                    <button
                      onClick={() => handleAddToCart(item)}
                      disabled={item.stock === 0}
                      className="w-full rounded-xl py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        backgroundColor: item.stock === 0 ? c.muted : c.brand,
                      }}
                    >
                      {item.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Toast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}
