import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppColors } from '~/hooks/useAppColors';
import { useAuth } from '~/hooks/useAuth';
import { useConversations } from '~/hooks/chat/useConversations';
import { ConversationItem } from '~/components/chat/ConversationItem';

type FiltroTipo = 'todos' | 'individual' | 'grupal' | 'familia';

const FILTROS: { label: string; value: FiltroTipo }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Individuales', value: 'individual' },
  { label: 'Grupales', value: 'grupal' },
  { label: 'Familia', value: 'familia' },
];

export function ChatListPage() {
  const navigate = useNavigate();
  const c = useAppColors();
  const { user } = useAuth();
  const { data, isLoading, error, refetch, isFetching } = useConversations();
  const [filtro, setFiltro] = useState<FiltroTipo>('todos');

  const conversations = data?.results ?? [];

  const filtered = conversations.filter((conv) => {
    if (filtro === 'todos') return true;
    if (filtro === 'individual') return conv.tipo === 'privada';
    if (filtro === 'grupal') return conv.tipo === 'grupal';
    if (filtro === 'familia') return conv.es_familia === true;
    return true;
  });

  // MAJOR #5 (#82): with existing data + a transient failure, keep showing the
  // list with a non-blocking banner instead of replacing the whole screen.
  const withBanner = !isLoading && error && filtered.length > 0;

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
        {user?.rol !== 'cliente' && (
          <button
            type="button"
            onClick={() => user?.rol && navigate(`/${user.rol}/chat/nuevo`)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: c.brand }}
            aria-label="Iniciar nuevo chat"
          >
            Nuevo chat
          </button>
        )}
      </div>

      {/* Filter toggles */}
      <div
        className="flex gap-2 px-5 py-3"
        style={{ borderBottom: `1px solid ${c.border}` }}
      >
        {FILTROS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFiltro(value)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: filtro === value ? c.brand : 'transparent',
              color: filtro === value ? '#fff' : c.muted,
              border: `1px solid ${filtro === value ? 'transparent' : c.border}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {withBanner && (
          <div
            role="alert"
            className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-lg border px-4 py-3"
            style={{ borderColor: c.coral, background: c.surface }}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: c.fg }}>
                Error al cargar conversaciones
              </p>
              <p className="text-xs" style={{ color: c.muted }}>
                Revisa tu conexión e intenta de nuevo
              </p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-opacity disabled:cursor-not-allowed"
              style={{ background: c.brand, opacity: isFetching ? 0.6 : 1 }}
              aria-label="Reintentar cargar conversaciones"
            >
              {isFetching ? 'Reintentando…' : 'Reintentar'}
            </button>
          </div>
        )}

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

        {!isLoading && error && !withBanner && (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="mb-3 text-4xl">⚠️</span>
            <p className="text-sm font-medium" style={{ color: c.fg }}>
              Error al cargar conversaciones
            </p>
            <p className="mt-1 text-sm" style={{ color: c.muted }}>
              Revisa tu conexión e intenta de nuevo
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: c.brand, opacity: isFetching ? 0.6 : 1 }}
              aria-label="Reintentar cargar conversaciones"
            >
              {isFetching ? 'Reintentando…' : 'Reintentar'}
            </button>
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="mb-3 text-4xl">💬</span>
            <p className="text-sm" style={{ color: c.muted }}>
              {filtro === 'todos'
                ? 'No tenés conversaciones aún'
                : `No tenés conversaciones ${filtro === 'individual' ? 'individuales' : filtro === 'familia' ? 'de familia' : 'grupales'} aún`}
            </p>
          </div>
        )}

        {!isLoading &&
          !error &&
          filtered.map((conv) => (
            <ConversationItem key={conv.id} conversation={conv} />
          ))}
      </div>
    </div>
  );
}
