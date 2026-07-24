import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ProductFormModal } from '../components/ProductFormModal';
import type { Producto } from '../components/ProductFormModal';
import { mediaUrl as sharedMediaUrl } from '../components/ProductFormModal';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAppColors } from '../hooks/useAppColors';
import api from '../services/api';

// ── Types ──────────────────────────────────────────────────

interface Category {
  id_categoria: number;
  nombre: string;
}

interface Unidad {
  id_unidad: number;
  tipo: string;
}

interface ApiResponse<T> {
  data: T;
}

// ── Helpers ────────────────────────────────────────────────

function categoryName(cat: Category | number, categories: Category[]): string {
  if (typeof cat === 'object' && cat !== null) return cat.nombre;
  return categories.find((c) => c.id_categoria === cat)?.nombre ?? '';
}

const getActionBtnStyle = (
  colors: ReturnType<typeof useAppColors>,
): React.CSSProperties => ({
  width: 40,
  height: 40,
  borderRadius: 10,
  border: `1px solid ${colors.inputBorder}`,
  background: colors.surface,
  cursor: 'pointer',
  fontSize: 18,
  display: 'grid',
  placeItems: 'center',
});

// ── Delete confirm ─────────────────────────────────────────
// ponytail: optimistic update para delete (#32)

function DeleteConfirm({
  producto,
  colors,
  onClose,
  onDeleted,
}: {
  producto: Producto;
  colors: ReturnType<typeof useAppColors>;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const qc = useQueryClient();
  const { fg, muted, surface, coral, border, inputBorder } = colors;
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    // ponytail: optimistic update — sacar producto del cache antes del request (#32)
    const previous = qc.getQueryData<Producto[]>(['farmer-productos']);
    if (previous) {
      qc.setQueryData<Producto[]>(['farmer-productos'], (old) =>
        (old ?? []).filter((p) => p.id_producto !== producto.id_producto),
      );
    }

    try {
      await api.delete(`/productos/${producto.id_producto}/`);
      await qc.invalidateQueries({ queryKey: ['farmer-productos'] });
      onDeleted();
    } catch {
      // ponytail: rollback on error (#32)
      if (previous) qc.setQueryData(['farmer-productos'], previous);
      setError('No se pudo eliminar. Intentá de nuevo.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-[90%] max-w-[440px] rounded-[20px] p-7"
        style={{
          background: surface,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          border: `1px solid ${border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-lg font-bold" style={{ color: fg }}>
          ¿Eliminar producto?
        </h3>
        <p className="mb-5 text-sm" style={{ color: muted }}>
          Se eliminará "{producto.nombre_producto}". Esta acción no se puede
          deshacer.
        </p>
        {error && (
          <p className="mb-4 text-[13px]" style={{ color: coral }}>
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2.5">
          <button
            onClick={onClose}
            disabled={loading}
            className="h-8 cursor-pointer rounded-lg px-3 font-[inherit] text-[13px] font-semibold"
            style={{
              border: `1.5px solid ${inputBorder}`,
              background: 'transparent',
              color: fg,
              opacity: loading ? 0.5 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="h-8 cursor-pointer rounded-lg px-3 font-[inherit] text-[13px] font-semibold"
            style={{
              border: `1.5px solid ${coral}`,
              background: 'transparent',
              color: coral,
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── FarmerProducts ─────────────────────────────────────────

export function FarmerProducts() {
  const colors = useAppColors();
  const { brand, coral, muted, border, surface, bg, fg, accentBg } = colors;
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [formTarget, setFormTarget] = useState<Producto | null | 'new'>(null);
  const [deleteTarget, setDeleteTarget] = useState<Producto | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categorias/');
      const result = data.data;
      return Array.isArray(result) ? result : result?.results ?? [];
    },
    staleTime: 60_000,
  });

  const { data: unidades = [] } = useQuery<Unidad[]>({
    queryKey: ['unidades'],
    queryFn: async () => {
      const { data } = await api.get('/unidades/');
      const result = data.data;
      return Array.isArray(result) ? result : result?.results ?? [];
    },
    staleTime: 60_000,
  });

  const {
    data: products = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Producto[]>({
    queryKey: ['farmer-productos', debouncedSearch, selectedCat],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('nombre', debouncedSearch);
      if (selectedCat) params.set('categoria', String(selectedCat));
      const qs = params.toString();
      const { data } = await api.get<ApiResponse<{ results: Producto[] }>>(
        `/productos/${qs ? `?${qs}` : ''}`,
      );
      return data.data.results;
    },
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-7 right-7 z-[100] rounded-xl px-5 py-3 text-sm font-semibold text-white"
          style={{ background: brand, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
        >
          ✓ {toast}
        </div>
      )}

      <PageHeader
        title="Mis Productos"
        action={
          <Button variant="primary" onClick={() => setFormTarget('new')}>
            + Agregar producto
          </Button>
        }
      />

      {/* Search + Filters */}
      <div className="mb-5 flex flex-col gap-3">
        <input
          type="search"
          placeholder="🔍  Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 w-full max-w-[400px] rounded-[10px] px-3.5 font-[inherit] text-[15px] outline-none"
          style={{
            border: `1.5px solid ${border}`,
            background: surface,
            color: fg,
          }}
        />

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {[{ id_categoria: 0, nombre: 'Todas' }, ...categories].map((c) => {
              const isActive =
                c.id_categoria === 0
                  ? selectedCat === null
                  : selectedCat === c.id_categoria;
              return (
                <button
                  key={c.id_categoria}
                  onClick={() =>
                    setSelectedCat(c.id_categoria === 0 ? null : c.id_categoria)
                  }
                  className="cursor-pointer rounded-[20px] px-3.5 py-1.5 font-[inherit] text-[13px] font-semibold"
                  style={{
                    border: `1px solid ${isActive ? brand : border}`,
                    background: isActive ? brand : surface,
                    color: isActive ? '#fff' : fg,
                  }}
                >
                  {c.nombre}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-12 text-center" style={{ color: muted }}>
          Cargando productos…
        </div>
      ) : isError ? (
        <div className="py-12 text-center">
          <p className="mb-3" style={{ color: coral }}>
            Error al cargar productos
          </p>
          <Button variant="secondary" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      ) : products.length === 0 ? (
        <div
          className="rounded-2xl py-16 text-center"
          style={{
            background: surface,
            border: `1px solid ${border}`,
          }}
        >
          <p className="mb-3 text-[40px]">📦</p>
          <p className="mb-1.5 text-lg font-bold" style={{ color: fg }}>
            No hay productos
          </p>
          <p className="text-sm" style={{ color: muted }}>
            Agregá un producto para comenzar a vender.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div
            className="hidden overflow-hidden rounded-2xl md:block"
            style={{
              background: surface,
              border: `1px solid ${border}`,
            }}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr
                  style={{
                    borderBottom: `1px solid ${border}`,
                    background: bg,
                  }}
                >
                  {[
                    'Producto',
                    'Precio',
                    'Stock',
                    'Categoría',
                    'Estado',
                    '',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-[18px] py-3.5 text-left text-[13px] font-semibold uppercase tracking-[0.05em]"
                      style={{ color: muted }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id_producto}
                    style={{ borderBottom: `1px solid ${border}` }}
                  >
                    <td className="px-[18px] py-4">
                      <div className="flex items-center gap-3.5">
                        <div
                          className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl"
                          style={{ background: accentBg }}
                        >
                          {sharedMediaUrl(p.imagen_principal ?? p.imagen) ? (
                            <img
                              src={sharedMediaUrl(
                                p.imagen_principal ?? p.imagen,
                              )!}
                              className="h-full w-full object-cover"
                              alt={p.nombre_producto}
                            />
                          ) : (
                            <span className="text-xl">🌿</span>
                          )}
                        </div>
                        <div>
                          <div
                            className="text-base font-semibold"
                            style={{ color: fg }}
                          >
                            {p.nombre_producto}
                          </div>
                          {p.es_perecedero && (
                            <span
                              className="text-xs font-semibold"
                              style={{ color: '#F2A900' }}
                            >
                              Perecedero
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td
                      className="px-[18px] py-4 text-[15px] font-bold"
                      style={{ color: brand }}
                    >
                      ${p.precio}
                    </td>
                    <td
                      className="px-[18px] py-4 text-[15px]"
                      style={{ color: fg }}
                    >
                      {p.stock}
                    </td>
                    <td
                      className="px-[18px] py-4 text-[15px]"
                      style={{ color: fg }}
                    >
                      {categoryName(p.categoria, categories)}
                    </td>
                    <td className="px-[18px] py-4">
                      <Badge variant={p.estado ? 'success' : 'default'}>
                        {p.estado ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-[18px] py-4">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setFormTarget(p)}
                          title="Editar"
                          style={getActionBtnStyle(colors)}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          title="Eliminar"
                          style={{ ...getActionBtnStyle(colors), color: coral }}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {products.map((p) => (
              <div
                key={p.id_producto}
                className="flex items-center gap-3.5 rounded-[14px] p-4"
                style={{
                  background: surface,
                  border: `1px solid ${border}`,
                }}
              >
                <div
                  className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl"
                  style={{ background: accentBg }}
                >
                  {sharedMediaUrl(p.imagen_principal ?? p.imagen) ? (
                    <img
                      src={sharedMediaUrl(p.imagen_principal ?? p.imagen)!}
                      className="h-full w-full object-cover"
                      alt={p.nombre_producto}
                    />
                  ) : (
                    <span className="text-2xl">🌿</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold" style={{ color: fg }}>
                    {p.nombre_producto}
                  </p>
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <p className="text-sm" style={{ color: muted }}>
                      {categoryName(p.categoria, categories)}
                    </p>
                    <Badge
                      variant={p.estado ? 'success' : 'default'}
                      className="!px-2 !py-0.5 !text-xs"
                    >
                      {p.estado ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <p className="text-base font-bold" style={{ color: brand }}>
                    ${p.precio}{' '}
                    <span className="text-sm font-normal" style={{ color: fg }}>
                      · Stock: {p.stock}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => setFormTarget(p)}
                    style={getActionBtnStyle(colors)}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setDeleteTarget(p)}
                    style={{ ...getActionBtnStyle(colors), color: coral }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      {formTarget === 'new' && (
        <ProductFormModal
          categories={categories}
          unidades={unidades}
          colors={colors}
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null);
            showToast('Producto creado.');
          }}
        />
      )}
      {formTarget !== null && formTarget !== 'new' && (
        <ProductFormModal
          producto={formTarget}
          categories={categories}
          unidades={unidades}
          colors={colors}
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null);
            showToast('Producto actualizado.');
          }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          producto={deleteTarget}
          colors={colors}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            showToast('Producto eliminado.');
          }}
        />
      )}
    </div>
  );
}

// ── FarmerOrders ───────────────────────────────────────────

export function FarmerOrders() {
  const { surface, border, fg, muted } = useAppColors();
  return (
    <div>
      <PageHeader title="Pedidos" />
      <div
        className="rounded-2xl py-12 text-center"
        style={{
          background: surface,
          border: `1px solid ${border}`,
        }}
      >
        <p className="mb-3 text-[40px]">📦</p>
        <p className="mb-1.5 text-lg font-bold" style={{ color: fg }}>
          No hay pedidos
        </p>
        <p className="text-sm" style={{ color: muted }}>
          Para el futuro equipo que le toque esta parte
        </p>
      </div>
    </div>
  );
}
