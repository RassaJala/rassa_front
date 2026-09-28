import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ProductThumbnail } from '../components/ui/ProductThumbnail';
import { Toast } from '../components/ui/Toast';
import type { ToastState } from '../components/ui/Toast';
import { getStatusBadge } from '../components/PublicationActions';
import type { PublicacionEstado } from '../services/publications';

import { useAppColors } from '../hooks/useAppColors';
import { btnStyle as sharedBtnStyle } from '@/constants/styles';
import api from '../services/api';
import type { ApiResponse } from '../types';
import { mediaUrl } from '../utils/mediaUrl';
import { parseApiError } from '~/utils/apiErrors';

interface AdminCategoria {
  id_categoria: number;
  nombre: string;
  descripcion?: string;
}

interface AdminUnidad {
  id_unidad: number;
  nombre: string;
  tipo: string;
  abreviatura: string;
}

interface AdminProduct {
  id_producto: number;
  nombre_producto: string;
  descripcion: string;
  precio: string;
  stock: number;
  es_perecedero: boolean;
  imagen: string | null;
  imagen_principal: string | null;
  categoria: AdminCategoria | null;
  unidad: AdminUnidad | null;
}

interface AdminPublicacionProducto {
  id_producto_semanal: number;
  fk_producto: number;
  fk_unidad: number;
  producto_nombre: string;
  unidad_abreviatura: string;
  stock: number;
  precio: string;
  foto: string | null;
  estado: string;
}

interface AdminPublicacion {
  id_publicacion: number;
  fk_agricultor: number;
  agricultor_nombre?: string;
  fecha_publicacion: string;
  semana: number;
  estado: string;
  productos?: AdminPublicacionProducto[];
}

interface PubRow extends AdminPublicacionProducto {
  pubId: number;
  agricultor_nombre: string;
  pubEstado: string;
}

const EMPTY_BUNDLE = {
  productos: [] as AdminProduct[],
  publicaciones: [] as AdminPublicacion[],
};

