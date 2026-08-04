import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { formatearFecha } from '@/common/dates';
import {
  calcularImporte,
  calcularSubtotal,
  esPagoIdValido,
  esPropietarioPago,
  fetchPago,
  formatearMonto,
  PAGOS_CLIENTE_QUERY_KEY,
} from '@/common/payments';
import type { PaymentDetail } from '@/common/payments';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAppColors } from '../hooks/useAppColors';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

// ── Helpers ────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useAppColors>;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm" style={{ color: colors.muted }}>
        {label}
      </span>
      <span
        className="max-w-[60%] text-right text-sm font-semibold"
        style={{ color: colors.fg }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────

export function BuyerReceiptDetail() {
  const { paymentId: rawPaymentId } = useParams<{ paymentId: string }>();
  const paymentId = Number(rawPaymentId);
  const paymentIdValid = esPagoIdValido(paymentId);
  const navigate = useNavigate();
  const colors = useAppColors();
  const { brand, fg, muted, border, surface, bg, accentBg } = colors;
  const { user } = useAuth();

  const {
    data: pago,
    isLoading,
    isError,
    refetch,
  } = useQuery<PaymentDetail>({
    queryKey: [PAGOS_CLIENTE_QUERY_KEY, user?.id, paymentId],
    queryFn: () => fetchPago(api, paymentId),
    enabled: paymentIdValid,
  });

  if (isLoading) {
    return <LoadingSpinner className="mt-20" />;
  }

  // Defensa en profundidad: el backend ya filtra los pagos por propietario
  // (IDOR mitigado), pero nunca renderizamos un recibo ajeno.
  const esPropietario = esPropietarioPago(pago, user?.id);

  if (isError || !pago || !esPropietario) {
    const mensaje =
      pago != null && !esPropietario
        ? 'No tienes acceso a este recibo'
        : 'Error al cargar el recibo';
    return (
      <div className="py-20 text-center">
        <p className="mb-4 text-lg" style={{ color: muted }}>
          {mensaje}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" onClick={() => void refetch()}>
            Reintentar
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/cliente/recibos')}
          >
            Volver
          </Button>
        </div>
      </div>
    );
  }

  const productos = pago.productos ?? [];

  const subtotal = calcularSubtotal(productos);

  return (
    <div>
      <button
        onClick={() => navigate('/cliente/recibos')}
        className="mb-4 inline-flex items-center gap-1.5 border-0 bg-transparent p-0 text-sm font-semibold"
        style={{ color: brand, cursor: 'pointer' }}
      >
        ← Volver a mis recibos
      </button>

      <PageHeader title={`Recibo ${pago.folio}`} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Products */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold" style={{ color: fg }}>
            Productos
          </h2>
          <div
            className="overflow-hidden rounded-2xl"
            style={{
              background: surface,
              border: `1px solid ${border}`,
            }}
          >
            <div
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-6 py-3 text-xs font-bold uppercase tracking-wide"
              style={{ color: muted, background: bg }}
            >
              <span>Producto</span>
              <span className="w-20 text-center">Cantidad</span>
              <span className="w-24 text-right">Precio</span>
              <span className="w-28 text-right">Importe</span>
            </div>
            {productos.map((prod, idx) => (
              <div
                key={`${prod.nombre}-${idx}`}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-6 py-4"
                style={
                  idx < productos.length - 1
                    ? { borderBottom: `1px solid ${border}` }
                    : undefined
                }
              >
                <span
                  className="min-w-0 text-sm font-semibold"
                  style={{ color: fg }}
                >
                  {prod.nombre}
                </span>
                <span
                  className="w-20 text-center text-sm"
                  style={{ color: muted }}
                >
                  {prod.cantidad}
                </span>
                <span
                  className="w-24 text-right text-sm"
                  style={{ color: muted }}
                >
                  {formatearMonto(prod.precio)}
                </span>
                <span
                  className="w-28 text-right text-sm font-semibold"
                  style={{ color: fg }}
                >
                  {formatearMonto(calcularImporte(prod))}
                </span>
              </div>
            ))}
            <div
              className="flex items-center justify-end gap-6 px-6 py-4"
              style={{ borderTop: `1px solid ${border}` }}
            >
              <span className="text-sm font-semibold" style={{ color: muted }}>
                Subtotal
              </span>
              <span
                className="w-28 text-right text-sm font-bold"
                style={{ color: fg }}
              >
                {formatearMonto(subtotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div>
          <h2 className="mb-3 text-lg font-bold" style={{ color: fg }}>
            Resumen del pago
          </h2>
          <div
            className="overflow-hidden rounded-2xl"
            style={{
              background: surface,
              border: `1px solid ${border}`,
            }}
          >
            <div className="p-5">
              <DetailRow label="Folio" value={pago.folio} colors={colors} />
              {pago.pedido ? (
                <DetailRow
                  label="Pedido"
                  value={`#${pago.pedido}`}
                  colors={colors}
                />
              ) : null}
              <DetailRow
                label="Fecha"
                value={formatearFecha(pago.fecha_pago)}
                colors={colors}
              />
              <DetailRow
                label="Cliente"
                value={pago.cliente_nombre ?? '—'}
                colors={colors}
              />
              <DetailRow
                label="Método de pago"
                value={pago.tipo_pago_nombre}
                colors={colors}
              />
              {pago.referencia ? (
                <DetailRow
                  label="Referencia"
                  value={pago.referencia}
                  colors={colors}
                />
              ) : null}
            </div>
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ background: accentBg }}
            >
              <span className="text-base font-bold" style={{ color: fg }}>
                Total pagado
              </span>
              <span className="text-2xl font-bold" style={{ color: brand }}>
                {formatearMonto(pago.monto)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
