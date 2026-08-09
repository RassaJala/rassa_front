import { useEffect, useMemo, useRef, useState } from 'react';
import { getColors } from '../../constants/colors';
import { useTheme } from '../../providers/ThemeProvider';
import {
  filterItems,
  FILTER_LABELS,
  STATUS_FILTERS,
} from '../../utils/crudFilter';

export interface FieldDefinition<T> {
  name: keyof T & string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'textarea';
  required?: boolean;
  fullWidth?: boolean;
}

export interface AdminCrudTableProps<
  T extends { id: number; nombre: string; estado: boolean },
> {
  entityName: string;
  entityNamePlural: string;
  initialData: T[];
  fields: FieldDefinition<T>[];
  searchFields: (keyof T)[];
  nextIdStart: number;
  formatDeleteTarget?: (item: T) => string;
}

export function AdminCrudTable<
  T extends { id: number; nombre: string; estado: boolean },
>(props: AdminCrudTableProps<T>) {
  const {
    entityName,
    entityNamePlural,
    initialData,
    fields,
    searchFields,
    nextIdStart,
    formatDeleteTarget,
  } = props;
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const c = getColors(isDark);
  const { fg, muted, border, surface, bg, brand, coral } = c;
  const fmtDelete = formatDeleteTarget ?? ((item: T) => item.nombre);

  const initForm = Object.fromEntries(fields.map((f) => [f.name, '']));

  const [items, setItems] = useState<T[]>(initialData);
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, string>>(initForm);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'todos' | 'activos' | 'inactivos'
  >('todos');
  const [filterExcludedCount, setFilterExcludedCount] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [delTarget, setDelTarget] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const nextId = useRef(nextIdStart);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Separate effect for excludedCount — avoids setState inside useMemo
  const filtered = useMemo(() => {
    const result = filterItems(
      items,
      searchDebounced,
      statusFilter,
      searchFields as (keyof T & string)[],
    );
    return result;
  }, [items, searchDebounced, statusFilter, searchFields]);

  useEffect(() => {
    setFilterExcludedCount(filtered.excludedCount);
  }, [filtered.excludedCount]);

  // ponytail: form fields are always string keys of T — never id (number) or estado (boolean)
  function mergeFormIntoEntity(entity: T, formData: Record<string, string>): T {
    const result: Record<string, unknown> = { ...entity };
    for (const key of Object.keys(formData)) {
      result[key] = formData[key];
    }
    return result as unknown as T;
  }

  function startNew() {
    setEditId(null);
    setForm(Object.fromEntries(fields.map((f) => [f.name, ''])));
    setFormError(null);
    setTab('form');
  }

  function startEdit(item: T) {
    setEditId(item.id);
    setForm(
      Object.fromEntries(
        fields.map((f) => [f.name, String(item[f.name] ?? '')]),
      ),
    );
    setFormError(null);
    setTab('form');
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const missingField = fields.find(
      (f) => f.required && !(form[f.name] ?? '').trim(),
    );
    if (missingField) {
      setFormError(`El campo "${missingField.label}" es obligatorio.`);
      return;
    }
    setFormError(null);
    setSaving(true);
    const formData = Object.fromEntries(
      fields.map((f) => [f.name, form[f.name]?.trim() ?? '']),
    );
    if (editId) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === editId ? mergeFormIntoEntity(i, formData) : i,
        ),
      );
    } else {
      const base: Record<string, unknown> = {
        id: nextId.current++,
        estado: true,
      };
      for (const [key, value] of Object.entries(formData)) {
        base[key] = value;
      }
      setItems((prev) => [...prev, base as unknown as T]);
    }
    setTab('list');
    setSaving(false);
  }

  function handleDelete() {
    if (!delTarget) return;
    setItems((prev) => prev.filter((i) => i.id !== delTarget.id));
    setDelTarget(null);
  }

  function toggleStatus(item: T) {
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
          Gestión de {entityNamePlural}
        </h2>
        <button
          onClick={startNew}
          style={{ ...btnStyle, background: coral, color: '#fff' }}
        >
          ＋ Nueva {entityName}
        </button>
      </div>

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
          📋 Lista de {entityNamePlural}
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
          ➕ Agregar {entityName}
        </button>
      </div>

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
              {items.length} {entityNamePlural}
            </span>
            <input
              type="search"
              placeholder={`Buscar ${entityName}…`}
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
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
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
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>

          {filterExcludedCount > 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                margin: '0 20px 8px',
                padding: '8px 12px',
                borderRadius: 10,
                background: isDark ? '#3D2023' : '#FDEDEE',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#DE393A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span style={{ fontSize: 13, color: '#DE393A', flex: 1 }}>
                {filterExcludedCount} elemento
                {filterExcludedCount !== 1 ? 's' : ''} no pudo
                {filterExcludedCount === 1 ? '' : 'ieron'} procesarse debido a
                un error.
              </span>
            </div>
          ) : null}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {[...fields.map((f) => f.label), 'Estado', 'Acciones'].map(
                    (h) => (
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
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={fields.length + 2}
                      style={{
                        textAlign: 'center',
                        padding: '48px 24px',
                        color: muted,
                        fontSize: 14,
                      }}
                    >
                      No hay {entityNamePlural}
                    </td>
                  </tr>
                ) : filtered.items.length === 0 ? null : (
                  filtered.items.map((item) => (
                    <tr key={item.id} style={{ background: surface }}>
                      {fields.map((f) => (
                        <td
                          key={f.name}
                          style={{
                            padding: '14px 20px',
                            fontSize: 14,
                            borderBottom: `1px solid ${border}`,
                            fontWeight: f === fields[0] ? 600 : 'normal',
                            color: f === fields[0] ? fg : muted,
                          }}
                        >
                          {String(item[f.name] ?? '')}
                        </td>
                      ))}
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
            {items.length > 0 && filtered.items.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '48px 20px',
                  color: muted,
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 12 }}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                    <path d="M8 11h6" />
                  </svg>
                </div>
                <p style={{ fontSize: 14, margin: 0 }}>
                  {searchDebounced.trim()
                    ? `No se encontraron resultados para "${searchDebounced.trim()}".`
                    : 'No se encontraron resultados con el filtro actual.'}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}

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
              {editId ? `Editar ${entityName}` : `Nueva ${entityName}`}
            </span>
          </div>
          {formError ? (
            <div
              style={{
                margin: '0 24px 16px',
                padding: '10px 14px',
                borderRadius: 10,
                background: isDark ? '#3D2023' : '#FDEDEE',
                color: '#DE393A',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              ⚠️ {formError}
            </div>
          ) : null}
          <form
            onSubmit={handleSave}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 18,
              padding: 24,
            }}
          >
            {fields.map((f) => (
              <div
                key={f.name}
                style={{
                  gridColumn: f.fullWidth ? '1 / -1' : undefined,
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
                  {f.label}
                </label>
                {f.type === 'textarea' ? (
                  <textarea
                    value={form[f.name] ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, [f.name]: e.target.value }))
                    }
                    placeholder={f.placeholder}
                    style={{
                      width: '100%',
                      height: 90,
                      border: `1.5px solid ${focusedField === f.name ? brand : border}`,
                      borderRadius: 10,
                      padding: '12px 14px',
                      fontSize: 15,
                      fontFamily: 'inherit',
                      background: bg,
                      color: fg,
                      outline: 'none',
                      resize: 'vertical',
                    }}
                    onFocus={() => setFocusedField(f.name)}
                    onBlur={() => setFocusedField(null)}
                  />
                ) : (
                  <input
                    type="text"
                    value={form[f.name] ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, [f.name]: e.target.value }))
                    }
                    placeholder={f.placeholder}
                    required={f.required}
                    style={{
                      width: '100%',
                      height: 44,
                      border: `1.5px solid ${focusedField === f.name ? brand : border}`,
                      borderRadius: 10,
                      padding: '0 14px',
                      fontSize: 15,
                      fontFamily: 'inherit',
                      background: bg,
                      color: fg,
                      outline: 'none',
                    }}
                    onFocus={() => setFocusedField(f.name)}
                    onBlur={() => setFocusedField(null)}
                  />
                )}
              </div>
            ))}
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
                💾 Guardar {entityName}
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
              ¿Eliminar {entityName}?
            </h3>
            <p style={{ fontSize: 14, color: muted, marginBottom: 20 }}>
              Vas a eliminar "{fmtDelete(delTarget)}". Esta acción no se puede
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
