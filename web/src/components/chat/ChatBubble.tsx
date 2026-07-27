import { useState } from 'react';
import { useAppColors } from '~/hooks/useAppColors';
import { useAuth } from '~/hooks/useAuth';
import { useCanModifyMessage } from '~/hooks/chat/useCanModifyMessage';
import type { Message } from '@rassa/chat';
import { formatTime } from '@rassa/chat';

interface ChatBubbleProps {
  message: Message;
  onEdit: (message: Message) => void;
  onDelete: (messageId: number) => void;
}

export function ChatBubble({
  message,
  onEdit,
  onDelete,
}: Readonly<ChatBubbleProps>) {
  const c = useAppColors();
  const { user } = useAuth();
  const { canEdit, canDelete } = useCanModifyMessage(message);
  const [showMenu, setShowMenu] = useState(false);

  const isOwn = user?.id === message.remitente;
  const isActive = message.activo !== false;

  if (!isActive) return null;

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`relative max-w-[75%] rounded-2xl px-4 py-2 ${
          isOwn ? 'rounded-br-md' : 'rounded-bl-md'
        }`}
        style={{
          background: isOwn ? c.brand : c.surface,
          color: isOwn ? '#fff' : c.fg,
        }}
      >
        {/* Sender name (others only) */}
        {!isOwn && (
          <div
            className="mb-1 text-xs font-semibold"
            style={{ color: c.muted }}
          >
            {message.remitente_nombre}
          </div>
        )}

        {/* Message content */}
        <div className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>
          {message.contenido}
          {message.editado && (
            <span className="ml-1 text-xs italic" style={{ opacity: 0.6 }}>
              (editado)
            </span>
          )}
        </div>

        {/* Timestamp + menu trigger */}
        <div
          className={`mt-1 flex items-center gap-2 ${
            isOwn ? 'justify-end' : 'justify-start'
          }`}
        >
          <span
            className="text-xs"
            style={{ opacity: 0.6, color: isOwn ? '#fff' : c.muted }}
          >
            {formatTime(message.creado_en)}
          </span>

          {/* Author menu: own + within window */}
          {isOwn && (canEdit || canDelete) && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="cursor-pointer border-none bg-transparent text-xs"
                style={{ color: isOwn ? '#fff' : c.muted }}
                aria-label="Opciones de mensaje"
              >
                ⋯
              </button>
              {showMenu && (
                <div
                  className="absolute bottom-full right-0 z-10 mb-1 min-w-[120px] overflow-hidden rounded-lg shadow-lg"
                  style={{
                    background: c.surface,
                    border: `1px solid ${c.border}`,
                  }}
                >
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        onEdit(message);
                        setShowMenu(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:opacity-80"
                      style={{ color: c.fg }}
                    >
                      Editar
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(message.id);
                        setShowMenu(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:opacity-80"
                      style={{ color: c.coral }}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
