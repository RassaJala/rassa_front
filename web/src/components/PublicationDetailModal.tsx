import type { AppColors } from '../hooks/useAppColors';
import type { Publicacion } from '../services/publications';
import { formatDate } from '../utils/publicationWizard';
import { mediaUrl } from '../utils/mediaUrl';
import { hideBrokenImage } from '../utils/imageHelpers';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { getStatusBadge, productCountLabel } from './PublicationActions';

interface DetailModalProps {
  pub: Publicacion;
  onClose: () => void;
  colors: AppColors;
}

export function DetailModal({ pub, onClose, colors }: DetailModalProps) {
  const productos = pub.productos ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-2xl p-6"
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold" style={{ color: colors.fg }}>
              Semana {pub.semana}
            </h2>
            <p className="text-[13px]" style={{ color: colors.muted }}>
              {formatDate(new Date(pub.fecha_publicacion), { short: true })}
            </p>
          </div>
          <Badge variant={getStatusBadge(pub.estado).variant}>
            {getStatusBadge(pub.estado).label}
          </Badge>
        </div>

        <p
          className="mb-4 text-[14px] font-semibold"
          style={{ color: colors.fg }}
        >
          {productCountLabel(productos.length)}
        </p>

        {productos.length === 0 ? (
          <p className="text-[13px]" style={{ color: colors.muted }}>
            Esta publicación no tiene productos.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {productos.map((p) => {
              const img = mediaUrl(p.foto);
              return (
                <div
                  key={p.id_producto_semanal}
                  className="flex items-center gap-4 rounded-xl p-3"
                  style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  {img ? (
                    <img
                      src={img}
                      alt=""
                      className="h-14 w-14 rounded-lg object-cover"
                      onError={hideBrokenImage}
                    />
                  ) : (
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-lg text-[22px]"
                      style={{ background: colors.border }}
                    >
                      📦
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-[14px] font-semibold"
                      style={{ color: colors.fg }}
                    >
                      Producto #{p.fk_producto}
                    </p>
                    <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                      <span style={{ color: colors.muted }}>
                        Stock: {p.stock}
                      </span>
                      <span style={{ color: colors.brand }}>${p.precio}</span>
                      <Badge
                        variant={p.estado === 'activo' ? 'success' : 'default'}
                      >
                        {p.estado}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
