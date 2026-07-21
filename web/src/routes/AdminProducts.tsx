import { useMemo, useRef, useState } from 'react';
import { useAppColors } from '../hooks/useAppColors';

interface Product {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  stock: number;
  unidad: string;
  descripcion: string;
  estado: boolean;
}

const initialData: Product[] = [
  {
    id: 1,
    nombre: 'Aguacate Hass',
    categoria: 'Fruta',
    precio: 45,
    stock: 120,
    unidad: 'kg',
    descripcion: 'Aguacate Hass premium de Antioquia.',
    estado: true,
  },
  {
    id: 2,
    nombre: 'Tomate orgánico',
    categoria: 'Verdura',
    precio: 32,
    stock: 85,
    unidad: 'kg',
    descripcion: 'Tomate chonto sin pesticidas.',
    estado: true,
  },
  {
    id: 3,
    nombre: 'Café especial',
    categoria: 'Grano',
    precio: 180,
    stock: 28,
    unidad: 'kg',
    descripcion: 'Café de altura, tostado medio.',
    estado: true,
  },
  {
    id: 4,
    nombre: 'Cebolla larga',
    categoria: 'Verdura',
    precio: 18,
    stock: 200,
    unidad: 'kg',
    descripcion: 'Cebolla larga fresca de la sabana.',
    estado: true,
  },
  {
    id: 5,
    nombre: 'Maíz criollo',
    categoria: 'Grano',
    precio: 25,
    stock: 150,
    unidad: 'kg',
    descripcion: 'Maíz amarillo para arepas.',
    estado: true,
  },
  {
    id: 6,
    nombre: 'Lechuga romana',
    categoria: 'Verdura',
    precio: 15,
    stock: 60,
    unidad: 'unidad',
    descripcion: 'Lechuga romana hidropónica.',
    estado: false,
  },
];

const catEmoji: Record<string, string> = {
  Fruta: '🥑',
  Verdura: '🥬',
  Grano: '🌾',
  Otro: '📦',
};
const catClass: Record<string, { bg: string; color: string }> = {
  Verdura: { bg: '#D9F0E0', color: '#3A7D5A' },
  Fruta: { bg: '#F5E6C8', color: '#C48A20' },
  Grano: { bg: '#E8E0C8', color: '#8A7A40' },
  Otro: { bg: '#D0D8E8', color: '#4A5A7A' },
};
const unitLabels: Record<string, string> = {
  kg: 'kg',
  unidad: 'unid.',
  lb: 'lb',
  arroba: '@',
};

