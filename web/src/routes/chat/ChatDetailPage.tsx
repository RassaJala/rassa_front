import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAppColors } from '~/hooks/useAppColors';
import { useAuth } from '~/hooks/useAuth';
import { useChatMessages } from '~/hooks/chat/useChatMessages';
import { useConversations } from '~/hooks/chat/useConversations';
import { useSendMessage } from '~/hooks/chat/useSendMessage';
import { useEditMessage } from '~/hooks/chat/useEditMessage';
import { useDeleteMessage } from '~/hooks/chat/useDeleteMessage';
import { useMarkAsRead } from '~/hooks/chat/useMarkAsRead';
import { ChatBubble } from '~/components/chat/ChatBubble';
import { ChatInput } from '~/components/chat/ChatInput';
import { MessageEditModal } from '~/components/chat/MessageEditModal';
import { ConfirmDialog } from '~/components/ui/ConfirmDialog';
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
  const { data: convData } = useConversations();
  const currentConv = convData?.results?.find((c) => c.id === conversationId);
  const tipo =
    currentConv?.tipo ?? (location.state as ChatLocationState | null)?.tipo;

  const { data, isLoading } = useChatMessages(conversationId);
  const sendMessage = useSendMessage(conversationId);
  const editMessage = useEditMessage(conversationId);
  const deleteMessage = useDeleteMessage(conversationId);
  const markAsRead = useMarkAsRead();

  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    const timer = setTimeout(() => {
      markAsRead.mutate(conversationId);
    }, 2000);
    return () => clearTimeout(timer);
  }, [conversationId]);

  const endRef = useRef<HTMLDivElement>(null);
  const messages = [...(data?.pages.flatMap((p) => p.results) ?? [])].reverse();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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
    setConfirmDeleteId(messageId);
  };

  const handleDeleteConfirm = () => {
    if (confirmDeleteId == null) return;
    deleteMessage.mutate(confirmDeleteId, {
      onError: () =>
        setToast({ message: 'Error al eliminar mensaje', type: 'error' }),
    });
    setConfirmDeleteId(null);
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
        <div ref={endRef} />
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

      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Eliminar mensaje"
        message="¿Eliminar este mensaje?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
