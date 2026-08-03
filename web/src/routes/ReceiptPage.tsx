import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { formatearFecha } from '@/common/dates';
import { buildReceiptHtml } from '@/common/receipt';
import { fetchPago } from '@/common/payments';
import { PageHeader } from '../components/layout/PageHeader';
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
        className="max-w-[60%] text-right text-sm font-semibold"
        style={{ color: colors.fg }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────

export function ReceiptPage() {
  const { paymentId: rawPaymentId } = useParams<{ paymentId: string }>();
  const paymentId = Number(rawPaymentId);
  const paymentIdValid =
    rawPaymentId !== undefined && Number.isInteger(paymentId) && paymentId > 0;
  const navigate = useNavigate();
  const colors = useAppColors();
  const { brand, fg, muted, border, surface, bg, accentBg } = colors;

  const {
    data: pago,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['pago', paymentId],
    queryFn: () => fetchPago(api, paymentId),
    enabled: paymentIdValid,
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

  const totalProductos = pago.productos.reduce(
    (acc, prod) => acc + prod.cantidad * Number(prod.precio),
    0,
  );

  const handleImprimir = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(buildReceiptHtml(pago));
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div>
      <PageHeader
        title="Recibo de Pago"
        action={
          <div className="flex items-center gap-3">
            <Button onClick={handleImprimir}>
              <span aria-hidden>🖨</span> Imprimir / PDF
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/vendedor/pedidos')}
            >
              ← Volver a pedidos
            </Button>
          </div>
        }
      />

      {/* Success banner */}
      <div
        className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl p-6"
        style={{
          background: brand,
          boxShadow: '0 8px 24px rgba(36,86,60,0.18)',
        }}
      >
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
          style={{ background: 'rgba(255,255,255,0.18)', color: '#FFFFFF' }}
        >
          ✓
        </span>
        <div>
          <p className="text-xl font-bold text-white">Pago Registrado</p>
          <p className="text-sm text-white/90">
            El pedido fue marcado como entregado
          </p>
        </div>
      </div>

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
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            {/* Table header */}
            <div
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-6 py-3 text-xs font-bold uppercase tracking-wide"
              style={{ color: muted, background: bg }}
            >
              <span>Producto</span>
              <span className="w-20 text-center">Cantidad</span>
              <span className="w-24 text-right">Precio</span>
              <span className="w-28 text-right">Importe</span>
            </div>
            {pago.productos.map((prod, idx) => (
              <div
                key={`${prod.nombre}-${idx}`}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-6 py-4"
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
            {/* Subtotal row */}
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
                ${totalProductos.toFixed(2)}
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
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
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
                ${Number(pago.monto).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
