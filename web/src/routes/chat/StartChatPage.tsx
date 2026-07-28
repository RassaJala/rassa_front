import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppColors } from '~/hooks/useAppColors';
import { useAuth } from '~/hooks/useAuth';
import { useCreatePrivateConversation } from '~/hooks/chat/useCreatePrivateConversation';
import { useSearchUsers } from '~/hooks/chat/useSearchUsers';
import type { SearchUserResult } from '@rassa/chat';
import { Toast, type ToastState } from '~/components/ui/Toast';

export function StartChatPage() {
  const navigate = useNavigate();
  const c = useAppColors();
  const { user } = useAuth();
  const createConversation = useCreatePrivateConversation();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SearchUserResult | null>(null);
  const { results, loading } = useSearchUsers(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        listRef.current &&
        !listRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isSelfChat =
    selected && user?.id !== undefined && selected.id_usuario === user.id;
  const showDropdown = query.trim().length >= 3 && !selected;

  const handleSubmit = () => {
    if (!selected || isSelfChat) return;
    createConversation.mutate(
      { fk_usuario: selected.id_usuario },
      {
        onError: () =>
          setToast({ message: 'Error al crear conversación', type: 'error' }),
      },
    );
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
        <h1 className="text-base font-bold" style={{ color: c.fg }}>
          Nuevo chat
        </h1>
      </div>

      {/* Form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <span className="mb-3 block text-center text-4xl">💬</span>
          <h2
            className="mb-2 text-center text-lg font-semibold"
            style={{ color: c.fg }}
          >
            Iniciar conversación privada
          </h2>
          <p className="mb-6 text-center text-sm" style={{ color: c.muted }}>
            Buscá un usuario por nombre o correo
          </p>

          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: c.fg }}
          >
            Usuario
          </label>

          {selected ? (
            <div
              className="mb-4 flex items-center justify-between rounded-lg border px-3 py-2"
              style={{
                borderColor: c.inputBorder,
                background: c.bg,
              }}
            >
              <div>
                <span className="text-sm font-medium" style={{ color: c.fg }}>
                  {selected.nombre_completo}
                </span>
                <span className="ml-2 text-xs" style={{ color: c.muted }}>
                  {selected.correo}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setQuery('');
                }}
                className="cursor-pointer border-none bg-transparent text-sm"
                style={{ color: c.coral }}
                aria-label="Quitar selección"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="relative mb-4">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                }}
                placeholder="Buscar por nombre o correo..."
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{
                  borderColor: c.inputBorder,
                  background: c.surface,
                  color: c.fg,
                }}
                aria-label="Buscar usuario"
              />
              {showDropdown && (
                <div
                  ref={listRef}
                  className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg shadow-lg"
                  style={{
                    background: c.surface,
                    border: `1px solid ${c.border}`,
                  }}
                >
                  {loading && (
                    <div
                      className="px-3 py-2 text-sm"
                      style={{ color: c.muted }}
                    >
                      Buscando…
                    </div>
                  )}
                  {!loading && results.length === 0 && (
                    <div
                      className="px-3 py-2 text-sm"
                      style={{ color: c.muted }}
                    >
                      Sin resultados
                    </div>
                  )}
                  {results.map((userResult) => (
                    <button
                      key={userResult.id_usuario}
                      type="button"
                      onClick={() => setSelected(userResult)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:opacity-80"
                      style={{ color: c.fg }}
                    >
                      <span className="text-sm font-medium">
                        {userResult.nombre_completo}
                      </span>
                      <span className="text-xs" style={{ color: c.muted }}>
                        {userResult.correo} · {userResult.rol}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {isSelfChat && (
            <p className="mb-4 text-sm" style={{ color: c.coral }}>
              No puedes iniciar un chat contigo mismo
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={createConversation.isPending || !selected || isSelfChat}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: c.brand }}
          >
            {createConversation.isPending ? 'Creando…' : 'Iniciar chat'}
          </button>
        </div>
      </div>

      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
