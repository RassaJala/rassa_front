import { useNavigate } from 'react-router-dom';
import { useAppColors } from '~/hooks/useAppColors';
import { useAuth } from '~/hooks/useAuth';
import { useConversations } from '~/hooks/chat/useConversations';
import { ConversationItem } from '~/components/chat/ConversationItem';
import { Toast, type ToastState } from '~/components/ui/Toast';
import { useEffect, useState } from 'react';

export function ChatListPage() {
  const navigate = useNavigate();
  const c = useAppColors();
  const { user } = useAuth();
  const { data, isLoading, error } = useConversations();
  const [toast, setToast] = useState<ToastState | null>(null);

  const conversations = data?.results ?? [];

  useEffect(() => {
    if (error) {
      setToast({ message: 'Error al cargar conversaciones', type: 'error' });
    } else {
      setToast(null);
    }
  }, [error]);

  return (
    <div className="flex h-full flex-col" style={{ background: c.bg }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: `1px solid ${c.border}`, background: c.surface }}
      >
        <h1 className="text-lg font-bold" style={{ color: c.fg }}>
          Conversaciones
        </h1>
        <button
          type="button"
          onClick={() => user?.rol && navigate(`/${user.rol}/chat/nuevo`)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: c.brand }}
          aria-label="Iniciar nuevo chat"
        >
          Nuevo chat
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div
              role="status"
              aria-label="Cargando conversaciones"
              className="h-6 w-6 animate-spin rounded-full border-2"
              style={{ borderColor: c.border, borderTopColor: c.brand }}
            />
          </div>
        )}

        {!isLoading && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="mb-3 text-4xl">💬</span>
            <p className="text-sm" style={{ color: c.muted }}>
              No tenés conversaciones aún
            </p>
          </div>
        )}

        {!isLoading &&
          conversations.map((conv) => (
            <ConversationItem key={conv.id} conversation={conv} />
          ))}
      </div>

      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
