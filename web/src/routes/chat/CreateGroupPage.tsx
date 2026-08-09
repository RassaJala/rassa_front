import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SearchUser } from '@rassa/chat';
import { useAppColors } from '~/hooks/useAppColors';
import { useAuth } from '~/hooks/useAuth';
import { useCreateGroup } from '~/hooks/chat/useCreateGroup';
import { UserSearchSelect } from '~/components/chat/UserSearchSelect';
import { Toast, type ToastState } from '~/components/ui/Toast';

export function CreateGroupPage() {
  const navigate = useNavigate();
  const c = useAppColors();
  const { user } = useAuth();
  const createGroup = useCreateGroup();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<SearchUser[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);

  const isValid = name.trim().length > 0 && selected.length > 0;

  const handleToggle = (user: SearchUser) => {
    setSelected((prev) =>
      prev.some((s) => s.idUsuario === user.idUsuario)
        ? prev.filter((s) => s.idUsuario !== user.idUsuario)
        : [...prev, user],
    );
  };

  const handleSubmit = () => {
    if (!isValid) return;
    createGroup.mutate(
      { nombre: name.trim(), fk_usuarios: selected.map((u) => u.idUsuario) },
      {
        onError: () =>
          setToast({ message: 'Error al crear grupo', type: 'error' }),
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
          Nuevo grupo
        </h1>
      </div>

      {/* Form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <span className="mb-3 block text-center text-4xl">👥</span>
          <h2
            className="mb-2 text-center text-lg font-semibold"
            style={{ color: c.fg }}
          >
            Crear grupo de conversación
          </h2>
          <p className="mb-6 text-center text-sm" style={{ color: c.muted }}>
            Buscá usuarios por nombre o correo para agregarlos
          </p>

          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: c.fg }}
          >
            Nombre del grupo
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Equipo de ventas"
            className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: c.inputBorder,
              background: c.surface,
              color: c.fg,
            }}
            aria-label="Nombre del grupo"
          />

          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: c.fg }}
          >
            Agregar integrantes
          </label>
          <UserSearchSelect selected={selected} onToggle={handleToggle} />

          <p className="mb-6 mt-2 text-xs" style={{ color: c.muted }}>
            {selected.length > 0
              ? `${selected.length} integrante(s) seleccionado(s)`
              : 'Buscá usuarios por nombre o correo para agregarlos al grupo.'}
          </p>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || createGroup.isPending}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: c.brand }}
          >
            {createGroup.isPending ? 'Creando…' : 'Crear grupo'}
          </button>
        </div>
      </div>

      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
