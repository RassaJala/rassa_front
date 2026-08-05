import { useNavigate } from 'react-router-dom';
import { useAppColors } from '~/hooks/useAppColors';
import { useAuth } from '~/hooks/useAuth';
import type { Conversation } from '@rassa/chat';
import { formatConversationTime } from '@rassa/chat';

interface ConversationItemProps {
  conversation: Conversation;
}

export function ConversationItem({
  conversation,
}: Readonly<ConversationItemProps>) {
  const navigate = useNavigate();
  const c = useAppColors();
  const { user } = useAuth();

  const displayName =
    conversation.tipo === 'grupal'
      ? conversation.nombre || 'Grupo'
      : conversation.participante_nombre || 'Sin nombre';

  if (!user?.rol) {
    return (
      <div
        className="flex w-full animate-pulse items-center gap-3 px-4 py-3"
        style={{ borderBottom: `1px solid ${c.border}` }}
      >
        <div
          className="h-10 w-10 rounded-full"
          style={{ background: c.border }}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div
              className="h-3 w-32 rounded"
              style={{ background: c.border }}
            />
            <div
              className="h-3 w-12 rounded"
              style={{ background: c.border }}
            />
          </div>
          <div className="h-3 w-48 rounded" style={{ background: c.border }} />
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() =>
        navigate(`/${user.rol}/chat/${conversation.id}`, {
          state: {
            tipo: conversation.tipo,
            es_familia: conversation.es_familia,
            nombre_override: conversation.nombre_override,
          },
        })
      }
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:opacity-80"
      style={{
        borderBottom: `1px solid ${c.border}`,
        background: 'transparent',
      }}
    >
      {/* Avatar placeholder */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ background: c.brand }}
      >
        {displayName.slice(0, 2).toUpperCase()}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className="truncate text-sm font-semibold"
            style={{ color: c.fg }}
          >
            {conversation.es_familia ? '🏠 ' : ''}
            {displayName}
          </span>
          <span className="shrink-0 text-xs" style={{ color: c.muted }}>
            {formatConversationTime(conversation.ultimo_mensaje_fecha)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm" style={{ color: c.muted }}>
            {conversation.ultimo_mensaje || 'Sin mensajes'}
          </span>
          {conversation.no_leidos > 0 && (
            <span
              className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-xs font-bold text-white"
              style={{ background: c.coral }}
            >
              {conversation.no_leidos}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
