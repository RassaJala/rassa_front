import { useState, useEffect } from 'react';
import { useAppColors } from '~/hooks/useAppColors';
import type { Message } from '@rassa/chat';

interface MessageEditModalProps {
  message: Message;
  onSave: (contenido: string) => void;
  onClose: () => void;
}

export function MessageEditModal({
  message,
  onSave,
  onClose,
}: Readonly<MessageEditModalProps>) {
  const c = useAppColors();
  const [text, setText] = useState(message.contenido);

  useEffect(() => {
    setText(message.contenido);
  }, [message.contenido]);

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed || trimmed === message.contenido) return;
    onSave(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Cerrar modal"
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
            Editar mensaje
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
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            rows={3}
            className="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: c.inputBorder,
              background: c.bg,
              color: c.fg,
            }}
            aria-label="Contenido del mensaje"
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
            disabled={!text.trim() || text.trim() === message.contenido}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: c.brand }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
