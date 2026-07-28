import React from 'react';

interface UserRoleSelectorProps {
  readonly formRole: 'farmer' | 'seller' | 'buyer';
  readonly setFormRole: (role: 'farmer' | 'seller' | 'buyer') => void;
  readonly roleColors: Record<'farmer' | 'seller' | 'buyer', string>;
  readonly muted: string;
  readonly border: string;
}

export default function UserRoleSelector({
  formRole,
  setFormRole,
  roleColors,
  muted,
  border,
}: UserRoleSelectorProps): React.JSX.Element {
  const labels = {
    farmer: 'Agricultor',
    seller: 'Vendedor',
    buyer: 'Cliente',
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
          color: muted,
          marginBottom: 6,
          display: 'block',
        }}
      >
        Rol
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        {(['farmer', 'seller', 'buyer'] as const).map((r) => {
          const active = formRole === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setFormRole(r)}
              style={{
                flex: 1,
                height: 38,
                borderRadius: 8,
                border: `1.5px solid ${active ? roleColors[r] : border}`,
                background: active ? `${roleColors[r]}12` : 'transparent',
                color: active ? roleColors[r] : muted,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {labels[r]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
