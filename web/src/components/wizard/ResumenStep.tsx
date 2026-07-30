import type { AppColors } from '../../hooks/useAppColors';
import type { WizardItemDraft } from '../../utils/publicationWizard';
import { formatDate } from '../../utils/publicationWizard';
import { mediaUrl } from '../../utils/mediaUrl';
import { hideBrokenImage } from '../../utils/imageHelpers';
import { productCountLabel } from '../PublicationActions';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';

interface ResumenStepProps {
  weekNumber: number;
  nextMonday: Date;
  items: WizardItemDraft[];
  unidades: Array<{ id_unidad: number; tipo: string }>;
  colors: AppColors;
}

export function ResumenStep({
  weekNumber,
  nextMonday,
  items,
  unidades,
  colors,
}: ResumenStepProps) {
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold" style={{ color: colors.fg }}>
        Resumen
      </h2>
      <div
        className="mb-4 rounded-xl p-4"
        style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
        }}
      >
        <p className="text-[14px]" style={{ color: colors.muted }}>
          Semana {weekNumber} — {formatDate(nextMonday)}
        </p>
        <p
          className="mt-1 text-[15px] font-semibold"
          style={{ color: colors.fg }}
        >
          {productCountLabel(items.length)} en la publicación
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="📦"
          title="Sin productos"
          message="Agregá productos en el paso anterior."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const unidad = unidades.find((u) => u.id_unidad === item.fk_unidad);
            const displayImage = item.imagePreview ?? mediaUrl(item.foto);
            return (
              <div
                key={item.tempId}
                className="flex items-center gap-3 rounded-xl p-3"
                style={{
                  border: `1px solid ${colors.border}`,
                  background: colors.surface,
                }}
              >
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg"
                  style={{ background: colors.accentBg }}
                >
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={hideBrokenImage}
                    />
                  ) : (
                    <span className="text-lg">🌿</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[14px] font-semibold"
                    style={{ color: colors.fg }}
                  >
                    {item.nombre_producto ||
                      `Producto #${String(item.fk_producto)}`}
                  </p>
                  <p className="text-[13px]" style={{ color: colors.muted }}>
                    {item.stock} {unidad?.tipo ?? ''} · ${item.precio}
                  </p>
                </div>
                <Badge
                  variant={item.foto || item.imageFile ? 'success' : 'warning'}
                >
                  {item.foto || item.imageFile ? 'Con foto' : 'Sin foto'}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
