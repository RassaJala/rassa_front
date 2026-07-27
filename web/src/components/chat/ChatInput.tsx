import { useState } from 'react';
import { useAppColors } from '~/hooks/useAppColors';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Readonly<ChatInputProps>) {
  const c = useAppColors();
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="flex items-center gap-2 px-4 py-3"
      style={{ borderTop: `1px solid ${c.border}`, background: c.surface }}
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribí un mensaje..."
        disabled={disabled}
        className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
        style={{
          borderColor: c.inputBorder,
          background: c.bg,
          color: c.fg,
        }}
        aria-label="Escribir mensaje"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: c.brand }}
        aria-label="Enviar mensaje"
      >
        Enviar
      </button>
    </div>
  );
}