export function AdminProducts() {
  const colors = useAppColors();
  const { fg, muted, border, surface, bg, brand, coral } = colors;

  const [items, setItems] = useState<Product[]>(initialData);
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    nombre: '',
    categoria: '',
    precio: '',
    stock: '',
    unidad: 'kg',
    descripcion: '',
  });
  const [search, setSearch] = useState('');
  const [delTarget, setDelTarget] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const nextId = useRef(7);

  const filtered = useMemo(
    () =>
      items.filter((i) =>
        i.nombre.toLowerCase().includes(search.toLowerCase()),
      ),
    [items, search],
  );

  function startNew() {
    setEditId(null);
    setForm({
      nombre: '',
      categoria: '',
      precio: '',
      stock: '',
      unidad: 'kg',
      descripcion: '',
    });
    setTab('form');
  }

  function startEdit(item: Product) {
    setEditId(item.id);
    setForm({
      nombre: item.nombre,
      categoria: item.categoria,
      precio: String(item.precio),
      stock: String(item.stock),
      unidad: item.unidad,
      descripcion: item.descripcion,
    });
    setTab('form');
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.categoria || !form.precio) return;
    const precio = Number(form.precio);
    const stock = Number(form.stock);
    if (isNaN(precio) || isNaN(stock)) return;
    setSaving(true);
    if (editId) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === editId
            ? {
                ...i,
                nombre: form.nombre.trim(),
                categoria: form.categoria,
                precio,
                stock,
                unidad: form.unidad,
                descripcion: form.descripcion.trim(),
              }
            : i,
        ),
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: nextId.current++,
          nombre: form.nombre.trim(),
          categoria: form.categoria,
          precio,
          stock,
          unidad: form.unidad,
          descripcion: form.descripcion.trim(),
          estado: true,
        },
      ]);
    }
    setTab('list');
    setSaving(false);
  }

  function toggleStatus(item: Product) {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, estado: !i.estado } : i)),
    );
  }

  function handleDelete() {
    if (!delTarget) return;
    setItems((prev) => prev.filter((i) => i.id !== delTarget.id));
    setDelTarget(null);
  }

  const btnStyle = {
    height: 40,
    padding: '0 18px',
    borderRadius: 10,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    letterSpacing: '0.01em',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  } as const;

  return (
    <div>
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
              {items.length} productos
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
                    const catBg = isDark
                      ? '#1C2D22'
                      : (catClass[item.categoria]?.bg ?? '#D0D8E8');
                    const catColor = isDark
                      ? '#4A8A63'
                      : (catClass[item.categoria]?.color ?? '#4A5A7A');
                    return (
                      <tr key={item.id}>
                        <td
                          style={{
                            padding: '14px 20px',
                            fontSize: 14,
                            borderBottom: `1px solid ${border}`,
                            fontWeight: 600,
                            color: fg,
                          }}
                        >
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <span>
                              {catEmoji[item.categoria] ?? '📦'} {item.nombre}
                            </span>
                          </span>
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
                              padding: '3px 10px',
                              borderRadius: 6,
                              fontWeight: 600,
                              background: catBg,
                              color: catColor,
                            }}
                          >
                            {item.categoria}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '14px 20px',
                            fontSize: 14,
                            borderBottom: `1px solid ${border}`,
                            color: fg,
                          }}
                        >
                          ${item.precio} /{' '}
                          {unitLabels[item.unidad] ?? item.unidad}
                        </td>
                        <td
                          style={{
                            padding: '14px 20px',
                            fontSize: 14,
                            borderBottom: `1px solid ${border}`,
                            color: muted,
                          }}
                        >
                          {item.stock} {unitLabels[item.unidad] ?? item.unidad}
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
                              background: item.estado
                                ? isDark
                                  ? 'rgba(74,138,99,0.15)'
                                  : 'rgba(36,86,60,0.07)'
                                : isDark
                                  ? 'rgba(212,160,32,0.12)'
                                  : 'rgba(242,169,0,0.1)',
                              color: item.estado ? brand : '#F2A900',
                            }}
                          >
                            {item.estado ? 'Activo' : 'Inactivo'}
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
                              onClick={() => toggleStatus(item)}
                              aria-label={
                                item.estado ? 'Desactivar' : 'Activar'
                              }
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
                              {item.estado ? '⏸' : '▶️'}
                            </button>
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
                value={form.nombre}
                onChange={(e) =>
                  setForm((p) => ({ ...p, nombre: e.target.value }))
                }
                placeholder="ej. Aguacate Hass"
                required
                style={inputStyle(
                  bg,
                  border,
                  brand,
                  fg,
                  focusedField === 'nombre',
                )}
                onFocus={() => setFocusedField('nombre')}
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
                value={form.categoria}
                onChange={(e) =>
                  setForm((p) => ({ ...p, categoria: e.target.value }))
                }
                required
                style={{
                  ...inputStyle(
                    bg,
                    border,
                    brand,
                    fg,
                    focusedField === 'categoria',
                  ),
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                  paddingRight: 36,
                }}
              >
                <option value="">Seleccionar…</option>
                <option value="Verdura">Verdura</option>
                <option value="Fruta">Fruta</option>
                <option value="Grano">Grano</option>
                <option value="Otro">Otro</option>
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
                value={form.unidad}
                onChange={(e) =>
                  setForm((p) => ({ ...p, unidad: e.target.value }))
                }
                style={{
                  ...inputStyle(
                    bg,
                    border,
                    brand,
                    fg,
                    focusedField === 'unidad',
                  ),
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                  paddingRight: 36,
                }}
              >
                <option value="kg">Kilogramo (kg)</option>
                <option value="unidad">Unidad</option>
                <option value="lb">Libra (lb)</option>
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
              Vas a eliminar "{delTarget.nombre}". Esta acción no se puede
              deshacer.
            </p>
            <div
              style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}
            >
              <button
                onClick={() => setDelTarget(null)}
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
                Eliminar
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
