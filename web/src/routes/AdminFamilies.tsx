import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { colors, themeColors } from '@/constants/colors';
import { btnStyle as sharedBtnStyle } from '@/constants/styles';
import { useTheme } from '../providers/ThemeProvider';
import api from '../services/api';
import type { Family, SearchUserResult } from '../types';
import { extractApiError } from '../utils/apiError';

export function AdminFamilies() {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const t = useMemo(() => themeColors(isDark), [isDark]);
  const fg = t.fg;
  const muted = t.muted;
  const border = t.border;
  const surface = t.surface;
  const bg = t.bg;
  const brand = t.brand;
  const coral = colors.brandRedCoral;
  const warning = {
    background: isDark ? 'rgba(242,169,0,0.12)' : 'rgba(242,169,0,0.1)',
    color: colors.warning,
  };
  const success = {
    background: isDark ? 'rgba(74,138,99,0.15)' : 'rgba(36,86,60,0.07)',
    color: colors.primary,
  };
  const primaryGreen = colors.primary;
  const iconWhite = colors.iconWhite;

  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'list' | 'form' | 'trash'>('list');
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre_familia: '', detalle_familia: '' });
  const [search, setSearch] = useState('');
  const [delTarget, setDelTarget] = useState<Family | null>(null);
  const [permDelTarget, setPermDelTarget] = useState<Family | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Family | null>(null);
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [jefeQuery, setJefeQuery] = useState('');
  const [jefeResults, setJefeResults] = useState<SearchUserResult[]>([]);
  const [selectedJefe, setSelectedJefe] = useState<SearchUserResult | null>(null);
  const [searchingJefe, setSearchingJefe] = useState(false);

  const {
    data: items = [],
    isLoading: loading,
    isError: isFetchError,
  } = useQuery<Family[]>({
    queryKey: ['admin-families'],
    queryFn: async () => {
      const { data } = await api.get('/familias/grupos/');
      let families: Family[] = [];
      if (Array.isArray(data)) {
        families = data as Family[];
      } else if (data && typeof data === 'object') {
        const payload = (data as { data?: unknown }).data ?? data;
        if (Array.isArray(payload)) {
          families = payload as Family[];
        } else if (
          payload &&
          typeof payload === 'object' &&
          Array.isArray((payload as { results?: unknown }).results)
        ) {
          families = (payload as { results: Family[] }).results;
        }
      }
      return families;
    },
    staleTime: 30_000,
  });

  const { data: trashItems = [] } = useQuery<Family[]>({
    queryKey: ['admin-families-trash'],
    queryFn: async () => {
      const { data } = await api.get('/familias/grupos/trash/');
      const payload = (data as { results?: unknown }).results ?? data;
      if (Array.isArray(payload)) return payload as Family[];
      return [];
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const trimmed = jefeQuery.trim();
    if (trimmed.length < 1) {
      setJefeResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingJefe(true);
      try {
        const { data } = await api.get(
          `/auth/search-users/?q=${encodeURIComponent(trimmed)}&include_assigned=false`,
        );
        const payload = (data as { data?: unknown }).data ?? data;
        setJefeResults(
          Array.isArray(payload) ? (payload as SearchUserResult[]) : [],
        );
      } catch {
        setJefeResults([]);
      } finally {
        setSearchingJefe(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [jefeQuery]);

  async function handleRestoreFamily() {
    if (!restoreTarget || !selectedJefe) return;
    setError(null);
    setSaving(true);
    try {
      await api.post(`/familias/grupos/${restoreTarget.id_familia}/restore/`, {
        fk_jefe_familia: selectedJefe.id_usuario,
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-families'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-families-trash'] });
      setRestoreTarget(null);
      setSelectedJefe(null);
      setJefeQuery('');
    } catch (err: unknown) {
      console.error(err);
      const apiErr = extractApiError(err, ['fk_jefe_familia', 'detail']);
      setError(apiErr || 'Error al restaurar la familia.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePermanentDelete() {
    if (!permDelTarget) return;
    setError(null);
    try {
      await api.post(`/familias/grupos/${permDelTarget.id_familia}/permanent/`);
      await queryClient.invalidateQueries({ queryKey: ['admin-families-trash'] });
      setPermDelTarget(null);
    } catch (err: unknown) {
      console.error(err);
      setError('Error al eliminar permanentemente la familia.');
    }
  }

  function startNew() {
    setEditId(null);
    setForm({ nombre_familia: '', detalle_familia: '' });
    setSelectedJefe(null);
    setJefeQuery('');
    setJefeResults([]);
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
    if (!editId && !selectedJefe) {
      setError('Debes seleccionar un jefe de familia.');
      return;
    }
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
        if (!selectedJefe) return;
        const { data } = await api.post('/familias/grupos/', {
          ...payload,
          estado: true,
        });
        const createdFamily = (data as { data?: { id_familia: number } }).data ?? (data as { id_familia: number });
        const familyId = createdFamily.id_familia;

        let rollbackOk = true;
        try {
          await api.post('/familias/miembros/', {
            fk_usuario: selectedJefe.id_usuario,
            fk_familia: familyId,
          });

          await api.post(`/familias/grupos/${familyId}/asignar-jefe/`, {
            fk_jefe_familia: selectedJefe.id_usuario,
          });
        } catch (err: unknown) {
          try {
            await api.delete(`/familias/grupos/${familyId}/`);
          } catch (rollbackErr) {
            rollbackOk = false;
            console.error(
              '[Rollback Error] Failed to delete empty family:',
              rollbackErr,
            );
          }
          if (!rollbackOk) {
            throw new Error(
              'Error al asignar el jefe de familia. La familia fue creada pero el rollback falló — contactá al administrador.',
            );
          }
          throw err;
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['admin-families'] });
      setTab('list');
    } catch (err: unknown) {
      console.error(err);
      const apiErr = extractApiError(err, [
        'nombre_familia',
        'fk_usuario',
        'fk_jefe_familia',
        'jefe',
        'detail',
      ]);
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
      await queryClient.invalidateQueries({ queryKey: ['admin-families'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-families-trash'] });
      setDelTarget(null);
    } catch (err: unknown) {
      console.error(err);
      const apiErr = extractApiError(err, ['detail']);
      setError(apiErr || 'Error al eliminar la familia.');
    }
  }

  const filtered = useMemo(() => {
    return items.filter(
      (i) =>
        i.nombre_familia.toLowerCase().includes(search.toLowerCase()) ||
        (i.jefe_nombre &&
          i.jefe_nombre.toLowerCase().includes(search.toLowerCase())),
    );
  }, [items, search]);

  const btnStyle = sharedBtnStyle;

  return (
    <div>
      {/* Navigation header */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
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
        <button
          onClick={() => setTab('trash')}
          style={{
            padding: '8px 20px',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            background: tab === 'trash' ? surface : 'transparent',
            color: tab === 'trash' ? fg : muted,
            boxShadow: tab === 'trash' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          🗑️ Papelera ({trashItems.length})
        </button>
      </div>

      {(error || isFetchError) && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: isDark
              ? 'rgba(222,57,58,0.15)'
              : 'rgba(222,57,58,0.07)',
            color: coral,
            fontSize: 14,
            marginBottom: 20,
            border: `1px solid ${coral}`,
          }}
        >
          ⚠️ {error || 'Error al cargar las familias.'}
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
                  {[
                    'Nombre de Familia',
                    'Jefe de Familia',
                    'Detalle',
                    'Estado',
                    'Miembros',
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
                                ? 'rgba(242,169,0,0.12)'
                                : 'rgba(242,169,0,0.1)',
                            color: item.estado ? brand : warning.color,
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
                          onClick={() =>
                            navigate(
                              `/admin/familias/detalle?familyId=${item.id_familia}&familyName=${encodeURIComponent(item.nombre_familia)}`,
                            )
                          }
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
            {!editId && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                  position: 'relative',
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
                  Jefe de familia *
                </label>
                <div
                  style={{
                    display: 'flex',
                    position: 'relative',
                    alignItems: 'center',
                  }}
                >
                  <input
                    type="text"
                    value={jefeQuery}
                    onChange={(e) => {
                      setJefeQuery(e.target.value);
                      if (selectedJefe) setSelectedJefe(null);
                    }}
                    placeholder="Buscar por nombre o correo..."
                    required={!selectedJefe}
                    style={{
                      width: '100%',
                      height: 44,
                      border: `1.5px solid ${focusedField === 'jefe' ? brand : border}`,
                      borderRadius: 10,
                      padding: '0 40px 0 14px',
                      fontSize: 15,
                      fontFamily: 'inherit',
                      background: bg,
                      color: fg,
                      outline: 'none',
                    }}
                    onFocus={() => setFocusedField('jefe')}
                    onBlur={() => setTimeout(() => setFocusedField(null), 200)}
                  />
                  {(selectedJefe || jefeQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedJefe(null);
                        setJefeQuery('');
                        setJefeResults([]);
                      }}
                      style={{
                        position: 'absolute',
                        right: 12,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 16,
                        color: muted,
                      }}
                    >
                      ❌
                    </button>
                  )}
                </div>

                {searchingJefe && (
                  <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                    Buscando usuarios...
                  </div>
                )}

                {jefeResults.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 50,
                      background: surface,
                      border: `1px solid ${border}`,
                      borderRadius: 10,
                      marginTop: 4,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      maxHeight: 200,
                      overflowY: 'auto',
                    }}
                  >
                    {jefeResults.map((user) => (
                      <div
                        key={user.id_usuario}
                        onClick={() => {
                          setSelectedJefe(user);
                          setJefeQuery(
                            `${user.nombre} ${user.apellido_paterno} (${user.email})`,
                          );
                          setJefeResults([]);
                        }}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          borderBottom: `1px solid ${border}`,
                          fontSize: 14,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = isDark
                            ? border
                            : bg;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <span style={{ fontWeight: 600, color: fg }}>
                          {user.nombre} {user.apellido_paterno}
                        </span>
                        <span style={{ fontSize: 12, color: muted }}>
                          {user.email}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
                  color: colors.iconWhite,
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

      {/* TAB: Trash (Papelera) */}
      {tab === 'trash' && (
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
              padding: '16px 24px',
              borderBottom: `1px solid ${border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 600, color: fg }}>
              🗑️ Papelera de familias (vacías)
            </span>
            <span style={{ fontSize: 13, color: muted }}>
              Para reactivar una familia es obligatorio asignarle un jefe.
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr
                  style={{
                    background: bg,
                    borderBottom: `1px solid ${border}`,
                  }}
                >
                  <th
                    style={{
                      padding: '12px 20px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: muted,
                      textTransform: 'uppercase',
                    }}
                  >
                    Nombre de la familia
                  </th>
                  <th
                    style={{
                      padding: '12px 20px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: muted,
                      textTransform: 'uppercase',
                    }}
                  >
                    Detalle
                  </th>
                  <th
                    style={{
                      padding: '12px 20px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: muted,
                      textTransform: 'uppercase',
                    }}
                  >
                    Estado
                  </th>
                  <th
                    style={{
                      padding: '12px 20px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: muted,
                      textTransform: 'uppercase',
                    }}
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {trashItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        color: muted,
                        fontSize: 14,
                      }}
                    >
                      No hay familias en la papelera.
                    </td>
                  </tr>
                ) : (
                  trashItems.map((item) => (
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
                            background: isDark
                              ? 'rgba(242,169,0,0.12)'
                              : 'rgba(242,169,0,0.1)',
                            color: warning.color,
                          }}
                        >
                          En Papelera (Inactivo)
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
                            onClick={() => {
                              setRestoreTarget(item);
                              setSelectedJefe(null);
                              setJefeQuery('');
                            }}
                            aria-label="Restaurar / Asignar Jefe"
                            title="Restaurar / Asignar Jefe"
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
                            🔄
                          </button>
                          <button
                            onClick={() => setPermDelTarget(item)}
                            aria-label="Eliminar permanentemente"
                            title="Eliminar permanentemente"
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

      {/* Restore modal (requiere jefe) */}
      {restoreTarget && (
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
          onClick={() => setRestoreTarget(null)}
        >
          <div
            style={{
              background: surface,
              borderRadius: 20,
              padding: 28,
              maxWidth: 480,
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
              🔄 Restaurar "{restoreTarget.nombre_familia}"
            </h3>
            <p style={{ fontSize: 14, color: muted, marginBottom: 16 }}>
              Para reactivar esta familia es <strong>obligatorio</strong>{' '}
              asignar un nuevo jefe de familia.
            </p>

            <div style={{ marginBottom: 20, position: 'relative' }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: muted,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Buscar Jefe de Familia *
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  value={jefeQuery}
                  onChange={(e) => {
                    setJefeQuery(e.target.value);
                    if (selectedJefe) setSelectedJefe(null);
                  }}
                  placeholder="Escribe nombre o correo (mín. 2 letras)..."
                  style={{
                    flex: 1,
                    height: 44,
                    border: `1.5px solid ${selectedJefe ? brand : border}`,
                    borderRadius: 10,
                    padding: '0 14px',
                    fontSize: 15,
                    background: bg,
                    color: fg,
                    outline: 'none',
                  }}
                />
              </div>

              {searchingJefe && (
                <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                  Buscando usuarios...
                </div>
              )}

              {jefeResults.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 60,
                    background: surface,
                    border: `1px solid ${border}`,
                    borderRadius: 10,
                    marginTop: 4,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    maxHeight: 200,
                    overflowY: 'auto',
                  }}
                >
                  {jefeResults.map((user) => (
                    <div
                      key={user.id_usuario}
                      onClick={() => {
                        setSelectedJefe(user);
                        setJefeQuery(
                          `${user.nombre} ${user.apellido_paterno} (${user.email})`,
                        );
                        setJefeResults([]);
                      }}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        borderBottom: `1px solid ${border}`,
                        fontSize: 14,
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: fg }}>
                        {user.nombre} {user.apellido_paterno}
                      </span>
                      <span style={{ fontSize: 12, color: muted }}>
                        {user.email}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}
            >
              <button
                onClick={() => setRestoreTarget(null)}
                style={{
                  height: 36,
                  padding: '0 16px',
                  borderRadius: 8,
                  border: `1.5px solid ${border}`,
                  background: 'transparent',
                  color: fg,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleRestoreFamily}
                disabled={!selectedJefe || saving}
                style={{
                  height: 36,
                  padding: '0 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: primaryGreen,
                  color: iconWhite,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: selectedJefe && !saving ? 'pointer' : 'not-allowed',
                  opacity: selectedJefe && !saving ? 1 : 0.5,
                }}
              >
                {saving ? 'Restaurando...' : 'Reactivar Familia'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
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
              ¿Enviar familia a la papelera?
            </h3>
            <p style={{ fontSize: 14, color: muted, marginBottom: 20 }}>
              Vas a mover "{delTarget.nombre_familia}" a la papelera. La familia
              quedará inactiva, sin jefe y sin miembros.
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
                  border: `1.5px solid ${coral}`,
                  background: 'transparent',
                  color: coral,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Mover a papelera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Modal */}
      {permDelTarget && (
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
          onClick={() => setPermDelTarget(null)}
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
                color: coral,
                marginBottom: 8,
              }}
            >
              💥 ¿Eliminar permanentemente?
            </h3>
            <p style={{ fontSize: 14, color: muted, marginBottom: 20 }}>
              Esta acción eliminará de forma irreversible la familia "
              {permDelTarget.nombre_familia}" de la base de datos.
            </p>
            <div
              style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}
            >
              <button
                onClick={() => setPermDelTarget(null)}
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
                onClick={handlePermanentDelete}
                style={{
                  height: 32,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: coral,
                  color: colors.iconWhite,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
