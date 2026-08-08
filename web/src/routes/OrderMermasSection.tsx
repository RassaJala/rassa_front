import { formatearFecha } from '@/common/dates';
import type { MermaDePedido, MermaDePedidoPublic } from '@/common/waste';

import { useAppColors } from '../hooks/useAppColors';

interface OrderMermasSectionProps {
  readonly mermas: readonly (MermaDePedido | MermaDePedidoPublic)[];
  /** Set false in buyer views so internal staff notes are never shown. */
  readonly showComentarios?: boolean;
}

/**
 * Shared per-order mermas section for the web admin and buyer order views
 * (mirrors the mobile OrderMermasSection). Shows an empty state when the list
 * is empty; `showComentarios={false}` (buyer) hides internal staff notes.
 */
export function OrderMermasSection({
  mermas,
  showComentarios = true,
}: OrderMermasSectionProps) {
  const t = useAppColors();
  const { fg, muted, border, surface } = t;

  return (
    <div style={{ marginBottom: 24 }}>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: fg,
          marginBottom: 12,
        }}
      >
        Mermas
      </h2>
      <div
        style={{
          background: surface,
          borderRadius: 16,
          border: `1px solid ${border}`,
          padding: 24,
        }}
      >
        {mermas.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: muted }}>
            Este pedido no tiene mermas
          </p>
        ) : (
          mermas.map((merma, index) => {
            const comentarios =
              'comentarios' in merma ? merma.comentarios : null;
            return (
              <div
                key={merma.id_merma}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 16,
                  padding: '10px 0',
                  borderBottom:
                    index < mermas.length - 1 ? `1px solid ${border}` : 'none',
                }}
              >
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: fg,
                      margin: 0,
                    }}
                  >
                    {merma.producto_info?.producto ?? 'Producto'}
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: muted,
                      margin: '2px 0 0 0',
                    }}
                  >
                    {merma.motivo}
                    {merma.decision_info?.nombre
                      ? ` · ${merma.decision_info.nombre}`
                      : ''}
                  </p>
                  {showComentarios && comentarios ? (
                    <p
                      style={{
                        fontSize: 13,
                        color: muted,
                        margin: '2px 0 0 0',
                      }}
                    >
                      {comentarios}
                    </p>
                  ) : null}
                  <p
                    style={{
                      fontSize: 12,
                      color: muted,
                      margin: '2px 0 0 0',
                    }}
                  >
                    {formatearFecha(merma.creado_en)}
                  </p>
                </div>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: fg,
                    margin: 0,
                  }}
                >
                  {merma.cantidad}x
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
