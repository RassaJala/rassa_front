import type { AppColors } from '../hooks/useAppColors';
import type { Publicacion, PublicacionEstado } from '../services/publications';
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

interface ActionDef {
  label: string;
  iconTitle?: string;
  disabled?: boolean;
  onClick: () => void;
  style: (colors: AppColors) => {
    buttonVariant?: 'ghost' | 'secondary' | 'primary';
    iconStyle?: React.CSSProperties;
  };
}

function getActions({
  estado,
  pubId,
  isMutating,
  onEdit,
  onPublish,
  onDelete,
  onClose,
}: PubActionContext): ActionDef[] {
  if (estado === 'borrador') {
    return [
      {
        label: 'Editar',
        iconTitle: 'Editar',
        onClick: () => onEdit(pubId),
        style: (c) => ({
          buttonVariant: 'ghost',
          iconStyle: {
            border: `1px solid ${c.border}`,
            background: c.surface,
            color: c.fg,
          },
        }),
      },
      {
        label: 'Publicar',
        iconTitle: 'Publicar',
        disabled: isMutating,
        onClick: () => void onPublish(pubId),
        style: (c) => ({
          buttonVariant: 'secondary',
          iconStyle: {
            border: `1px solid ${c.brand}`,
            background: c.accentBg,
            color: c.brand,
          },
        }),
      },
      {
        label: 'Eliminar',
        iconTitle: 'Eliminar',
        disabled: isMutating,
        onClick: () => void onDelete(pubId),
        style: (c) => ({
          buttonVariant: 'ghost',
          iconStyle: {
            border: `1px solid ${c.border}`,
            background: c.surface,
            color: c.coral,
          },
        }),
      },
    ];
  }
  if (estado === 'publicado') {
    return [
      {
        label: 'Cerrar',
        iconTitle: 'Cerrar',
        disabled: isMutating,
        onClick: () => void onClose(pubId),
        style: (c) => ({
          buttonVariant: 'secondary',
          iconStyle: {
            border: `1px solid ${c.coral}`,
            background: c.accentBg,
            color: c.coral,
          },
        }),
      },
    ];
  }
  return [];
}

const ICON_WRAPPER_CLASS =
  'grid h-9 w-9 cursor-pointer place-items-center rounded-[10px] text-[15px]';

function renderAction(
  action: ActionDef,
  variant: 'button' | 'icon',
  colors: AppColors,
): React.JSX.Element {
  const s = action.style(colors);
  if (variant === 'button') {
    return (
      <Button
        key={action.label}
        variant={s.buttonVariant ?? 'ghost'}
        className="!px-3 !py-1.5 !text-[13px]"
        disabled={action.disabled}
        onClick={action.onClick}
      >
        {action.label}
      </Button>
    );
  }
  return (
    <button
      key={action.label}
      onClick={action.onClick}
      disabled={action.disabled}
      title={action.iconTitle}
      className={ICON_WRAPPER_CLASS}
      style={s.iconStyle as React.CSSProperties | undefined}
    >
      {action.label}
    </button>
  );
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
  const actions = getActions({
    estado: pub.estado,
    pubId: pub.id_publicacion,
    isMutating,
    onEdit,
    onPublish,
    onDelete,
    onClose,
    colors,
  });
  return (
    <div className="flex gap-1.5">
      {actions.map((a) => renderAction(a, variant, colors))}
    </div>
  );
}
