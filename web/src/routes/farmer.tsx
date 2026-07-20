import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useTheme } from '../providers/ThemeProvider';
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

interface Producto {
  id_producto: number;
  nombre_producto: string;
  descripcion: string;
  precio: string;
  stock: number;
  es_perecedero: boolean;
  estado: boolean;
  categoria: Category | number;
  unidad: Unidad | null;
  imagen_principal: string | null;
  imagen: string | null;
  imagenes?: { id_imagen: number; url: string; es_principal: boolean }[];
}

interface ApiResponse<T> {
  data: T;
}

// ── Helpers ────────────────────────────────────────────────

const BASE = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
).replace(/\/api\/?$/, '');

function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE}${path}`;
}

function categoryName(cat: Category | number, categories: Category[]): string {
  if (typeof cat === 'object' && cat !== null) return cat.nombre;
  return categories.find((c) => c.id_categoria === cat)?.nombre ?? '';
}

// ── Colors ─────────────────────────────────────────────────
function useAppColors() {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  return {
    brand: isDark ? '#4A8A63' : '#24563C',
    coral: '#DE393A',
    muted: isDark ? '#9DA89D' : '#5E6B5E',
    border: isDark ? '#2A332A' : '#E2E6DF',
    inputBorder: isDark ? '#4A5C4F' : '#D6DAD4',
    surface: isDark ? '#263028' : '#FFFFFF',
    bg: isDark ? '#1A211B' : '#F5F7F0',
    fg: isDark ? '#E8EAE4' : '#2D3328',
    accentBg: isDark ? 'rgba(74,138,99,0.12)' : 'rgba(36,86,60,0.07)',
  };
}

// ── Product Form Modal ─────────────────────────────────────

interface FormState {
  nombre_producto: string;
  descripcion: string;
  precio: string;
  stock: string;
  es_perecedero: boolean;
  categoriaId: number | null;
  unidadId: number | null;
  imageFile: File | null;
  imagePreview: string | null;
  existingImageUrl: string | null;
  imageDeleted: boolean;
}

interface ProductFormModalProps {
  producto?: Producto;
  categories: Category[];
  unidades: Unidad[];
  onClose: () => void;
  onSaved: () => void;
}

function ProductFormModal({
  producto,
  categories,
  unidades,
  onClose,
  onSaved,
}: ProductFormModalProps) {
  const qc = useQueryClient();
  const colors = useAppColors();
  const { brand, coral, muted, border, surface, bg, fg, accentBg } = colors;
  const fileRef = useRef<HTMLInputElement>(null);
  const isEditing = Boolean(producto);

  const [form, setForm] = useState<FormState>({
    nombre_producto: producto?.nombre_producto ?? '',
    descripcion: producto?.descripcion ?? '',
    precio: producto?.precio ?? '',
    stock: String(producto?.stock ?? 0),
    es_perecedero: producto?.es_perecedero ?? false,
    categoriaId:
      typeof producto?.categoria === 'object'
        ? producto.categoria.id_categoria
        : (producto?.categoria ?? null),
    unidadId:
      typeof producto?.unidad === 'object' && producto.unidad !== null
        ? producto.unidad.id_unidad
        : (producto?.unidad ?? null),
    imageFile: null,
    imagePreview: null,
    existingImageUrl: mediaUrl(producto?.imagen_principal ?? producto?.imagen),
    imageDeleted: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => {
      const n = { ...p };
      delete n[key];
      return n;
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setForm((p) => ({
      ...p,
      imageFile: file,
      imagePreview: preview,
      existingImageUrl: null,
      imageDeleted: true,
    }));
  }

  function handleRemoveImage(e: React.MouseEvent) {
    e.stopPropagation();
    setForm((p) => ({
      ...p,
      imageFile: null,
      imagePreview: null,
      existingImageUrl: null,
      imageDeleted: true,
    }));
    if (fileRef.current) fileRef.current.value = '';
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.nombre_producto.trim())
      errs.nombre_producto = 'El nombre es obligatorio.';
    const p = parseFloat(form.precio);
    if (!form.precio || isNaN(p) || p <= 0)
      errs.precio = 'El precio debe ser mayor a 0.';
    if (!form.categoriaId) errs.categoriaId = 'Seleccioná una categoría.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function toBase64(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res((reader.result as string).split(',')[1] ?? '');
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
  }

  async function handleSave() {
    if (!validate()) return;
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setGeneralError(null);
    try {
      const payload = {
        nombre_producto: form.nombre_producto.trim(),
        descripcion: form.descripcion.trim(),
        precio: parseFloat(form.precio),
        stock: parseInt(form.stock, 10) || 0,
        es_perecedero: form.es_perecedero,
        fk_categoria: form.categoriaId,
        fk_unidad: form.unidadId,
        estado: true,
      };

      let saved: Producto;
      if (isEditing && producto) {
        const { data } = await api.patch<ApiResponse<Producto>>(
          `/productos/${producto.id_producto}/`,
          payload,
        );
        saved = data.data;
      } else {
        const { data } = await api.post<ApiResponse<Producto>>(
          '/productos/',
          payload,
        );
        saved = data.data;
      }

      if (isEditing && producto && form.imageDeleted) {
        try {
          const { data: detailRes } = await api.get<ApiResponse<Producto>>(
            `/productos/${producto.id_producto}/`,
          );
          const detailProducto = detailRes.data;
          if (detailProducto.imagenes && detailProducto.imagenes.length > 0) {
            await Promise.all(
              detailProducto.imagenes.map((img) =>
                api
                  .delete(
                    `/productos/${producto.id_producto}/imagen/${img.id_imagen}/`,
                  )
                  .catch(console.error),
              ),
            );
          }
        } catch (e) {
          console.error('Error fetching product details to delete images', e);
        }
      }

      if (form.imageFile) {
        const base64 = await toBase64(form.imageFile);
        await api.post(`/productos/${saved.id_producto}/imagen/`, {
          imagen_base64: base64,
          es_principal: true,
        });
      }

      await qc.invalidateQueries({ queryKey: ['farmer-productos'] });
      onSaved();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al guardar el producto.';
      setGeneralError(msg);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const displayImage = form.imagePreview ?? form.existingImageUrl;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
      }}
    >
      <div
        style={{
          background: surface,
          borderRadius: 16,
          width: '100%',
          maxWidth: 520,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: brand,
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 18,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            ✕
          </button>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </span>
        </div>

        {/* Body */}
        <div
          style={{
            overflowY: 'auto',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {generalError && (
            <div
              style={{
                background: 'rgba(222,57,58,0.08)',
                border: '1px solid rgba(222,57,58,0.2)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 14,
                color: coral,
              }}
            >
              {generalError}
            </div>
          )}

          {/* Imagen */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: fg,
                alignSelf: 'flex-start',
              }}
            >
              Foto del producto
            </label>
            <div style={{ position: 'relative', marginTop: 4 }}>
              <div
                onClick={() => fileRef.current?.click()}
                title="Haz clic para subir o cambiar imagen"
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 16,
                  border: displayImage ? 'none' : `2px dashed ${border}`,
                  background: displayImage ? 'transparent' : accentBg,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                {displayImage ? (
                  <img
                    src={displayImage}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    alt="producto"
                  />
                ) : (
                  <span style={{ fontSize: 36 }}>📷</span>
                )}
              </div>
              {displayImage && (
                <button
                  onClick={handleRemoveImage}
                  title="Eliminar imagen"
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: coral,
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 14,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            {!displayImage && (
              <span style={{ fontSize: 13, color: muted }}>
                Haz clic para subir una imagen
              </span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {/* Nombre */}
          <Field label="Nombre del producto *" error={errors.nombre_producto}>
            <input
              style={inputStyle(!!errors.nombre_producto, colors)}
              value={form.nombre_producto}
              onChange={(e) => set('nombre_producto', e.target.value)}
              placeholder="Ej. Tomates frescos"
            />
          </Field>

          {/* Descripción */}
          <Field label="Descripción">
            <textarea
              style={{
                ...inputStyle(false, colors),
                minHeight: 72,
                resize: 'vertical',
              }}
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              placeholder="Detalles sobre tu producto..."
            />
          </Field>

          {/* Precio y Stock en fila */}
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
          >
            <Field label="Precio *" error={errors.precio}>
              <input
                style={inputStyle(!!errors.precio, colors)}
                value={form.precio}
                onChange={(e) =>
                  set('precio', e.target.value.replace(/[^.0-9]/g, ''))
                }
                placeholder="0.00"
                inputMode="decimal"
              />
            </Field>
            <Field label="Stock">
              <input
                style={inputStyle(false, colors)}
                value={form.stock}
                onChange={(e) =>
                  set('stock', e.target.value.replace(/[^0-9]/g, ''))
                }
                placeholder="0"
                inputMode="numeric"
              />
            </Field>
          </div>

          {/* Perecedero */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              padding: '10px 14px',
              border: `1px solid ${border}`,
              borderRadius: 8,
              background: surface,
            }}
          >
            <input
              type="checkbox"
              checked={form.es_perecedero}
              onChange={(e) => set('es_perecedero', e.target.checked)}
              style={{ width: 16, height: 16, accentColor: brand }}
            />
            <span style={{ fontSize: 15, color: fg }}>Producto perecedero</span>
          </label>

          {/* Categoría y Unidad en fila */}
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
          >
            <Field label="Categoría *" error={errors.categoriaId}>
              <select
                style={inputStyle(!!errors.categoriaId, colors)}
                value={form.categoriaId ?? ''}
                onChange={(e) =>
                  set(
                    'categoriaId',
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">Seleccioná una categoría</option>
                {categories.map((c) => (
                  <option key={c.id_categoria} value={c.id_categoria}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Unidad de medida">
              <select
                style={inputStyle(false, colors)}
                value={form.unidadId ?? ''}
                onChange={(e) =>
                  set(
                    'unidadId',
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">Seleccioná una unidad</option>
                {unidades.map((u) => (
                  <option key={u.id_unidad} value={u.id_unidad}>
                    {u.tipo}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: `1px solid ${border}`,
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
          }}
        >
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving
              ? 'Guardando…'
              : isEditing
                ? 'Guardar cambios'
                : 'Crear producto'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  const { fg, coral } = useAppColors();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: fg }}>
        {label}
      </label>
      {children}
      {error && <span style={{ fontSize: 12, color: coral }}>{error}</span>}
    </div>
  );
}

function inputStyle(
  hasError: boolean,
  colors: ReturnType<typeof useAppColors>,
): React.CSSProperties {
  return {
    width: '100%',
    border: `1.5px solid ${hasError ? colors.coral : colors.inputBorder}`,
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 15,
    fontFamily: 'inherit',
    background: colors.surface,
    color: colors.fg,
    outline: 'none',
    boxSizing: 'border-box',
  };
}

// ── Delete confirm ─────────────────────────────────────────

function DeleteConfirm({
  producto,
  onClose,
  onDeleted,
}: {
  producto: Producto;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const qc = useQueryClient();
  const { fg, muted, surface, coral, border, inputBorder } = useAppColors();
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/productos/${producto.id_producto}/`);
      await qc.invalidateQueries({ queryKey: ['farmer-productos'] });
      onDeleted();
    } catch {
      setError('No se pudo eliminar. Intentá de nuevo.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: surface,
          borderRadius: 20,
          width: '90%',
          maxWidth: 440,
          padding: 28,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          border: `1px solid ${border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{ fontSize: 18, fontWeight: 700, color: fg, marginBottom: 8 }}
        >
          ¿Eliminar producto?
        </h3>
        <p style={{ fontSize: 14, color: muted, marginBottom: 20 }}>
          Se eliminará "{producto.nombre_producto}". Esta acción no se puede
          deshacer.
        </p>
        {error && (
          <p style={{ fontSize: 13, color: coral, marginBottom: 16 }}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 8,
              border: `1.5px solid ${inputBorder}`,
              background: 'transparent',
              color: fg,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              opacity: loading ? 0.5 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 8,
              border: `1.5px solid ${coral}`,
              background: 'transparent',
              color: coral,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
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
  const qc = useQueryClient();
  const colors = useAppColors();
  const { brand, coral, muted, border, surface, bg, fg, accentBg } = colors;
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [formTarget, setFormTarget] = useState<Producto | null | 'new'>(null);
  const [deleteTarget, setDeleteTarget] = useState<Producto | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Category[]>>('/categorias/');
      return data.data;
    },
    staleTime: 60_000,
  });

  const { data: unidades = [] } = useQuery<Unidad[]>({
    queryKey: ['unidades'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Unidad[]>>('/unidades/');
      return data.data;
    },
    staleTime: 60_000,
  });

  const {
    data: products = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Producto[]>({
    queryKey: ['farmer-productos', search, selectedCat],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('nombre', search);
      if (selectedCat) params.set('categoria', String(selectedCat));
      const qs = params.toString();
      const { data } = await api.get<ApiResponse<{ results: Producto[] }>>(
        `/productos/${qs ? `?${qs}` : ''}`,
      );
      return data.data.results;
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 28,
            right: 28,
            zIndex: 100,
            background: brand,
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 14,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <input
          type="search"
          placeholder="🔍  Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 400,
            height: 44,
            border: `1.5px solid ${border}`,
            borderRadius: 10,
            padding: '0 14px',
            fontSize: 15,
            fontFamily: 'inherit',
            background: surface,
            color: fg,
            outline: 'none',
          }}
        />

        {categories.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    border: `1px solid ${isActive ? brand : border}`,
                    background: isActive ? brand : surface,
                    color: isActive ? '#fff' : fg,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
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
        <div style={{ textAlign: 'center', padding: 48, color: muted }}>
          Cargando productos…
        </div>
      ) : isError ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: coral, marginBottom: 12 }}>
            Error al cargar productos
          </p>
          <Button variant="secondary" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      ) : products.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 64,
            background: surface,
            borderRadius: 16,
            border: `1px solid ${border}`,
          }}
        >
          <p style={{ fontSize: 40, marginBottom: 12 }}>📦</p>
          <p
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: fg,
              marginBottom: 6,
            }}
          >
            No hay productos
          </p>
          <p style={{ fontSize: 14, color: muted }}>
            Agregá un producto para comenzar a vender.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div
            className="hidden md:block"
            style={{
              background: surface,
              borderRadius: 16,
              border: `1px solid ${border}`,
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                      style={{
                        padding: '14px 18px',
                        textAlign: 'left',
                        fontSize: 13,
                        fontWeight: 600,
                        color: muted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
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
                    <td style={{ padding: '16px 18px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                        }}
                      >
                        <div
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: 12,
                            overflow: 'hidden',
                            background: accentBg,
                            flexShrink: 0,
                            display: 'grid',
                            placeItems: 'center',
                          }}
                        >
                          {mediaUrl(p.imagen_principal ?? p.imagen) ? (
                            <img
                              src={mediaUrl(p.imagen_principal ?? p.imagen)!}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                              alt={p.nombre_producto}
                            />
                          ) : (
                            <span style={{ fontSize: 20 }}>🌿</span>
                          )}
                        </div>
                        <div>
                          <div
                            style={{ fontSize: 16, fontWeight: 600, color: fg }}
                          >
                            {p.nombre_producto}
                          </div>
                          {p.es_perecedero && (
                            <span
                              style={{
                                fontSize: 12,
                                color: '#F2A900',
                                fontWeight: 600,
                              }}
                            >
                              Perecedero
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '16px 18px',
                        fontSize: 15,
                        fontWeight: 700,
                        color: brand,
                      }}
                    >
                      ${p.precio}
                    </td>
                    <td
                      style={{ padding: '16px 18px', fontSize: 15, color: fg }}
                    >
                      {p.stock}
                    </td>
                    <td
                      style={{ padding: '16px 18px', fontSize: 15, color: fg }}
                    >
                      {categoryName(p.categoria, categories)}
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <Badge variant={p.estado ? 'success' : 'default'}>
                        {p.estado ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
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
                style={{
                  background: surface,
                  borderRadius: 14,
                  border: `1px solid ${border}`,
                  padding: 16,
                  display: 'flex',
                  gap: 14,
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: accentBg,
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {mediaUrl(p.imagen_principal ?? p.imagen) ? (
                    <img
                      src={mediaUrl(p.imagen_principal ?? p.imagen)!}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      alt={p.nombre_producto}
                    />
                  ) : (
                    <span style={{ fontSize: 24 }}>🌿</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: fg, fontSize: 16 }}>
                    {p.nombre_producto}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      alignItems: 'center',
                      marginBottom: 2,
                    }}
                  >
                    <p style={{ fontSize: 14, color: muted }}>
                      {categoryName(p.categoria, categories)}
                    </p>
                    <Badge
                      variant={p.estado ? 'success' : 'default'}
                      className="!px-2 !py-0.5 !text-xs"
                    >
                      {p.estado ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: brand }}>
                    ${p.precio}{' '}
                    <span style={{ fontSize: 14, fontWeight: 400, color: fg }}>
                      · Stock: {p.stock}
                    </span>
                  </p>
                </div>
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                >
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
          producto={undefined}
          categories={categories}
          unidades={unidades}
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

// ── FarmerOrders ───────────────────────────────────────────

export function FarmerOrders() {
  const { surface, border, fg, muted } = useAppColors();
  return (
    <div>
      <PageHeader title="Pedidos" />
      <div
        style={{
          background: surface,
          borderRadius: 16,
          border: `1px solid ${border}`,
          padding: 48,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 40, marginBottom: 12 }}>📦</p>
        <p
          style={{ fontSize: 18, fontWeight: 700, color: fg, marginBottom: 6 }}
        >
          No hay pedidos
        </p>
        <p style={{ fontSize: 14, color: muted }}>
          Para el futuro equipo que le toque esta parte
        </p>
      </div>
    </div>
  );
}
