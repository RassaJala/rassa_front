import React from 'react';
import { User, UserRole, roleColors, roleLabels, getFullName } from './types';

interface UserTableProps {
  readonly users: User[];
  readonly filteredCount: number;
  readonly paginatedUsers: User[];
  readonly currentUserId?: number | undefined;
  readonly isTogglePending: boolean;
  readonly isRolePending: boolean;
  readonly onToggleStatus: (user: User) => void;
  readonly onOpenRoleModal: (user: User) => void;
  readonly theme: {
    readonly fg: string;
    readonly muted: string;
    readonly border: string;
    readonly surface: string;
    readonly bg: string;
    readonly brand: string;
  };
  readonly isDark: boolean;
  readonly totalPages: number;
  readonly currentPage: number;
  readonly onPageChange: (page: number) => void;
}

function RolePill({ role }: { role: UserRole }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: 999,
        background: `${roleColors[role]}1A`,
        color: roleColors[role],
      }}
    >
      {roleLabels[role]}
    </span>
  );
}

function StatusBadge({
  active,
  brand,
  isDark,
}: {
  active: boolean;
  brand: string;
  isDark: boolean;
}) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: 6,
        background: active
          ? isDark
            ? 'rgba(74,138,99,0.15)'
            : 'rgba(36,86,60,0.07)'
          : isDark
            ? 'rgba(212,160,32,0.12)'
            : 'rgba(242,169,0,0.1)',
        color: active ? brand : '#F2A900',
      }}
    >
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

export default function UserTable({
  users,
  filteredCount,
  paginatedUsers,
  currentUserId,
  isTogglePending,
  isRolePending,
  onToggleStatus,
  onOpenRoleModal,
  theme,
  isDark,
  totalPages,
  currentPage,
  onPageChange,
}: UserTableProps) {
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

  return (
    <>
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
            {filteredCount} usuarios
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Usuario', 'Email', 'Rol', 'Estado', 'Acciones'].map((h) => (
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
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: 'center',
                      padding: '48px 24px',
                      color: muted,
                      fontSize: 14,
                    }}
                  >
                    No hay usuarios
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const isSelf = user.id === currentUserId;
                  return (
                    <tr key={user.id} style={{ background: surface }}>
                      <td
                        style={{
                          padding: '14px 20px',
                          borderBottom: `1px solid ${border}`,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: isDark ? '#1C2D22' : '#E2F0E6',
                              display: 'grid',
                              placeItems: 'center',
                              fontWeight: 600,
                              fontSize: 13,
                              color: brand,
                              flexShrink: 0,
                            }}
                          >
                            {user.nombre[0]}
                            {user.apellido_paterno[0]}
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: fg,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              {getFullName(user)}
                              {isSelf ? (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background: isDark
                                      ? 'rgba(212,160,32,0.2)'
                                      : '#FEF3C7',
                                    color: isDark ? '#F2A900' : '#D97706',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                  }}
                                >
                                  tú
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: '14px 20px',
                          fontSize: 13,
                          color: muted,
                          borderBottom: `1px solid ${border}`,
                        }}
                      >
                        {user.email}
                      </td>
                      <td
                        style={{
                          padding: '14px 20px',
                          borderBottom: `1px solid ${border}`,
                        }}
                      >
                        <RolePill role={user.role} />
                      </td>
                      <td
                        style={{
                          padding: '14px 20px',
                          borderBottom: `1px solid ${border}`,
                        }}
                      >
                        <StatusBadge
                          active={user.estado}
                          brand={brand}
                          isDark={isDark}
                        />
                      </td>
                      <td
                        style={{
                          padding: '14px 20px',
                          borderBottom: `1px solid ${border}`,
                        }}
                      >
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => onToggleStatus(user)}
                            disabled={isSelf || isTogglePending}
                            aria-label={user.estado ? 'Desactivar' : 'Activar'}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              border: `1px solid ${border}`,
                              background: surface,
                              cursor:
                                isSelf || isTogglePending
                                  ? 'not-allowed'
                                  : 'pointer',
                              fontSize: 14,
                              display: 'grid',
                              placeItems: 'center',
                              color: isSelf || isTogglePending ? muted : fg,
                              opacity: isSelf || isTogglePending ? 0.5 : 1,
                            }}
                          >
                            {user.estado ? '⏸' : '▶️'}
                          </button>
                          <button
                            onClick={() => onOpenRoleModal(user)}
                            disabled={isSelf || isRolePending}
                            aria-label="Cambiar rol"
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              border: `1px solid ${border}`,
                              background: surface,
                              cursor:
                                isSelf || isRolePending
                                  ? 'not-allowed'
                                  : 'pointer',
                              fontSize: 14,
                              display: 'grid',
                              placeItems: 'center',
                              color: isSelf || isRolePending ? muted : brand,
                              opacity: isSelf || isRolePending ? 0.5 : 1,
                            }}
                          >
                            👤
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
            marginTop: 16,
          }}
        >
          <button
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            style={{
              ...btnStyle,
              height: 36,
              padding: '0 14px',
              borderRadius: 8,
              background: currentPage <= 1 ? 'transparent' : surface,
              border: `1.5px solid ${border}`,
              color: currentPage <= 1 ? muted : fg,
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage <= 1 ? 0.5 : 1,
              fontSize: 13,
            }}
          >
            ← Anterior
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={{
                ...btnStyle,
                width: 36,
                height: 36,
                borderRadius: 8,
                border: 'none',
                background: p === currentPage ? brand : 'transparent',
                color: p === currentPage ? '#fff' : fg,
                fontWeight: p === currentPage ? 700 : 500,
                cursor: 'pointer',
                fontSize: 13,
                justifyContent: 'center',
              }}
            >
              {p}
            </button>
          ))}

          <button
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            style={{
              ...btnStyle,
              height: 36,
              padding: '0 14px',
              borderRadius: 8,
              background: currentPage >= totalPages ? 'transparent' : surface,
              border: `1.5px solid ${border}`,
              color: currentPage >= totalPages ? muted : fg,
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage >= totalPages ? 0.5 : 1,
              fontSize: 13,
            }}
          >
            Siguiente →
          </button>
        </div>
      )}
    </>
  );
}
