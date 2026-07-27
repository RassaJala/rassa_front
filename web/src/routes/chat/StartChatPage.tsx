import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppColors } from '~/hooks/useAppColors';
import { useAuth } from '~/hooks/useAuth';
import { useCreatePrivateConversation } from '~/hooks/chat/useCreatePrivateConversation';
import { Toast, type ToastState } from '~/components/ui/Toast';

export function StartChatPage() {
  const navigate = useNavigate();
  const c = useAppColors();
  const { user } = useAuth();
  const createConversation = useCreatePrivateConversation();
  const [userId, setUserId] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);

  const enteredId = Number(userId);
  const isSelfChat =
    user?.id !== undefined && enteredId === user.id && userId !== '';
  const isValidId = userId !== '' && !Number.isNaN(enteredId) && enteredId > 0;

  const handleSubmit = () => {
    if (!isValidId || isSelfChat) return;
    createConversation.mutate(
      { fk_usuario: enteredId },
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
            Ingresá el ID del usuario con quien deseás chatear
          </p>

          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: c.fg }}
          >
            ID del usuario
          </label>
          <input
            type="number"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Ej: 42"
            min={1}
            className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: c.inputBorder,
              background: c.surface,
              color: c.fg,
            }}
            aria-label="ID del usuario"
          />

          {isSelfChat && (
            <p className="mb-4 text-sm" style={{ color: c.coral }}>
              No puedes iniciar un chat contigo mismo
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={createConversation.isPending || !isValidId || isSelfChat}
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
