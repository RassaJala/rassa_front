import React from 'react';
import { ROLE_FILTERS, STATUS_FILTERS } from './types';

interface UserFiltersProps {
  readonly search: string;
  readonly onSearchChange: (s: string) => void;
  readonly roleFilter: string;
  readonly onRoleFilterChange: (r: string) => void;
  readonly statusFilter: string;
  readonly onStatusFilterChange: (s: string) => void;
  readonly theme: {
    readonly fg: string;
    readonly muted: string;
    readonly border: string;
    readonly surface: string;
    readonly bg: string;
    readonly brand: string;
  };
  readonly isDark: boolean;
}

export default function UserFilters({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  theme,
  isDark,
}: UserFiltersProps) {
  const { fg, muted, border, surface, bg, brand } = theme;

  const btnStyle: React.CSSProperties = {
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'background 0.15s, opacity 0.15s',
  };

  const inputStyle = {
    width: '100%',
    height: 44,
    border: `1.5px solid ${border}`,
    borderRadius: 10,
    padding: '0 14px',
    fontSize: 15,
    fontFamily: 'inherit' as const,
    background: bg,
    color: fg,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <div
      style={{
        background: surface,
        borderRadius: 16,
        border: `1px solid ${border}`,
        padding: 16,
        marginBottom: 20,
      }}
    >
      {/* Search */}
      <input
        type="search"
        placeholder="Buscar por nombre o correo…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{
          ...inputStyle,
          marginBottom: 14,
        }}
      />

      {/* Role filters */}
      <div style={{ marginBottom: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: muted,
            display: 'block',
            marginBottom: 6,
          }}
        >
          Rol
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ROLE_FILTERS.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => onRoleFilterChange(opt.value)}
              style={{
                ...btnStyle,
                height: 32,
                padding: '0 14px',
                borderRadius: 999,
                background:
                  roleFilter === opt.value
                    ? brand
                    : isDark
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(0,0,0,0.06)',
                color: roleFilter === opt.value ? '#fff' : muted,
                border: 'none',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: border, margin: '12px 0' }} />

      {/* Status filters */}
      <div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: muted,
            display: 'block',
            marginBottom: 6,
          }}
        >
          Estado
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {STATUS_FILTERS.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => onStatusFilterChange(opt.value)}
              style={{
                ...btnStyle,
                height: 32,
                padding: '0 14px',
                borderRadius: 999,
                background:
                  statusFilter === opt.value
                    ? brand
                    : isDark
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(0,0,0,0.06)',
                color: statusFilter === opt.value ? '#fff' : muted,
                border: 'none',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
