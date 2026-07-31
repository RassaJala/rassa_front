import { useRef, useState } from 'react';
import { useAppColors } from '~/hooks/useAppColors';
import type { AttachmentType } from '@rassa/chat';
import { ATTACHMENT_TYPES } from '@rassa/chat';

interface ChatInputProps {
  onSend: (text: string) => void;
  onSendMedia?: (file: File, tipo: AttachmentType, contenido?: string) => void;
  disabled?: boolean;
}

function detectAttachmentType(file: File): AttachmentType {
  if (file.type.startsWith('image/')) return ATTACHMENT_TYPES.IMAGEN;
  if (file.type.startsWith('audio/')) return ATTACHMENT_TYPES.AUDIO;
  if (file.type.startsWith('video/')) return ATTACHMENT_TYPES.VIDEO;
  return ATTACHMENT_TYPES.IMAGEN;
}

const typeLabel: Record<AttachmentType, string> = {
  imagen: 'Imagen',
  audio: 'Audio',
  video: 'Video',
};

export function ChatInput({
  onSend,
  onSendMedia,
  disabled,
}: Readonly<ChatInputProps>) {
  const c = useAppColors();
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  };

  const handleSend = () => {
    if (selectedFile && onSendMedia) {
      const trimmed = text.trim();
      onSendMedia(selectedFile, detectAttachmentType(selectedFile), trimmed || undefined);
      setSelectedFile(null);
      setText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canSend = selectedFile || text.trim();

  return (
    <div
      className="flex flex-col gap-2 px-4 py-3"
      style={{ borderTop: `1px solid ${c.border}`, background: c.surface }}
    >
      {selectedFile && (
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
          style={{ background: c.bg, border: `1px solid ${c.border}` }}
        >
          <span style={{ color: c.muted }}>
            {selectedFile.name}
          </span>
          <span
            className="rounded px-1.5 py-0.5 text-xs font-medium text-white"
            style={{ background: c.brand }}
          >
            {typeLabel[detectAttachmentType(selectedFile)]}
          </span>
          <button
            type="button"
            onClick={removeFile}
            className="ml-auto cursor-pointer border-none bg-transparent text-sm"
            style={{ color: c.coral }}
            aria-label="Quitar archivo"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {onSendMedia && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="mb-0.5 cursor-pointer border-none bg-transparent p-1 text-lg disabled:cursor-not-allowed disabled:opacity-50"
              style={{ color: c.muted }}
              aria-label="Adjuntar archivo"
            >
              📎
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,audio/*,video/*"
              className="hidden"
              onChange={handleFileChange}
              aria-hidden="true"
            />
          </>
        )}
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
          disabled={disabled || !canSend}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: c.brand }}
          aria-label="Enviar mensaje"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
