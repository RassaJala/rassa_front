import type { AppColors } from "../hooks/useAppColors";
import type { Publicacion, PublicacionEstado } from "../services/publications";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";

// ── Shared types & helpers ──────────────────────────────────

const statusBadge: Record<
  PublicacionEstado,
  { variant: "default" | "success" | "warning" | "error"; label: string }
> = {
  borrador: { variant: "warning", label: "Borrador" },
  publicado: { variant: "success", label: "Publicada" },
  cerrado: { variant: "default", label: "Cerrada" },
  cancelado: { variant: "error", label: "Cancelada" },
};

export function getStatusBadge(estado: PublicacionEstado) {
  return statusBadge[estado] ?? { variant: "default" as const, label: estado };
}

export function productCountLabel(count: number): string {
  return `${count} producto${count !== 1 ? "s" : ""}`;
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
  variant = "icon",
}: {
  pub: Publicacion;
  isMutating: boolean;
  onEdit: (id: number) => void;
  onPublish: (id: number) => void;
  onDelete: (id: number) => void;
  onClose: (id: number) => void;
  colors: AppColors;
  variant?: "icon" | "button";
}) {
  if (variant === "button") {
    return (
      <div className="flex gap-1.5">
        {pub.estado === "borrador" && (
          <>
            <Button
              variant="ghost"
              className="!px-3 !py-1.5 !text-[13px]"
              onClick={() => onEdit(pub.id_publicacion)}
            >
              Editar
            </Button>
            <Button
              variant="secondary"
              className="!px-3 !py-1.5 !text-[13px]"
              disabled={isMutating}
              onClick={() => void onPublish(pub.id_publicacion)}
            >
              Publicar
            </Button>
            <Button
              variant="ghost"
              className="!px-3 !py-1.5 !text-[13px]"
              disabled={isMutating}
              onClick={() => void onDelete(pub.id_publicacion)}
            >
              Eliminar
            </Button>
          </>
        )}
        {pub.estado === "publicado" && (
          <Button
            variant="secondary"
            className="!px-3 !py-1.5 !text-[13px]"
            disabled={isMutating}
            onClick={() => void onClose(pub.id_publicacion)}
          >
            Cerrar
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      {pub.estado === "borrador" && (
        <>
          <button
            onClick={() => onEdit(pub.id_publicacion)}
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
            onClick={() => void onPublish(pub.id_publicacion)}
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
            onClick={() => void onDelete(pub.id_publicacion)}
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
      )}
      {pub.estado === "publicado" && (
        <button
          onClick={() => void onClose(pub.id_publicacion)}
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
      )}
    </div>
  );
}