export function AdminProducts() {
  const colors = useAppColors();
  const { isDark, fg, muted, border, surface, bg, brand, coral } = colors;
  const qc = useQueryClient();

  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    nombre_producto: '',
    descripcion: '',
    precio: '',
    stock: '',
    es_perecedero: false,
    categoriaId: null as number | null,
    unidadId: null as number | null,
  });
  const [search, setSearch] = useState('');
  const [delTarget, setDelTarget] = useState<AdminProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
  }

  const { data: bundle = EMPTY_BUNDLE, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-productos-data'],
    queryFn: async () => {
      const [prodRes, pubRes] = await Promise.all([
        api.get<ApiResponse<{ results: AdminProduct[] }>>('/productos/?page_size=200'),
        api.get<ApiResponse<{ results: AdminPublicacion[] }>>('/publicaciones/?page_size=200'),
      ]);
      return {
        productos: prodRes.data.data.results ?? [],
        publicaciones: pubRes.data.data.results ?? [],
      };
    },
  });

  const { data: categorias = [] } = useQuery<AdminCategoria[]>({
    queryKey: ['admin-categorias'],
    queryFn: async () => {
      const { data } = await api.get<
        ApiResponse<{ results: AdminCategoria[] }>
      >('/categorias/');
      return data.data.results ?? [];
    },
    staleTime: 60_000,
  });

  const { data: unidades = [] } = useQuery<AdminUnidad[]>({
    queryKey: ['admin-unidades'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<{ results: AdminUnidad[] }>>(
        '/unidades/',
      );
      return data.data.results ?? [];
    },
    staleTime: 60_000,
  });

  const productos = bundle.productos;
  const publicaciones = bundle.publicaciones;

  const pubRows = useMemo<PubRow[]>(
    () =>
      publicaciones.flatMap((p) =>
        (p.productos ?? []).map((prod) => ({
          ...prod,
          pubId: p.id_publicacion,
          agricultor_nombre: p.agricultor_nombre ?? '',
          pubEstado: p.estado,
        })),
      ),
    [publicaciones],
  );

  const filtered = useMemo(
    () =>
      productos.filter((i) =>
        i.nombre_producto.toLowerCase().includes(search.toLowerCase()),
      ),
    [productos, search],
  );

  function categoriaLabel(item: AdminProduct): string {
    const c = item.categoria;
    return c && typeof c === 'object' ? c.nombre : '';
  }

  function unidadAbrev(item: AdminProduct): string {
    const u = item.unidad;
    return u && typeof u === 'object' ? u.abreviatura || u.nombre : '';
  }

  function startNew() {
    setEditId(null);
    setForm({
      nombre_producto: '',
      descripcion: '',
      precio: '',
      stock: '',
      es_perecedero: false,
      categoriaId: null,
      unidadId: null,
    });
    setTab('form');
  }

  function startEdit(item: AdminProduct) {
    setEditId(item.id_producto);
    setForm({
      nombre_producto: item.nombre_producto,
      descripcion: item.descripcion,
      precio: String(item.precio),
      stock: String(item.stock),
      es_perecedero: !!item.es_perecedero,
      categoriaId:
        item.categoria && typeof item.categoria === 'object'
          ? item.categoria.id_categoria
          : null,
      unidadId:
        item.unidad && typeof item.unidad === 'object'
          ? item.unidad.id_unidad
          : null,
    });
    setTab('form');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre_producto.trim() || !form.categoriaId) {
      showToast('Completá nombre y categoría.', 'error');
      return;
    }
    const precio = Number(form.precio);
    const stock = Number(form.stock);
    if (isNaN(precio) || isNaN(stock)) {
      showToast('Precio y stock deben ser números.', 'error');
      return;
    }
    const payload = {
      nombre_producto: form.nombre_producto.trim(),
      descripcion: form.descripcion.trim(),
      precio,
      stock,
      es_perecedero: form.es_perecedero,
      fk_categoria: form.categoriaId,
      fk_unidad: form.unidadId ?? null,
    };
    setSaving(true);
    try {
      if (editId) await api.patch(`/productos/${editId}/`, payload);
      else await api.post('/productos/', payload);
      await qc.invalidateQueries({ queryKey: ['admin-productos-data'] });
      setTab('list');
      showToast(editId ? 'Producto actualizado.' : 'Producto creado.', 'success');
    } catch (err) {
      showToast(parseApiError(err, 'No se pudo guardar el producto.'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!delTarget) return;
    setSaving(true);
    try {
      await api.delete(`/productos/${delTarget.id_producto}/`);
      await qc.invalidateQueries({ queryKey: ['admin-productos-data'] });
      setDelTarget(null);
      showToast('Producto eliminado.', 'success');
    } catch (err) {
      showToast(parseApiError(err, 'No se pudo eliminar el producto.'), 'error');
    } finally {
      setSaving(false);
    }
  }

  const btnStyle = sharedBtnStyle;

  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: muted }}>
        Cargando productos…
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ color: muted, marginBottom: 12 }}>
          Error al cargar productos.
        </p>
        <button
          onClick={() => refetch()}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: brand,
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <Toast toast={toast} onDone={() => setToast(null)} />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: fg,
          }}
        >
          Gestión de productos
        </h2>
        <button
          onClick={startNew}
          style={{ ...btnStyle, background: coral, color: '#fff' }}
        >
          ＋ Nuevo producto
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 2,
          background: border,
          borderRadius: 12,
          padding: 3,
          marginBottom: 20,
          width: 'fit-content',
        }}
      >
        {['list', 'form'].map((t) => (
          <button
            key={t}
            onClick={() => (t === 'form' ? startNew() : setTab('list'))}
            style={{
              padding: '8px 20px',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              background: tab === t ? surface : 'transparent',
              color: tab === t ? fg : muted,
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {t === 'list' ? '📋 Lista de productos' : '➕ Agregar producto'}
          </button>
        ))}
      </div>

      {/* TAB: List */}
      {tab === 'list' && (
        <>
          {/* Catálogo */}
          <div
            style={{
              background: surface,
              borderRadius: 16,
              border: `1px solid ${border}`,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: `1px solid ${border}`,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: fg }}>
                {productos.length} productos en el catálogo
              </span>
              <input
                type="search"
                placeholder="Buscar producto…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  height: 36,
                  border: `1.5px solid ${border}`,
                  borderRadius: 8,
                  padding: '0 12px',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  width: 220,
                  background: bg,
                  color: fg,
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {[
                      'Producto',
                      'Categoría',
                      'Precio',
                      'Stock',
                      'Estado',
                      'Acciones',
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          fontSize: 11,
                          color: muted,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          fontWeight: 600,
                          padding: '12px 20px',
                          background: bg,
                          borderBottom: `1px solid ${border}`,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          textAlign: 'center',
                          padding: '48px 24px',
                          color: muted,
                          fontSize: 14,
                        }}
                      >
                        No hay productos
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => {
                      const catName = categoriaLabel(item);
                      const catBg = isDark ? '#1E2A24' : '#EEF2EF';
                      const catColor = isDark ? '#8FB8A0' : '#4A5A7A';
                      return (
                        <tr key={item.id_producto}>
                          <td
                            style={{
                              padding: '14px 20px',
                              fontSize: 14,
                              borderBottom: `1px solid ${border}`,
                              fontWeight: 600,
                              color: fg,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                              }}
                            >
                              <ProductThumbnail
                                src={mediaUrl(
                                  item.imagen_principal ?? item.imagen,
                                )}
                                alt={item.nombre_producto}
                                size={40}
                              />
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <span>{item.nombre_producto}</span>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    width: 'fit-content',
                                    background: isDark ? '#25313A' : '#E8EEF4',
                                    color: muted,
                                  }}
                                >
                                  Catálogo
                                </span>
                              </div>
                            </div>
                          </td>
                          <td
                            style={{
                              padding: '14px 20px',
                              borderBottom: `1px solid ${border}`,
                            }}
                          >
                            {catName ? (
                              <span
                                style={{
                                  fontSize: 12,
                                  padding: '3px 10px',
                                  borderRadius: 6,
                                  fontWeight: 600,
                                  background: catBg,
                                  color: catColor,
                                }}
                              >
                                {catName}
                              </span>
                            ) : (
                              <span style={{ color: muted, fontSize: 13 }}>
                                — 
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: '14px 20px',
                              fontSize: 14,
                              borderBottom: `1px solid ${border}`,
                              color: fg,
                            }}
                          >
                            ${item.precio} / {unidadAbrev(item) || '—'}
                          </td>
                          <td
                            style={{
                              padding: '14px 20px',
                              fontSize: 14,
                              borderBottom: `1px solid ${border}`,
                              color: muted,
                            }}
                          >
                            {item.stock} {unidadAbrev(item) || '—'}
                          </td>
                          <td
                            style={{
                              padding: '14px 20px',
                              borderBottom: `1px solid ${border}`,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                padding: '3px 10px',
                                borderRadius: 6,
                                background: item.es_perecedero
                                  ? isDark
                                    ? 'rgba(212,160,32,0.12)'
                                    : 'rgba(242,169,0,0.1)'
                                  : isDark
                                    ? 'rgba(74,138,99,0.15)'
                                    : 'rgba(36,86,60,0.07)',
                                color: item.es_perecedero
                                  ? '#F2A900'
                                  : brand,
                              }}
                            >
                              {item.es_perecedero
                                ? 'Perecedero'
                                : 'No perecedero'}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: '14px 20px',
                              borderBottom: `1px solid ${border}`,
                            }}
                          >
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                onClick={() => startEdit(item)}
                                aria-label="Editar"
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8,
                                  border: `1px solid ${border}`,
                                  background: surface,
                                  cursor: 'pointer',
                                  fontSize: 14,
                                  display: 'grid',
                                  placeItems: 'center',
                                  color: fg,
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => setDelTarget(item)}
                                aria-label="Eliminar"
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8,
                                  border: `1px solid ${border}`,
                                  background: surface,
                                  cursor: 'pointer',
                                  fontSize: 14,
                                  display: 'grid',
                                  placeItems: 'center',
                                  color: fg,
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Publicaciones (read-only) */}
          <div
            style={{
              background: surface,
              borderRadius: 16,
              border: `1px solid ${border}`,
              overflow: 'hidden',
              marginTop: 20,
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${border}`,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: fg }}>
                🔒 Publicaciones de agricultores ({pubRows.length})
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {[
                      'Agricultor',
                      'Producto',
                      'Unidad',
                      'Precio',
                      'Stock',
                      'Estado publicación',
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          fontSize: 11,
                          color: muted,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          fontWeight: 600,
                          padding: '12px 20px',
                          background: bg,
                          borderBottom: `1px solid ${border}`,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pubRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          textAlign: 'center',
                          padding: '48px 24px',
                          color: muted,
                          fontSize: 14,
                        }}
                      >
                        No hay publicaciones
                      </td>
                    </tr>
                  ) : (
                    pubRows.map((row) => {
                      const badge = getStatusBadge(row.pubEstado as PublicacionEstado);
                      return (
                        <tr key={`${row.pubId}-${row.id_producto_semanal}`}>
                          <td
                            style={{
                              padding: '14px 20px',
                              borderBottom: `1px solid ${border}`,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                padding: '3px 10px',
                                borderRadius: 6,
                                fontWeight: 600,
                                background: isDark ? '#25313A' : '#E8EEF4',
                                color: fg,
                              }}
                            >
                              {row.agricultor_nombre}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: '14px 20px',
                              fontSize: 14,
                              borderBottom: `1px solid ${border}`,
                              fontWeight: 600,
                              color: fg,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                              }}
                            >
                              <ProductThumbnail
                                src={mediaUrl(row.foto)}
                                alt={row.producto_nombre}
                                size={40}
                              />
                              <span>{row.producto_nombre}</span>
                            </div>
                          </td>
                          <td
                            style={{
                              padding: '14px 20px',
                              fontSize: 14,
                              borderBottom: `1px solid ${border}`,
                              color: muted,
                            }}
                          >
                            {row.unidad_abreviatura || '—'}
                          </td>
                          <td
                            style={{
                              padding: '14px 20px',
                              fontSize: 14,
                              borderBottom: `1px solid ${border}`,
                              color: fg,
                            }}
                          >
                            ${row.precio}
                          </td>
                          <td
                            style={{
                              padding: '14px 20px',
                              fontSize: 14,
                              borderBottom: `1px solid ${border}`,
                              color: muted,
                            }}
                          >
                            {row.stock}
                          </td>
                          <td
                            style={{
                              padding: '14px 20px',
                              borderBottom: `1px solid ${border}`,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                padding: '3px 10px',
                                borderRadius: 6,
                                background: isDark
                                  ? badge.variant === 'success'
                                    ? 'rgba(74,138,99,0.15)'
                                    : badge.variant === 'warning'
                                      ? 'rgba(212,160,32,0.12)'
                                      : 'rgba(222,57,58,0.12)'
                                  : badge.variant === 'success'
                                    ? 'rgba(36,86,60,0.07)'
                                    : badge.variant === 'warning'
                                      ? 'rgba(242,169,0,0.1)'
                                      : 'rgba(222,57,58,0.08)',
                                color: badge.variant === 'success'
                                  ? brand
                                  : badge.variant === 'warning'
                                    ? '#F2A900'
                                    : coral,
                              }}
                            >
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB: Form */}
      {tab === 'form' && (
        <div
          style={{
            background: surface,
            borderRadius: 16,
            border: `1px solid ${border}`,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${border}`,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 600, color: fg }}>
              {editId ? 'Editar producto' : 'Nuevo producto'}
            </span>
          </div>
          <form
            onSubmit={handleSave}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 18,
              padding: 24,
            }}
          >
            <div
              className="full"
              style={{
                gridColumn: '1 / -1',
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: muted,
                }}
              >
                Nombre del producto
              </label>
              <input
                type="text"
                value={form.nombre_producto}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    nombre_producto: e.target.value,
                  }))
                }
                placeholder="ej. Aguacate Hass"
                required
                style={inputStyle(
                  bg,
                  border,
                  brand,
                  fg,
                  focusedField === 'nombre_producto',
                )}
                onFocus={() => setFocusedField('nombre_producto')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: muted,
                }}
              >
                Categoría
              </label>
              <select
                value={form.categoriaId ?? ''}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    categoriaId: e.target.value
                      ? Number(e.target.value)
                      : null,
                  }))
                }
                required
                style={{
                  ...inputStyle(
                    bg,
                    border,
                    brand,
                    fg,
                    focusedField === 'categoriaId',
                  ),
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                  paddingRight: 36,
                }}
              >
                <option value="">Seleccionar…</option>
                {categorias.map((c) => (
                  <option key={c.id_categoria} value={c.id_categoria}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: muted,
                }}
              >
                Unidad de venta
              </label>
              <select
                value={form.unidadId ?? ''}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    unidadId: e.target.value
                      ? Number(e.target.value)
                      : null,
                  }))
                }
                style={{
                  ...inputStyle(
                    bg,
                    border,
                    brand,
                    fg,
                    focusedField === 'unidadId',
                  ),
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                  paddingRight: 36,
                }}
              >
                <option value="">Sin unidad</option>
                {unidades.map((u) => (
                  <option key={u.id_unidad} value={u.id_unidad}>
                    {u.nombre} ({u.abreviatura})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: muted,
                }}
              >
                Precio
              </label>
              <input
                type="number"
                value={form.precio}
                onChange={(e) =>
                  setForm((p) => ({ ...p, precio: e.target.value }))
                }
                placeholder="0"
                min="0"
                step="0.01"
                required
                style={inputStyle(
                  bg,
                  border,
                  brand,
                  fg,
                  focusedField === 'precio',
                )}
                onFocus={() => setFocusedField('precio')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: muted,
                }}
              >
                Stock disponible
              </label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) =>
                  setForm((p) => ({ ...p, stock: e.target.value }))
                }
                placeholder="0"
                min="0"
                required
                style={inputStyle(
                  bg,
                  border,
                  brand,
                  fg,
                  focusedField === 'stock',
                )}
                onFocus={() => setFocusedField('stock')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 6,
              }}
            >
              <input
                id="es_perecedero"
                type="checkbox"
                checked={form.es_perecedero}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    es_perecedero: e.target.checked,
                  }))
                }
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: coral }}
              />
              <label
                htmlFor="es_perecedero"
                style={{ fontSize: 14, fontWeight: 500, color: fg, cursor: 'pointer' }}
              >
                Producto perecedero
              </label>
            </div>
            <div
              className="full"
              style={{
                gridColumn: '1 / -1',
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: muted,
                }}
              >
                Descripción
              </label>
              <textarea
                value={form.descripcion}
                onChange={(e) =>
                  setForm((p) => ({ ...p, descripcion: e.target.value }))
                }
                placeholder="Describe el producto, origen, cualidades…"
                style={{
                  ...inputStyle(
                    bg,
                    border,
                    brand,
                    fg,
                    focusedField === 'descripcion',
                  ),
                  height: 90,
                  padding: '12px 14px',
                  resize: 'vertical',
                }}
                onFocus={() => setFocusedField('descripcion')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  ...btnStyle,
                  background: coral,
                  color: '#fff',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                💾 Guardar producto
              </button>
              <button
                type="button"
                onClick={() => setTab('list')}
                style={{
                  ...btnStyle,
                  background: 'transparent',
                  border: `1.5px solid ${border}`,
                  color: fg,
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete modal */}
      {delTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setDelTarget(null)}
        >
          <div
            style={{
              background: surface,
              borderRadius: 20,
              padding: 28,
              maxWidth: 440,
              width: '90%',
              border: `1px solid ${border}`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: fg,
                marginBottom: 8,
              }}
            >
              ¿Eliminar producto?
            </h3>
            <p style={{ fontSize: 14, color: muted, marginBottom: 20 }}>
              Vas a eliminar "{delTarget.nombre_producto}". Esta acción no se
              puede deshacer.
            </p>
            <div
              style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}
            >
              <button
                onClick={() => setDelTarget(null)}
                disabled={saving}
                style={{
                  height: 32,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: `1.5px solid ${border}`,
                  background: 'transparent',
                  color: fg,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                style={{
                  height: 32,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1.5px solid #DE393A',
                  background: 'transparent',
                  color: '#DE393A',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {saving ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function inputStyle(
  bg: string,
  border: string,
  brand: string,
  fg: string,
  focused?: boolean,
): React.CSSProperties {
  return {
    width: '100%',
    height: 44,
    border: `1.5px solid ${focused ? brand : border}`,
    borderRadius: 10,
    padding: '0 14px',
    fontSize: 15,
    fontFamily: 'inherit',
    background: bg,
    color: fg,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };
}