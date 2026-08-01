import { useRef, useState, useEffect } from 'react';
import type { SearchUser } from '@rassa/chat';
import { useAppColors } from '~/hooks/useAppColors';
import { useSearchUsers } from '~/hooks/chat/useSearchUsers';

interface UserSearchSelectProps {
  selected: SearchUser[];
  onToggle: (user: SearchUser) => void;
  placeholder?: string;
}

export function UserSearchSelect({
  selected,
  onToggle,
  placeholder = 'Buscar por nombre o correo...',
}: Readonly<UserSearchSelectProps>) {
  const c = useAppColors();
  const [query, setQuery] = useState('');
  const { results, loading, error } = useSearchUsers(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  const filtered = results.filter(
    (user) => !selected.some((s) => s.idUsuario === user.idUsuario),
  );
  const showDropdown = query.trim().length >= 3;

  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selected.map((user) => (
            <span
              key={user.idUsuario}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm"
              style={{
                borderColor: c.inputBorder,
                background: c.accentBg,
                color: c.fg,
              }}
            >
              {user.nombreCompleto}
              <button
                type="button"
                onClick={() => onToggle(user)}
                className="cursor-pointer border-none bg-transparent text-sm"
                style={{ color: c.muted }}
                aria-label={`Quitar ${user.nombreCompleto}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
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
              <div className="px-3 py-2 text-sm" style={{ color: c.muted }}>
                Buscando…
              </div>
            )}
            {!loading && error && (
              <div className="px-3 py-2 text-sm" style={{ color: c.coral }}>
                {error}
              </div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="px-3 py-2 text-sm" style={{ color: c.muted }}>
                Sin resultados
              </div>
            )}
            {filtered.map((user) => (
              <button
                key={user.idUsuario}
                type="button"
                onClick={() => {
                  onToggle(user);
                  setQuery('');
                }}
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:opacity-80"
                style={{ color: c.fg }}
                aria-label={`Seleccionar ${user.nombreCompleto}`}
              >
                <span className="text-sm font-medium">
                  {user.nombreCompleto}
                </span>
                <span className="text-xs" style={{ color: c.muted }}>
                  {user.correo} · {user.rol}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
