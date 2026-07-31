import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAppColors } from '~/hooks/useAppColors';
import { useAuth } from '~/hooks/useAuth';
import { useChatMessages } from '~/hooks/chat/useChatMessages';
import { useConversations } from '~/hooks/chat/useConversations';
import { useSendMessage } from '~/hooks/chat/useSendMessage';
import { useEditMessage } from '~/hooks/chat/useEditMessage';
import { useDeleteMessage } from '~/hooks/chat/useDeleteMessage';
import { useSendMessageWithMedia } from '~/hooks/chat/useSendMessageWithMedia';
import { useMarkAsRead } from '~/hooks/chat/useMarkAsRead';
import { ChatBubble } from '~/components/chat/ChatBubble';
import { ChatInput } from '~/components/chat/ChatInput';
import { MessageEditModal } from '~/components/chat/MessageEditModal';
import { ConfirmDialog } from '~/components/ui/ConfirmDialog';
import { Toast, type ToastState } from '~/components/ui/Toast';
import type { AttachmentType, Message } from '@rassa/chat';

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

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useChatMessages(conversationId);
  const sendMessage = useSendMessage(conversationId);
  const sendMedia = useSendMessageWithMedia(conversationId);
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

  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const prevPageCountRef = useRef(0);
  const initialRenderRef = useRef(true);

  const messages = [...(data?.pages.flatMap((p) => p.results) ?? [])].reverse();
  const realCountRef = useRef(0);

  const realMessages = messages.filter((m) => typeof m.id === 'number');
  realCountRef.current = realMessages.length;

  useEffect(() => {
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      endRef.current?.scrollIntoView({ behavior: 'auto' });
    } else {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [realCountRef.current]);

  useEffect(() => {
    const container = containerRef.current;
    const pageCount = data?.pages.length ?? 0;
    if (
      !container ||
      !prevScrollHeightRef.current ||
      prevPageCountRef.current === pageCount
    )
      return;
    const newScrollHeight = container.scrollHeight;
    container.scrollTop = newScrollHeight - prevScrollHeightRef.current;
    prevPageCountRef.current = pageCount;
    prevScrollHeightRef.current = 0;
  }, [data?.pages.length]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || !hasNextPage || isFetchingNextPage) return;
    if (container.scrollTop < 50) {
      prevScrollHeightRef.current = container.scrollHeight;
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSend = (text: string) => {
    sendMessage.mutate(
      { conversacion: conversationId, contenido: text },
      {
        onError: () =>
          setToast({ message: 'Error al enviar mensaje', type: 'error' }),
      },
    );
  };

  const handleSendMedia = (
    file: File,
    tipo: AttachmentType,
    contenido?: string,
  ) => {
    sendMedia.mutate(
      {
        conversacion: conversationId,
        tipo_documento: tipo,
        documento: file,
        contenido,
        remitente: user?.id ?? 0,
        remitente_nombre: user?.nombre ?? 'Tú',
      },
      {
        onError: () =>
          setToast({ message: 'Error al enviar archivo', type: 'error' }),
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
    <div
      className="flex flex-col"
      style={{ position: 'absolute', inset: 0, background: c.bg }}
    >
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
      <div
        ref={containerRef}
        className="chat-scroll flex-1 overflow-y-auto px-4 py-4"
        style={
          {
            background: c.bg,
            '--chat-scroll-thumb': c.isDark
              ? 'rgba(157,168,157,0.45)'
              : 'rgba(0,0,0,0.25)',
            '--chat-scroll-thumb-hover': c.isDark
              ? 'rgba(157,168,157,0.65)'
              : 'rgba(0,0,0,0.4)',
          } as CSSProperties
        }
        onScroll={handleScroll}
      >
        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <div
              className="h-4 w-4 animate-spin rounded-full border-2"
              style={{ borderColor: c.border, borderTopColor: c.brand }}
            />
          </div>
        )}

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
      <ChatInput
        onSend={handleSend}
        onSendMedia={handleSendMedia}
        disabled={sendMessage.isPending || sendMedia.isPending}
      />

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
