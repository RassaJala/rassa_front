import React from 'react';

interface UserFormActionsProps {
  readonly isPending: boolean;
  readonly onSave: () => void;
  readonly onCancel: () => void;
  readonly fg: string;
  readonly border: string;
  readonly coral: string;
}

export default function UserFormActions({
  isPending,
  onSave,
  onCancel,
  fg,
  border,
  coral,
}: UserFormActionsProps): React.JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
      <button
        type="button"
        onClick={onSave}
        disabled={isPending}
        style={{
          flex: 1,
          height: 38,
          borderRadius: 8,
          border: 'none',
          background: isPending ? `${coral}99` : coral,
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: isPending ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        Guardar
      </button>
      <button
        type="button"
        onClick={onCancel}
        style={{
          height: 38,
          padding: '0 18px',
          borderRadius: 8,
          border: `1.5px solid ${border}`,
          background: 'transparent',
          color: fg,
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        Cancelar
      </button>
    </div>
  );
}