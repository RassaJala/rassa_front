import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from '../providers/ThemeProvider';
import api from '../services/api';

interface Municipio {
  id_municipio: number;
  nombre: string;
  estado: boolean;
}

export function AdminMunicipios() {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const border = isDark ? '#2A332A' : '#D6DAD4';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const bg = isDark ? '#1A211B' : '#F5F7F0';
  const brand = isDark ? '#4A8A63' : '#24563C';
  const coral = '#DE393A';

  const [items, setItems] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre: '' });
  const [search, setSearch] = useState('');
  const [delTarget, setDelTarget] = useState<Municipio | null>(null);
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Municipio[]>('/municipios/');
      setItems(res.data);
    } catch {
      setError('Error al cargar municipios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const filtered = useMemo(
    () =>
      items.filter((i) =>
        i.nombre.toLowerCase().includes(search.toLowerCase()),
      ),
    [items, search],
  );

  function startNew() {
    setEditId(null);
    setForm({ nombre: '' });
    setTab('form');
  }

  function startEdit(item: Municipio) {
    setEditId(item.id_municipio);
    setForm({ nombre: item.nombre });
    setTab('form');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        const res = await api.patch<{ data: Municipio }>(
          `/municipios/${editId}/`,
          { nombre: form.nombre.trim() },
        );
        setItems((prev) =>
          prev.map((i) =>
            i.id_municipio === editId ? res.data.data : i,
          ),
        );
      } else {
        const res = await api.post<{ data: Municipio }>('/municipios/', {
          nombre: form.nombre.trim(),
          estado: true,
        });
        setItems((prev) => [...prev, res.data.data]);
      }
      setTab('list');
    } catch {
      setError(editId ? 'Error al actualizar' : 'Error al crear');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!delTarget) return;
    try {
      await api.delete(`/municipios/${delTarget.id_municipio}/`);
      setItems((prev) =>
        prev.filter((i) => i.id_municipio !== delTarget.id_municipio),
      );
      setDelTarget(null);
    } catch {
      setError('Error al eliminar');
    }
  }

  async function toggleStatus(item: Municipio) {
    const newStatus = !item.estado;
    try {
      const res = await api.patch<{ data: Municipio }>(
        `/municipios/${item.id_municipio}/`,
        { estado: newStatus },
      );
      setItems((prev) =>
        prev.map((i) =>
          i.id_municipio === item.id_municipio ? res.data.data : i,
        ),
      );
    } catch {
      setError('Error al cambiar estado');
    }
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
          Gestión de municipios
        </h2>
        <button
          onClick={startNew}
          style={{ ...btnStyle, background: coral, color: '#fff' }}
        >
          ＋ Nuevo municipio
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            background: 'rgba(222,57,58,0.1)',
            border: '1px solid #DE393A',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 16,
            color: coral,
            fontSize: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: coral,
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>
      )}

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
          📋 Lista de municipios
        </button>
        <button
          onClick={() => startNew()}
          disabled={loading}
          style={{
            padding: '8px 20px',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: loading ? 'not-allowed' : 'pointer',
            background: tab === 'form' ? surface : 'transparent',
            color: tab === 'form' ? fg : muted,
            boxShadow: tab === 'form' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          ➕ Agregar municipio
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
              {loading ? 'Cargando…' : `${items.length} municipios`}
            </span>
            <input
              type="search"
              placeholder="Buscar municipio…"
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
                  {['Nombre', 'Estado', 'Acciones'].map((h) => (
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
                {loading ? (
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        textAlign: 'center',
                        padding: '48px 24px',
                        color: muted,
                        fontSize: 14,
                      }}
                    >
                      Cargando datos…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        textAlign: 'center',
                        padding: '48px 24px',
                        color: muted,
                        fontSize: 14,
                      }}
                    >
                      {search ? 'Sin resultados' : 'No hay municipios'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id_municipio} style={{ background: surface }}>
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
              {editId ? 'Editar municipio' : 'Nuevo municipio'}
            </span>
          </div>
          <form
            onSubmit={handleSave}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 18,
              padding: 24,
            }}
          >
            <div
              style={{
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
                Nombre
              </label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) =>
                  setForm((p) => ({ ...p, nombre: e.target.value }))
                }
                placeholder="ej. Tlaquepaque"
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
                💾 Guardar municipio
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
              ¿Eliminar municipio?
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
