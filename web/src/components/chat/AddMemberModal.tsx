import { useState } from 'react';
import { useAppColors } from '~/hooks/useAppColors';

interface AddMemberModalProps {
  onSave: (userId: number) => void;
  onClose: () => void;
  saving?: boolean;
}

export function AddMemberModal({
  onSave,
  onClose,
  saving,
}: Readonly<AddMemberModalProps>) {
  const c = useAppColors();
  const [userId, setUserId] = useState('');

  const handleSave = () => {
    const id = Number(userId);
    if (!userId || Number.isNaN(id) || id <= 0) return;
    onSave(id);
  };

  return (
    <dialog
      open
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-0"
    >
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 cursor-default border-0 bg-transparent p-0"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      <div
        className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-2xl"
        style={{
          background: c.surface,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${c.border}` }}
        >
          <h3 className="text-base font-semibold" style={{ color: c.fg }}>
            Agregar miembro
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer border-none bg-transparent text-lg"
            style={{ color: c.muted }}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: c.fg }}
          >
            ID del usuario
          </label>
          <input
            type="number"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Ej: 42"
            min={1}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: c.inputBorder,
              background: c.bg,
              color: c.fg,
            }}
            aria-label="ID del usuario a agregar"
          />
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2.5 px-5 py-4"
          style={{ borderTop: `1px solid ${c.border}` }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
            style={{
              borderColor: c.coral,
              color: c.coral,
              background: 'transparent',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !userId || Number(userId) <= 0}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: c.brand }}
          >
            {saving ? 'Agregando…' : 'Agregar'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
