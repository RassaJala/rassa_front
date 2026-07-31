import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { formatearFecha } from '@/common/dates';
import { fetchPago } from '@/common/payments';
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
    <div className="flex items-center justify-between py-1.5">
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
          <button
            type="button"
            onClick={() => void refetch()}
            className="cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: border, color: brand }}
          >
            Reintentar
          </button>
          <button
            type="button"
            onClick={() => navigate('/vendedor/pedidos')}
            className="cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: border, color: brand }}
          >
            Volver a pedidos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/vendedor/pedidos')}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border text-lg"
          style={{ borderColor: border, color: fg }}
        >
          ←
        </button>
        <h1 className="text-2xl font-bold" style={{ color: fg }}>
          Recibo de Pago
        </h1>
      </div>

      {/* Success badge */}
      <div
        className="mb-5 rounded-2xl p-6 text-center"
        style={{ background: brand }}
      >
        <span className="text-5xl">✓</span>
        <p className="mt-2 text-xl font-bold text-white">Pago Registrado</p>
        <p className="mt-1 text-sm text-white/90">{pago.folio}</p>
      </div>

      {/* Receipt details */}
      <div
        className="mb-4 rounded-2xl border p-5"
        style={{
          background: surface,
          borderColor: border,
        }}
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

      {/* Products */}
      <h2 className="mb-3 text-lg font-bold" style={{ color: fg }}>
        Productos
      </h2>
      <div
        className="mb-4 rounded-2xl border p-5"
        style={{
          background: surface,
          borderColor: border,
        }}
      >
        {pago.productos.map((prod, idx) => (
          <div
            key={`${prod.nombre}-${idx}`}
            className="flex items-center justify-between py-2"
            style={
              idx < pago.productos.length - 1
                ? { borderBottom: `1px solid ${border}` }
                : undefined
            }
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold" style={{ color: fg }}>
                {prod.nombre}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: muted }}>
                {prod.cantidad}x ${Number(prod.precio).toFixed(2)}
              </p>
            </div>
            <p className="text-sm font-bold" style={{ color: fg }}>
              ${(prod.cantidad * Number(prod.precio)).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* Total */}
      <div
        className="mb-6 flex items-center justify-between rounded-2xl border p-5"
        style={{
          background: surface,
          borderColor: border,
        }}
      >
        <span className="text-base font-semibold" style={{ color: fg }}>
          Total pagado
        </span>
        <span className="text-2xl font-bold" style={{ color: brand }}>
          ${Number(pago.monto).toFixed(2)}
        </span>
      </div>

      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/vendedor/pedidos')}
        className="flex w-full cursor-pointer items-center justify-center rounded-xl py-4 text-lg font-bold text-white transition-opacity"
        style={{ background: brand }}
      >
        Volver a pedidos
      </button>
    </div>
  );
}
