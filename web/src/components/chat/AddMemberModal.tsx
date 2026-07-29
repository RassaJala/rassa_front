import { useState, useRef, useEffect } from 'react';
import { useAppColors } from '~/hooks/useAppColors';
import { useSearchUsers } from '~/hooks/chat/useSearchUsers';
import type { SearchUserResult } from '@rassa/chat';
import { Toast, type ToastState } from '~/components/ui/Toast';

interface AddMemberModalProps {
  onSave: (userId: number) => void;
  onClose: () => void;
  saving?: boolean;
}

export function AddMemberModal({
  onSave,
  onClose,
  saving,
}: Readonly<AddMemberModalProps>) {
  const c = useAppColors();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SearchUserResult | null>(null);
  const { results, loading, error } = useSearchUsers(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  const handleSave = () => {
    if (!selected) return;
    onSave(selected.id_usuario);
  };

  const showDropdown = query.trim().length >= 3 && !selected;

  return (
    <dialog
      open
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-0"
    >
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 cursor-default border-0 bg-transparent p-0"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      <div
        className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-2xl"
        style={{
          background: c.surface,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${c.border}` }}
        >
          <h3 className="text-base font-semibold" style={{ color: c.fg }}>
            Agregar miembro
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer border-none bg-transparent text-lg"
            style={{ color: c.muted }}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: c.fg }}
          >
            Buscar usuario
          </label>
          {selected ? (
            <div
              className="flex items-center justify-between rounded-lg border px-3 py-2"
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
            <div className="relative">
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
                  background: c.bg,
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
                  {!loading && error && (
                    <div
                      className="px-3 py-2 text-sm"
                      style={{ color: c.coral }}
                    >
                      {error}
                    </div>
                  )}
                  {!loading && !error && results.length === 0 && (
                    <div
                      className="px-3 py-2 text-sm"
                      style={{ color: c.muted }}
                    >
                      Sin resultados
                    </div>
                  )}
                  {results.map((user) => (
                    <button
                      key={user.id_usuario}
                      type="button"
                      onClick={() => setSelected(user)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:opacity-80"
                      style={{ color: c.fg }}
                    >
                      <span className="text-sm font-medium">
                        {user.nombre_completo}
                      </span>
                      <span className="text-xs" style={{ color: c.muted }}>
                        {user.correo} · {user.rol}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2.5 px-5 py-4"
          style={{ borderTop: `1px solid ${c.border}` }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
            style={{
              borderColor: c.coral,
              color: c.coral,
              background: 'transparent',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !selected}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: c.brand }}
          >
            {saving ? 'Agregando…' : 'Agregar'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
