import { useState, useEffect } from 'react';
import { useAppColors } from '~/hooks/useAppColors';

interface RenameGroupModalProps {
  currentName: string;
  onSave: (name: string) => void;
  onClose: () => void;
  saving?: boolean;
}

export function RenameGroupModal({
  currentName,
  onSave,
  onClose,
  saving,
}: Readonly<RenameGroupModalProps>) {
  const c = useAppColors();
  const [name, setName] = useState(currentName);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentName) return;
    onSave(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl"
        style={{
          background: c.surface,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${c.border}` }}
        >
          <h3 className="text-base font-semibold" style={{ color: c.fg }}>
            Renombrar grupo
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
            Nombre del grupo
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: c.inputBorder,
              background: c.bg,
              color: c.fg,
            }}
            aria-label="Nombre del grupo"
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
            disabled={saving || !name.trim() || name.trim() === currentName}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: c.brand }}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
