import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAppColors } from '~/hooks/useAppColors';
import { useAuth } from '~/hooks/useAuth';
import { useChatMessages } from '~/hooks/chat/useChatMessages';
import { useSendMessage } from '~/hooks/chat/useSendMessage';
import { useEditMessage } from '~/hooks/chat/useEditMessage';
import { useDeleteMessage } from '~/hooks/chat/useDeleteMessage';
import { useMarkAsRead } from '~/hooks/chat/useMarkAsRead';
import { ChatBubble } from '~/components/chat/ChatBubble';
import { ChatInput } from '~/components/chat/ChatInput';
import { MessageEditModal } from '~/components/chat/MessageEditModal';
import { Toast, type ToastState } from '~/components/ui/Toast';
import type { Message } from '@rassa/chat';

interface ChatLocationState {
  tipo?: 'privada' | 'grupal';
}

export function ChatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const c = useAppColors();
  const { user } = useAuth();
  const conversationId = Number(id);
  const tipo = (location.state as ChatLocationState | null)?.tipo;

  const { data, isLoading } = useChatMessages(conversationId);
  const sendMessage = useSendMessage(conversationId);
  const editMessage = useEditMessage(conversationId);
  const deleteMessage = useDeleteMessage(conversationId);
  const markAsRead = useMarkAsRead();

  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Mark unread messages as read on mount
  useEffect(() => {
    if (!data || !user) return;
    for (const page of data.pages) {
      for (const msg of page.results) {
        if (!msg.leido && msg.remitente !== user.id) {
          void markAsRead.mutate(msg.id);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.pages]);

  const messages = data?.pages.flatMap((p) => p.results).reverse() ?? [];

  const handleSend = (text: string) => {
    sendMessage.mutate(
      { conversacion: conversationId, contenido: text },
      {
        onError: () =>
          setToast({ message: 'Error al enviar mensaje', type: 'error' }),
      },
    );
  };

  const handleEdit = (message: Message) => {
    setEditingMessage(message);
  };

  const handleEditSave = (contenido: string) => {
    if (!editingMessage) return;
    editMessage.mutate(
      { messageId: editingMessage.id, contenido },
      {
        onSuccess: () => setEditingMessage(null),
        onError: () =>
          setToast({ message: 'Error al editar mensaje', type: 'error' }),
      },
    );
  };

  const handleDelete = (messageId: number) => {
    if (!window.confirm('¿Eliminar este mensaje?')) return;
    deleteMessage.mutate(messageId, {
      onError: () =>
        setToast({ message: 'Error al eliminar mensaje', type: 'error' }),
    });
  };

  return (
    <div className="flex h-full flex-col" style={{ background: c.bg }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3"
        style={{ borderBottom: `1px solid ${c.border}`, background: c.surface }}
      >
        <button
          type="button"
          onClick={() => user?.rol && navigate(`/${user.rol}/chat`)}
          className="cursor-pointer border-none bg-transparent text-sm"
          style={{ color: c.brand }}
          aria-label="Volver a conversaciones"
        >
          ← Volver
        </button>
        <div className="flex-1" />
        {tipo === 'grupal' && (
          <button
            type="button"
            onClick={() =>
              user?.rol && navigate(`/${user.rol}/chat/${id}/grupo`)
            }
            className="cursor-pointer border-none bg-transparent text-lg"
            style={{ color: c.muted }}
            aria-label="Detalles del grupo"
          >
            👥
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2"
              style={{ borderColor: c.border, borderTopColor: c.brand }}
            />
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="mb-3 text-4xl">✉️</span>
            <p className="text-sm" style={{ color: c.muted }}>
              No hay mensajes todavía
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={sendMessage.isPending} />

      {/* Edit modal */}
      {editingMessage && (
        <MessageEditModal
          message={editingMessage}
          onSave={handleEditSave}
          onClose={() => setEditingMessage(null)}
        />
      )}

      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
