import { useRef, useState } from 'react';
import { useAppColors } from '~/hooks/useAppColors';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Readonly<ChatInputProps>) {
  const c = useAppColors();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="flex items-end gap-2 px-4 py-3"
      style={{ borderTop: `1px solid ${c.border}`, background: c.surface }}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          autoResize();
        }}
        onKeyDown={handleKeyDown}
        placeholder="Escribí un mensaje..."
        disabled={disabled}
        className="max-h-32 flex-1 resize-none rounded-lg border px-3 py-2 text-sm outline-none"
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
