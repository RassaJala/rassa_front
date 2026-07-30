import React from 'react';
import { User, getFullName } from './types';

interface DeactivationModalProps {
  readonly user: User;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
  readonly theme: {
    readonly fg: string;
    readonly muted: string;
    readonly border: string;
    readonly surface: string;
    readonly coral: string;
  };
}

export default function DeactivationModal({
  user,
  onConfirm,
  onClose,
  theme,
}: DeactivationModalProps) {
  const { fg, muted, border, surface, coral } = theme;

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
          Confirmar desactivación
        </h3>
        <p style={{ fontSize: 14, color: muted, marginBottom: 8 }}>
          ¿Estás seguro de desactivar a{' '}
          <strong style={{ color: fg }}>{getFullName(user)}</strong>?
        </p>
        <p style={{ fontSize: 13, color: muted, marginBottom: 20 }}>
          El usuario perderá acceso al sistema hasta que sea reactivado.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
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
            onClick={onConfirm}
            style={{
              height: 36,
              padding: '0 16px',
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
            Desactivar
          </button>
        </div>
      </div>
    </div>
  );
}
