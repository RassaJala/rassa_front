import type { AppColors } from '../hooks/useAppColors';
import type { Publicacion, PublicacionEstado } from '../services/publications';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

// ── Shared types & helpers ──────────────────────────────────

export interface PubActionContext {
  estado: PublicacionEstado;
  pubId: number;
  isMutating: boolean;
  onEdit: (id: number) => void;
  onPublish: (id: number) => void;
  onDelete: (id: number) => void;
  onClose: (id: number) => void;
  colors: AppColors;
}

const statusBadge: Record<
  PublicacionEstado,
  { variant: 'default' | 'success' | 'warning' | 'error'; label: string }
> = {
  borrador: { variant: 'warning', label: 'Borrador' },
  publicado: { variant: 'success', label: 'Publicada' },
  cerrado: { variant: 'default', label: 'Cerrada' },
  cancelado: { variant: 'error', label: 'Cancelada' },
};

export function getStatusBadge(estado: PublicacionEstado) {
  return statusBadge[estado] ?? { variant: 'default' as const, label: estado };
}

export function productCountLabel(count: number): string {
  return `${count} producto${count !== 1 ? 's' : ''}`;
}

function renderActionsForEstado(
  {
    estado,
    pubId,
    isMutating,
    onEdit,
    onPublish,
    onDelete,
    onClose,
    colors,
  }: PubActionContext,
  variant: 'button' | 'icon',
): JSX.Element | null {
  if (estado === 'borrador') {
    if (variant === 'button') {
      return (
        <>
          <Button
            variant="ghost"
            className="!px-3 !py-1.5 !text-[13px]"
            onClick={() => onEdit(pubId)}
          >
            Editar
          </Button>
          <Button
            variant="secondary"
            className="!px-3 !py-1.5 !text-[13px]"
            disabled={isMutating}
            onClick={() => void onPublish(pubId)}
          >
            Publicar
          </Button>
          <Button
            variant="ghost"
            className="!px-3 !py-1.5 !text-[13px]"
            disabled={isMutating}
            onClick={() => void onDelete(pubId)}
          >
            Eliminar
          </Button>
        </>
      );
    }
    return (
      <>
        <button
          onClick={() => onEdit(pubId)}
          title="Editar"
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-[10px] text-[15px]"
          style={{
            border: `1px solid ${colors.border}`,
            background: colors.surface,
            color: colors.fg,
          }}
        >
          Editar
        </button>
        <button
          onClick={() => void onPublish(pubId)}
          disabled={isMutating}
          title="Publicar"
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-[10px] text-[15px]"
          style={{
            border: `1px solid ${colors.brand}`,
            background: colors.accentBg,
            color: colors.brand,
          }}
        >
          Publicar
        </button>
        <button
          onClick={() => void onDelete(pubId)}
          disabled={isMutating}
          title="Eliminar"
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-[10px] text-[15px]"
          style={{
            border: `1px solid ${colors.border}`,
            background: colors.surface,
            color: colors.coral,
          }}
        >
          Eliminar
        </button>
      </>
    );
  }
  if (estado === 'publicado') {
    if (variant === 'button') {
      return (
        <Button
          variant="secondary"
          className="!px-3 !py-1.5 !text-[13px]"
          disabled={isMutating}
          onClick={() => void onClose(pubId)}
        >
          Cerrar
        </Button>
      );
    }
    return (
      <button
        onClick={() => void onClose(pubId)}
        disabled={isMutating}
        title="Cerrar"
        className="grid h-9 w-9 cursor-pointer place-items-center rounded-[10px] text-[15px]"
        style={{
          border: `1px solid ${colors.coral}`,
          background: colors.accentBg,
          color: colors.coral,
        }}
      >
        Cerrar
      </button>
    );
  }
  return null;
}

// ── PublicationActions ──────────────────────────────────────

export function PublicationActions({
  pub,
  isMutating,
  onEdit,
  onPublish,
  onDelete,
  onClose,
  colors,
  variant = 'icon',
}: {
  pub: Publicacion;
  isMutating: boolean;
  onEdit: (id: number) => void;
  onPublish: (id: number) => void;
  onDelete: (id: number) => void;
  onClose: (id: number) => void;
  colors: AppColors;
  variant?: 'icon' | 'button';
}) {
  return (
    <div className="flex gap-1.5">
      {renderActionsForEstado(
        {
          estado: pub.estado,
          pubId: pub.id_publicacion,
          isMutating,
          onEdit,
          onPublish,
          onDelete,
          onClose,
          colors,
        },
        variant,
      )}
    </div>
  );
}
