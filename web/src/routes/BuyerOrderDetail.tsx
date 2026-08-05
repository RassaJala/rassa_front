import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { Badge } from '~/components/ui/Badge';
import { Button } from '~/components/ui/Button';
import { LoadingSpinner } from '~/components/ui/LoadingSpinner';
import { formatearFecha } from '@/common/dates';
import { isOrderExpired } from '@/common/orders';
import { colors } from '~/constants/colors';
import { useAppColors } from '~/hooks/useAppColors';
import api from '~/services/api';
import type { MermaDePedido, OrderDetail } from '~/services/orderTypes';

const STATUS_VARIANT: Record<
  string,
  'default' | 'success' | 'warning' | 'error'
> = {
  pendiente: 'warning',
  confirmado: 'default',
  en_preparacion: 'default',
  listo_para_retirar: 'success',
  entregado: 'success',
  cancelado: 'error',
};

const TIMELINE_COLORS: Record<string, string> = {
  pendiente: colors.warning,
  confirmado: colors.info,
  en_preparacion: colors.warning,
  listo_para_retirar: colors.success,
  entregado: colors.success,
  cancelado: colors.error,
};

export function BuyerOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useAppColors();
  const orderId = id ? parseInt(id, 10) : 0;

  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useQuery<OrderDetail>({
    queryKey: ['pedido', orderId],
    queryFn: async () => {
      const { data } = await api.get<OrderDetail>(`/pedidos/${orderId}/`);
      return data;
    },
    enabled: orderId > 0,
  });

  const { data: mermas } = useQuery<MermaDePedido[]>({
    queryKey: ['mermas', orderId],
    queryFn: async () => {
      const { data } = await api.get<{
        data?: { results?: MermaDePedido[] };
        results?: MermaDePedido[];
      }>(`/mermas/?fk_pedido=${orderId}`);
      return data?.data?.results ?? data?.results ?? [];
    },
    enabled: orderId > 0,
  });

  if (isLoading) {
    return <LoadingSpinner className="mt-20" />;
  }

  if (isError || !order) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-gray-500 dark:text-gray-400">
        <p>Error al cargar el pedido</p>
        <Button variant="secondary" onClick={() => void refetch()}>
          Reintentar
        </Button>
        <Button variant="ghost" onClick={() => navigate('/cliente/pedidos')}>
          Volver a mis pedidos
        </Button>
      </div>
    );
  }

  const isPickupReady = order.estado_actual === 'listo_para_retirar';

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => navigate('/cliente/pedidos')}
        style={{
          background: 'transparent',
          border: 'none',
          color: t.brand,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          padding: 0,
          marginBottom: 12,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        ← Volver a pedidos
      </button>

      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: t.fg,
          marginBottom: 20,
        }}
      >
        Pedido #{order.id_pedido}
      </h1>

      {/* Info card */}
      <div
        style={{
          background: t.surface,
          borderRadius: 16,
          border: `1px solid ${t.border}`,
          padding: 24,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <p style={{ fontSize: 13, color: t.muted, margin: 0 }}>Creado</p>
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: t.fg,
                margin: '4px 0 0 0',
              }}
            >
              {formatearFecha(order.creado_en)}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 13, color: t.muted, margin: 0 }}>Total</p>
            <p
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: t.fg,
                margin: '4px 0 0 0',
              }}
            >
              ${parseFloat(order.total).toFixed(2)}
            </p>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <Badge variant={STATUS_VARIANT[order.estado_actual] ?? 'default'}>
            {order.estado_actual.replace(/_/g, ' ')}
          </Badge>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 32,
            marginTop: 16,
          }}
        >
          <div>
            <p style={{ fontSize: 13, color: t.muted, margin: 0 }}>Subtotal</p>
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: t.fg,
                margin: '4px 0 0 0',
              }}
            >
              ${parseFloat(order.subtotal).toFixed(2)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 13, color: t.muted, margin: 0 }}>IVA</p>
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: t.fg,
                margin: '4px 0 0 0',
              }}
            >
              ${parseFloat(order.iva).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Pickup ready banner */}
      {isPickupReady ? (
        <div
          style={{
            background: colors.success,
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <span style={{ fontSize: 28 }}>✅</span>
          <div>
            <p
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: colors.iconWhite,
                margin: 0,
              }}
            >
              ¡Listo para recoger!
            </p>
            <p
              style={{
                fontSize: 13,
                color: colors.iconWhite,
                margin: '4px 0 0 0',
                opacity: 0.9,
              }}
            >
              Pasa al punto de entrega por tu pedido
            </p>
          </div>
        </div>
      ) : null}

      {/* Expired order banner */}
      {isOrderExpired(order) ? (
        <div
          style={{
            background: colors.error,
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <span style={{ fontSize: 28 }}>⏰</span>
          <div>
            <p
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: colors.iconWhite,
                margin: 0,
              }}
            >
              Pedido expirado
            </p>
            <p
              style={{
                fontSize: 13,
                color: colors.iconWhite,
                margin: '4px 0 0 0',
                opacity: 0.9,
              }}
            >
              {order.fecha_expiracion
                ? `Este pedido expiró el ${formatearFecha(order.fecha_expiracion)}. Ya no se puede modificar ni confirmar.`
                : 'Este pedido expiró. Ya no se puede modificar ni confirmar.'}
            </p>
          </div>
        </div>
      ) : null}

      {/* Products section */}
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: t.fg,
          marginBottom: 12,
        }}
      >
        Productos
      </h2>
      <div
        style={{
          background: t.surface,
          borderRadius: 16,
          border: `1px solid ${t.border}`,
          overflow: 'hidden',
          marginBottom: 24,
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Producto', 'Cantidad', 'Precio unitario', 'Importe'].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      fontSize: 11,
                      color: t.muted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      fontWeight: 600,
                      padding: '12px 20px',
                      background: t.bg,
                      borderBottom: `1px solid ${t.border}`,
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {order.detalles.map((detalle, index) => (
              <tr key={detalle.id_detalle}>
                <td
                  style={{
                    padding: '14px 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    color: t.fg,
                    borderBottom:
                      index < order.detalles.length - 1
                        ? `1px solid ${t.border}`
                        : 'none',
                  }}
                >
                  {detalle.nombre_producto}
                </td>
                <td
                  style={{
                    padding: '14px 20px',
                    fontSize: 14,
                    color: t.fg,
                    borderBottom:
                      index < order.detalles.length - 1
                        ? `1px solid ${t.border}`
                        : 'none',
                  }}
                >
                  {detalle.cantidad}
                </td>
                <td
                  style={{
                    padding: '14px 20px',
                    fontSize: 14,
                    color: t.muted,
                    borderBottom:
                      index < order.detalles.length - 1
                        ? `1px solid ${t.border}`
                        : 'none',
                  }}
                >
                  ${parseFloat(detalle.precio_unitario).toFixed(2)}
                </td>
                <td
                  style={{
                    padding: '14px 20px',
                    fontSize: 14,
                    fontWeight: 700,
                    color: t.fg,
                    borderBottom:
                      index < order.detalles.length - 1
                        ? `1px solid ${t.border}`
                        : 'none',
                  }}
                >
                  ${parseFloat(detalle.importe).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mermas section */}
      {Array.isArray(mermas) && mermas.length > 0 ? (
        <>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: t.fg,
              marginBottom: 12,
            }}
          >
            Mermas
          </h2>
          <div
            style={{
              background: t.surface,
              borderRadius: 16,
              border: `1px solid ${t.border}`,
              padding: 24,
              marginBottom: 24,
            }}
          >
            {mermas.map((merma, index) => (
              <div
                key={merma.id_merma}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 16,
                  padding: '10px 0',
                  borderBottom:
                    index < mermas.length - 1
                      ? `1px solid ${t.border}`
                      : 'none',
                }}
              >
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: t.fg,
                      margin: 0,
                    }}
                  >
                    {merma.producto_info?.producto ?? 'Producto'}
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: t.muted,
                      margin: '2px 0 0 0',
                    }}
                  >
                    {merma.motivo}
                    {merma.decision_info?.nombre
                      ? ` · ${merma.decision_info.nombre}`
                      : ''}
                  </p>
                  {merma.comentarios ? (
                    <p
                      style={{
                        fontSize: 13,
                        color: t.muted,
                        margin: '2px 0 0 0',
                      }}
                    >
                      {merma.comentarios}
                    </p>
                  ) : null}
                  <p
                    style={{
                      fontSize: 12,
                      color: t.muted,
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
                    color: t.fg,
                    margin: 0,
                  }}
                >
                  {merma.cantidad}x
                </p>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {/* Timeline section */}
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: t.fg,
          marginBottom: 12,
        }}
      >
        Historial
      </h2>
      <div
        style={{
          background: t.surface,
          borderRadius: 16,
          border: `1px solid ${t.border}`,
          padding: 24,
        }}
      >
        {order.historial.map((entry, index) => {
          const dotColor = TIMELINE_COLORS[entry.estado_nuevo] ?? t.muted;
          const label =
            index === 0
              ? 'Pedido creado'
              : entry.estado_nuevo.replace(/_/g, ' ');
          const isLast = index === order.historial.length - 1;

          return (
            <div key={entry.id_historial} style={{ display: 'flex', gap: 16 }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: 24,
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: dotColor,
                    marginTop: 4,
                    flexShrink: 0,
                  }}
                />
                {isLast ? null : (
                  <div
                    style={{
                      width: 2,
                      flex: 1,
                      background: t.border,
                      minHeight: 32,
                    }}
                  />
                )}
              </div>
              <div style={{ paddingBottom: isLast ? 0 : 24, flex: 1 }}>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: t.fg,
                    margin: 0,
                    textTransform: 'capitalize',
                  }}
                >
                  {label}
                </p>
                {entry.cambiado_por_nombre ? (
                  <p
                    style={{
                      fontSize: 13,
                      color: t.muted,
                      margin: '2px 0 0 0',
                    }}
                  >
                    por {entry.cambiado_por_nombre}
                  </p>
                ) : null}
                <p
                  style={{
                    fontSize: 13,
                    color: t.muted,
                    margin: '2px 0 0 0',
                  }}
                >
                  {formatearFecha(entry.creado_en)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
