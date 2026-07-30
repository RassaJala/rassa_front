import React from 'react';
import { User, UserRole, ROLE_OPTIONS, getFullName } from './types';

interface RoleChangeModalProps {
  readonly user: User;
  readonly selectedRole: UserRole | '';
  readonly onRoleChange: (role: UserRole) => void;
  readonly onSave: () => void;
  readonly onClose: () => void;
  readonly theme: {
    readonly fg: string;
    readonly muted: string;
    readonly border: string;
    readonly surface: string;
    readonly brand: string;
  };
}

export default function RoleChangeModal({
  user,
  selectedRole,
  onRoleChange,
  onSave,
  onClose,
  theme,
}: RoleChangeModalProps) {
  const { fg, muted, border, surface, brand } = theme;

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          background: surface,
          borderRadius: 20,
          padding: 28,
          maxWidth: 400,
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
            marginBottom: 4,
          }}
        >
          Cambiar Rol
        </h3>
        <p style={{ fontSize: 13, color: muted, marginBottom: 20 }}>
          Usuario: <strong style={{ color: fg }}>{getFullName(user)}</strong>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ROLE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 10,
                background:
                  selectedRole === opt.value ? `${opt.color}12` : 'transparent',
                border: `1.5px solid ${selectedRole === opt.value ? opt.color : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="role"
                value={opt.value}
                checked={selectedRole === opt.value}
                onChange={() => onRoleChange(opt.value)}
                style={{ accentColor: opt.color }}
              />
              <span style={{ fontSize: 15, fontWeight: 500, color: opt.color }}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
            marginTop: 24,
          }}
        >
          <button
            onClick={onClose}
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
              fontFamily: 'inherit',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            style={{
              height: 36,
              padding: '0 16px',
              borderRadius: 8,
              border: 'none',
              background: brand,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
