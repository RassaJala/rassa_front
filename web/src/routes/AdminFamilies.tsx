import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../providers/ThemeProvider';
import api from '../services/api';
import type { Family } from '../types';
import { extractApiError } from '../utils/apiError';

export function AdminFamilies() {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const navigate = useNavigate();

  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const border = isDark ? '#2A332A' : '#D6DAD4';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const bg = isDark ? '#1A211B' : '#F5F7F0';
  const brand = isDark ? '#4A8A63' : '#24563C';
  const coral = '#DE393A';

  const [items, setItems] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre_familia: '', detalle_familia: '' });
  const [search, setSearch] = useState('');
  const [delTarget, setDelTarget] = useState<Family | null>(null);
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    fetchFamilies();
  }, []);

  async function fetchFamilies() {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get('/familias/grupos/');
      if (Array.isArray(data)) {
        setItems(data);
      } else if (data && typeof data === 'object') {
        const payload = (data as { data?: unknown }).data ?? data;
        if (Array.isArray(payload)) {
          setItems(payload);
        } else if (payload && typeof payload === 'object' && Array.isArray((payload as { results?: unknown }).results)) {
          setItems((payload as { results: Family[] }).results);
        } else {
          setItems([]);
        }
      } else {
        setItems([]);
      }
    } catch (err: unknown) {
      console.error(err);
      setError('Error al cargar las familias.');
    } finally {
      setLoading(false);
    }
  }

  function startNew() {
    setEditId(null);
    setForm({ nombre_familia: '', detalle_familia: '' });
    setTab('form');
  }

  function startEdit(item: Family) {
    setEditId(item.id_familia);
    setForm({
      nombre_familia: item.nombre_familia,
      detalle_familia: item.detalle_familia ?? '',
    });
    setTab('form');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre_familia.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        nombre_familia: form.nombre_familia.trim(),
        detalle_familia: form.detalle_familia.trim() || undefined,
      };

      if (editId) {
        await api.patch(`/familias/grupos/${editId}/`, payload);
      } else {
        await api.post('/familias/grupos/', {
          ...payload,
          estado: true,
        });
      }
      await fetchFamilies();
      setTab('list');
    } catch (err: unknown) {
      console.error(err);
      const apiErr = extractApiError(err, ['nombre_familia', 'detail']);
      setError(apiErr || 'Error al guardar la familia.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!delTarget) return;
    setError(null);
    try {
      await api.delete(`/familias/grupos/${delTarget.id_familia}/`);
      await fetchFamilies();
      setDelTarget(null);
    } catch (err: unknown) {
      console.error(err);
      setError('Error al eliminar la familia.');
    }
  }

  async function toggleStatus(item: Family) {
    setError(null);
    try {
      await api.patch(`/familias/grupos/${item.id_familia}/`, {
        estado: !item.estado,
      });
      await fetchFamilies();
    } catch (err: unknown) {
      console.error(err);
      setError('Error al cambiar el estado de la familia.');
    }
  }

  const filtered = useMemo(() => {
    return items.filter((i) =>
      i.nombre_familia.toLowerCase().includes(search.toLowerCase()) ||
      (i.jefe_nombre && i.jefe_nombre.toLowerCase().includes(search.toLowerCase()))
    );
  }, [items, search]);

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
          Gestión de familias
        </h2>
        <button
          onClick={startNew}
          style={{ ...btnStyle, background: coral, color: '#fff' }}
        >
          ＋ Nueva familia
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
          📋 Lista de familias
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
          ➕ Agregar familia
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: isDark ? 'rgba(222,57,58,0.15)' : 'rgba(222,57,58,0.07)',
            color: coral,
            fontSize: 14,
            marginBottom: 20,
            border: `1px solid ${isDark ? 'rgba(222,57,58,0.25)' : 'rgba(222,57,58,0.15)'}`,
          }}
        >
          ⚠️ {error}
        </div>
      )}

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
              {loading ? 'Cargando...' : `${filtered.length} familias`}
            </span>
            <input
              type="search"
              placeholder="Buscar familia…"
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
                  {['Nombre de Familia', 'Jefe de Familia', 'Detalle', 'Estado', 'Miembros', 'Acciones'].map((h) => (
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
                      colSpan={6}
                      style={{
                        textAlign: 'center',
                        padding: '48px 24px',
                        color: muted,
                        fontSize: 14,
                      }}
                    >
                      Cargando familias...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
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
                      No se encontraron familias
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id_familia} style={{ background: surface }}>
                      <td
                        style={{
                          padding: '14px 20px',
                          fontSize: 14,
                          borderBottom: `1px solid ${border}`,
                          fontWeight: 600,
                          color: fg,
                        }}
                      >
                        {item.nombre_familia}
                      </td>
                      <td
                        style={{
                          padding: '14px 20px',
                          fontSize: 14,
                          borderBottom: `1px solid ${border}`,
                          color: fg,
                        }}
                      >
                        {item.jefe_nombre ?? (
                          <span style={{ fontStyle: 'italic', color: muted }}>
                            Sin asignar
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '14px 20px',
                          fontSize: 14,
                          borderBottom: `1px solid ${border}`,
                          color: muted,
                        }}
                      >
                        {item.detalle_familia ?? '-'}
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
                        <button
                          onClick={() => navigate(`/admin/familias/detalle?familyId=${item.id_familia}&familyName=${encodeURIComponent(item.nombre_familia)}`)}
                          style={{
                            background: 'transparent',
                            border: `1px solid ${border}`,
                            borderRadius: 8,
                            padding: '6px 12px',
                            fontSize: 13,
                            color: brand,
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          👥 Ver miembros
                        </button>
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
              {editId ? 'Editar familia' : 'Nueva familia'}
            </span>
          </div>
          <form
            onSubmit={handleSave}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              padding: 24,
              maxWidth: 500,
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
                Nombre de la Familia
              </label>
              <input
                type="text"
                value={form.nombre_familia}
                onChange={(e) =>
                  setForm((p) => ({ ...p, nombre_familia: e.target.value }))
                }
                placeholder="ej. Familia Pérez"
                required
                style={{
                  width: '100%',
                  height: 44,
                  border: `1.5px solid ${focusedField === 'nombre_familia' ? brand : border}`,
                  borderRadius: 10,
                  padding: '0 14px',
                  fontSize: 15,
                  fontFamily: 'inherit',
                  background: bg,
                  color: fg,
                  outline: 'none',
                }}
                onFocus={() => setFocusedField('nombre_familia')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
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
                Detalle / Descripción
              </label>
              <textarea
                value={form.detalle_familia}
                onChange={(e) =>
                  setForm((p) => ({ ...p, detalle_familia: e.target.value }))
                }
                placeholder="Descripción del grupo familiar..."
                style={{
                  width: '100%',
                  height: 90,
                  border: `1.5px solid ${focusedField === 'detalle_familia' ? brand : border}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontSize: 15,
                  fontFamily: 'inherit',
                  background: bg,
                  color: fg,
                  outline: 'none',
                  resize: 'vertical',
                }}
                onFocus={() => setFocusedField('detalle_familia')}
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
                💾 Guardar familia
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
              ¿Eliminar familia?
            </h3>
            <p style={{ fontSize: 14, color: muted, marginBottom: 20 }}>
              Vas a eliminar "{delTarget.nombre_familia}". Esta acción no se puede
              deshacer y podría desvincular a todos sus miembros.
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
