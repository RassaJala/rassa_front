import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { formatearFecha } from '@/common/dates';
import { fetchPago } from '@/common/payments';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAppColors } from '../hooks/useAppColors';
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
        className="max-w-[60%] text-sm font-semibold"
        style={{ color: colors.fg }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────

export function ReceiptPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const colors = useAppColors();
  const { brand, fg, muted, border, surface } = colors;

  const {
    data: pago,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['pago', Number(paymentId)],
    queryFn: () => fetchPago(api, Number(paymentId)),
    enabled: !!paymentId,
  });

  if (isLoading) {
    return <LoadingSpinner className="mt-20" />;
  }

  if (isError || !pago) {
    return (
      <div className="py-20 text-center">
        <p className="mb-4 text-lg" style={{ color: muted }}>
          Error al cargar el recibo
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" onClick={() => void refetch()}>
            Reintentar
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/vendedor/pedidos')}
          >
            Volver a pedidos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Recibo de Pago"
        action={
          <Button
            variant="secondary"
            onClick={() => navigate('/vendedor/pedidos')}
          >
            ← Volver a pedidos
          </Button>
        }
      />

      {/* Success banner */}
      <div
        className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6"
        style={{ background: brand }}
      >
        <div className="flex items-center gap-3">
          <span className="text-4xl">✓</span>
          <div>
            <p className="text-xl font-bold text-white">Pago Registrado</p>
            <p className="text-sm text-white/90">
              El pedido fue marcado como entregado
            </p>
          </div>
        </div>
        <Badge className="bg-white/15 text-white">{pago.folio}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Products */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold" style={{ color: fg }}>
            Productos
          </h2>
          <div
            className="overflow-hidden rounded-2xl border"
            style={{ background: surface, borderColor: border }}
          >
            {/* Table header */}
            <div
              className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b px-5 py-3 text-xs font-bold uppercase tracking-wide"
              style={{ color: muted, borderBottomColor: border }}
            >
              <span>Producto</span>
              <span className="w-20 text-center">Cantidad</span>
              <span className="w-24 text-right">Precio</span>
              <span className="w-28 text-right">Importe</span>
            </div>
            {pago.productos.map((prod, idx) => (
              <div
                key={`${prod.nombre}-${idx}`}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3"
                style={
                  idx < pago.productos.length - 1
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
                  ${Number(prod.precio).toFixed(2)}
                </span>
                <span
                  className="w-28 text-right text-sm font-semibold"
                  style={{ color: fg }}
                >
                  ${(prod.cantidad * Number(prod.precio)).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div>
          <h2 className="mb-3 text-lg font-bold" style={{ color: fg }}>
            Resumen del pago
          </h2>
          <div
            className="mb-4 rounded-2xl border p-5"
            style={{ background: surface, borderColor: border }}
          >
            <DetailRow label="Folio" value={pago.folio} colors={colors} />
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
            className="mb-6 flex items-center justify-between rounded-2xl border p-5"
            style={{
              background: surface,
              borderColor: border,
              borderLeft: `4px solid ${brand}`,
            }}
          >
            <span className="text-base font-semibold" style={{ color: fg }}>
              Total pagado
            </span>
            <span className="text-2xl font-bold" style={{ color: brand }}>
              ${Number(pago.monto).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
