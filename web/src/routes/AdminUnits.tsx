import { useMemo, useRef, useState } from 'react';
import { useTheme } from '../providers/ThemeProvider';

interface Unit {
  id: number;
  nombre: string;
  abreviatura: string;
  estado: boolean;
}

const initialData: Unit[] = [
  { id: 1, nombre: 'Kilogramo', abreviatura: 'kg', estado: true },
  { id: 2, nombre: 'Unidad', abreviatura: 'pz', estado: true },
  { id: 3, nombre: 'Litro', abreviatura: 'lt', estado: true },
  { id: 4, nombre: 'Libra', abreviatura: 'lb', estado: false },
];

export function AdminUnits() {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const border = isDark ? '#2A332A' : '#D6DAD4';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const bg = isDark ? '#1A211B' : '#F5F7F0';
  const brand = isDark ? '#4A8A63' : '#24563C';
  const coral = '#DE393A';

  const [items, setItems] = useState<Unit[]>(initialData);
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre: '', abreviatura: '' });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'todos' | 'activos' | 'inactivos'
  >('todos');
  const [delTarget, setDelTarget] = useState<Unit | null>(null);
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const nextId = useRef(5);

  const filtered = useMemo(
    () =>
      items.filter((i) => {
        const matchesSearch =
          !search ||
          i.nombre.toLowerCase().includes(search.toLowerCase()) ||
          i.abreviatura.toLowerCase().includes(search.toLowerCase());
        const matchesStatus =
          statusFilter === 'todos' ||
          (statusFilter === 'activos' ? i.estado : !i.estado);
        return matchesSearch && matchesStatus;
      }),
    [items, search, statusFilter],
  );

  function startNew() {
    setEditId(null);
    setForm({ nombre: '', abreviatura: '' });
    setTab('form');
  }

  function startEdit(item: Unit) {
    setEditId(item.id);
    setForm({ nombre: item.nombre, abreviatura: item.abreviatura });
    setTab('form');
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.abreviatura.trim()) return;
    setSaving(true);
    if (editId) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === editId
            ? {
                ...i,
                nombre: form.nombre.trim(),
                abreviatura: form.abreviatura.trim(),
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
          abreviatura: form.abreviatura.trim(),
          estado: true,
        },
      ]);
    }
    setTab('list');
    setSaving(false);
  }

  function handleDelete() {
    if (!delTarget) return;
    setItems((prev) => prev.filter((i) => i.id !== delTarget.id));
    setDelTarget(null);
  }

  function toggleStatus(item: Unit) {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, estado: !i.estado } : i)),
    );
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
          Gestión de unidades
        </h2>
        <button
          onClick={startNew}
          style={{ ...btnStyle, background: coral, color: '#fff' }}
        >
          ＋ Nueva unidad
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
        <button
          onClick={() => setTab('list')}
          style={{
            padding: '8px 20px',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            background: tab === 'list' ? surface : 'transparent',
            color: tab === 'list' ? fg : muted,
            boxShadow: tab === 'list' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          📋 Lista de unidades
        </button>
        <button
          onClick={() => startNew()}
          style={{
            padding: '8px 20px',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            background: tab === 'form' ? surface : 'transparent',
            color: tab === 'form' ? fg : muted,
            boxShadow: tab === 'form' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          ➕ Agregar unidad
        </button>
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
              {items.length} unidades
            </span>
            <input
              type="search"
              placeholder="Buscar unidad…"
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
          <div
            style={{
              display: 'flex',
              gap: 6,
              padding: '8px 20px',
              borderBottom: `1px solid ${border}`,
            }}
          >
            {(['todos', 'activos', 'inactivos'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 12,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  background: statusFilter === f ? brand : 'transparent',
                  color: statusFilter === f ? '#fff' : muted,
                }}
              >
                {f === 'todos'
                  ? 'Todos'
                  : f === 'activos'
                    ? 'Activos'
                    : 'Inactivos'}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Nombre', 'Abreviatura', 'Estado', 'Acciones'].map((h) => (
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
                      colSpan={4}
                      style={{
                        textAlign: 'center',
                        padding: '48px 24px',
                        color: muted,
                        fontSize: 14,
                      }}
                    >
                      No hay unidades
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} style={{ background: surface }}>
                      <td
                        style={{
                          padding: '14px 20px',
                          fontSize: 14,
                          borderBottom: `1px solid ${border}`,
                          fontWeight: 600,
                          color: fg,
                        }}
                      >
                        {item.nombre}
                      </td>
                      <td
                        style={{
                          padding: '14px 20px',
                          fontSize: 14,
                          borderBottom: `1px solid ${border}`,
                          color: muted,
                        }}
                      >
                        {item.abreviatura}
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
                            aria-label={item.estado ? 'Desactivar' : 'Activar'}
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
                  ))
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
              {editId ? 'Editar unidad' : 'Nueva unidad'}
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
                Nombre
              </label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) =>
                  setForm((p) => ({ ...p, nombre: e.target.value }))
                }
                placeholder="ej. Kilogramo"
                required
                style={{
                  width: '100%',
                  height: 44,
                  border: `1.5px solid ${focusedField === 'nombre' ? brand : border}`,
                  borderRadius: 10,
                  padding: '0 14px',
                  fontSize: 15,
                  fontFamily: 'inherit',
                  background: bg,
                  color: fg,
                  outline: 'none',
                }}
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
                Abreviatura
              </label>
              <input
                type="text"
                value={form.abreviatura}
                onChange={(e) =>
                  setForm((p) => ({ ...p, abreviatura: e.target.value }))
                }
                placeholder="ej. kg"
                required
                style={{
                  width: '100%',
                  height: 44,
                  border: `1.5px solid ${focusedField === 'abreviatura' ? brand : border}`,
                  borderRadius: 10,
                  padding: '0 14px',
                  fontSize: 15,
                  fontFamily: 'inherit',
                  background: bg,
                  color: fg,
                  outline: 'none',
                }}
                onFocus={() => setFocusedField('abreviatura')}
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
                💾 Guardar unidad
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
              ¿Eliminar unidad?
            </h3>
            <p style={{ fontSize: 14, color: muted, marginBottom: 20 }}>
              Vas a eliminar "{delTarget.nombre} ({delTarget.abreviatura})".
              Esta acción no se puede deshacer.
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
