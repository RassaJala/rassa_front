import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  createIdempotencyKey,
  createPago,
  esEfectivo,
  fetchPagoPorPedido,
  fetchTiposPago,
  ORDER_STATUS_READY,
} from '@/common/payments';
import { QUERY_STALE_TIME } from '../constants/api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAppColors } from '../hooks/useAppColors';
import api from '../services/api';
import { extractApiError } from '../utils/apiErrors';

// ── Constants ──────────────────────────────────────────────

const INPUT_MAX_LENGTH = 200;

// ── Types ──────────────────────────────────────────────────

interface OrderDetail {
  id_pedido: number;
  cliente_nombre: string | null;
  total: string;
  estado_actual: string;
}

// ── Helpers ────────────────────────────────────────────────

// One stable idempotency key per order, persisted so a retry (even after a
// reload) reuses the same key and the backend can dedupe the POST.
function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getIdempotencyKey(orderId: number): string {
  const storageKey = `idem_pago_${orderId}`;
  const existing = getLocalStorage()?.getItem(storageKey);
  if (existing) return existing;
  const fresh = createIdempotencyKey();
  getLocalStorage()?.setItem(storageKey, fresh);
  return fresh;
}

// ── Component ──────────────────────────────────────────────

export function PaymentPage() {
  const { orderId: rawOrderId } = useParams<{ orderId: string }>();
  const orderId = Number(rawOrderId);
  const orderIdValid =
    rawOrderId !== undefined && Number.isInteger(orderId) && orderId > 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const colors = useAppColors();
  const { brand, fg, muted, border, surface, coral } = colors;

  const [referencia, setReferencia] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  // Synchronous guard: closes the same-frame gap between click and the
  // mutation's isPending render, which would otherwise allow a double POST.
  const paymentInFlight = useRef(false);

  // Fetch order detail
  const {
    data: order,
    isLoading: orderLoading,
    isError: orderError,
    refetch: refetchOrder,
  } = useQuery<OrderDetail>({
    queryKey: ['pedido', orderId],
    queryFn: async () => {
      const { data } = await api.get<OrderDetail>(`/pedidos/${orderId}/`);
      return data;
    },
    enabled: orderIdValid,
    staleTime: QUERY_STALE_TIME,
  });

  // Fetch payment types
  const {
    data: tiposPago = [],
    isLoading: tiposLoading,
    isError: tiposError,
    refetch: refetchTipos,
  } = useQuery({
    queryKey: ['tipos-pago'],
    queryFn: () => fetchTiposPago(api),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });

  // Cash is the only accepted payment method: resolve its id without a picker.
  const tipoEfectivo = tiposPago.find(esEfectivo) ?? tiposPago[0] ?? null;

  const pagoMutation = useMutation({
    mutationFn: async () => {
      if (!tipoEfectivo || !order) throw new Error('Datos incompletos');
      // Reconcile before POST: if a payment already exists for this order, a
      // previous request actually succeeded — reuse it instead of charging
      // twice. Idempotency-Key then dedupes any race that slips through.
      const existing = await fetchPagoPorPedido(api, orderId);
      if (existing) return existing;
      const trimmedRef = referencia.trim();
      return createPago(
        api,
        {
          pedido: orderId,
          tipo_pago: tipoEfectivo.id_tipo_pago,
          monto: order.total,
          ...(trimmedRef ? { referencia: trimmedRef } : {}),
        },
        getIdempotencyKey(orderId),
      );
    },
    onSuccess: (data) => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pedidos'] }),
        queryClient.invalidateQueries({ queryKey: ['pedido', orderId] }),
      ]).catch(() => {});
      navigate(`/vendedor/recibo/${data.id_pago}`, { replace: true });
      paymentInFlight.current = false;
    },
    onError: async (err: unknown) => {
      try {
        // The POST may have succeeded server-side with the response lost:
        // reconcile before showing an error so the seller is not told the
        // payment failed (and re-submits, charging twice).
        const pago = await fetchPagoPorPedido(api, orderId);
        if (pago) {
          void Promise.all([
            queryClient.invalidateQueries({ queryKey: ['pedidos'] }),
            queryClient.invalidateQueries({ queryKey: ['pedido', orderId] }),
          ]).catch(() => {});
          navigate(`/vendedor/recibo/${pago.id_pago}`, { replace: true });
          paymentInFlight.current = false;
          return;
        }
      } catch {
        // Reconciliation failed: fall through to the real error message
      }
      setFieldError(
        extractApiError(err, ['pedido', 'tipo_pago', 'monto', 'referencia']),
      );
      paymentInFlight.current = false;
    },
  });

  const isLoading = orderLoading || tiposLoading;
  const isReady = order?.estado_actual === ORDER_STATUS_READY;

  if (isLoading) {
    return <LoadingSpinner className="mt-20" />;
  }

  if (tiposError) {
    return (
      <div className="py-20 text-center">
        <p className="mb-4 text-lg" style={{ color: muted }}>
          Error al cargar los métodos de pago
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => void refetchTipos()}
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

  if (orderError || !order) {
    return (
      <div className="py-20 text-center">
        <p className="mb-4 text-lg" style={{ color: muted }}>
          Error al cargar el pedido
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => void refetchOrder()}
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

  if (!isReady) {
    return (
      <div className="py-20 text-center">
        <p className="mb-2 text-lg font-bold" style={{ color: fg }}>
          Pedido no disponible para cobro
        </p>
        <p className="mb-6 text-sm" style={{ color: muted }}>
          Estado actual: {order.estado_actual.replace(/_/g, ' ')}
        </p>
        <button
          type="button"
          onClick={() => navigate('/vendedor/pedidos')}
          className="cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold"
          style={{ borderColor: border, color: brand }}
        >
          Volver a pedidos
        </button>
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
          Registrar Pago
        </h1>
      </div>

      {/* Order info card */}
      <div
        className="mb-5 rounded-2xl border p-5"
        style={{
          background: surface,
          borderColor: border,
        }}
      >
        <p className="text-sm" style={{ color: muted }}>
          Pedido #{order.id_pedido}
        </p>
        <p className="mt-1 text-lg font-bold" style={{ color: fg }}>
          {order.cliente_nombre ?? 'Cliente'}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm" style={{ color: muted }}>
            Total a cobrar
          </span>
          <span className="text-3xl font-bold" style={{ color: brand }}>
            ${Number(order.total).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Payment method */}
      <h2 className="mb-3 text-base font-bold" style={{ color: fg }}>
        Método de pago
      </h2>
      <div
        className="mb-6 rounded-2xl border p-4"
        style={{
          background: surface,
          borderColor: fieldError ? coral : border,
        }}
      >
        <span className="text-lg font-semibold" style={{ color: fg }}>
          💵 {tipoEfectivo?.nombre ?? 'Efectivo'}
        </span>
        {fieldError && (
          <p
            className="ml-1 mt-1.5 text-xs font-medium"
            style={{ color: coral }}
          >
            {fieldError}
          </p>
        )}
      </div>

      {/* Reference field */}
      <h2 className="mb-2 text-base font-bold" style={{ color: fg }}>
        Referencia{' '}
        <span className="text-sm font-normal" style={{ color: muted }}>
          (opcional)
        </span>
      </h2>
      <input
        value={referencia}
        onChange={(e) => {
          setReferencia(e.target.value);
          setFieldError(null);
        }}
        placeholder="Nota o referencia"
        maxLength={INPUT_MAX_LENGTH}
        className="mb-6 w-full rounded-xl px-4 py-3 text-[15px] outline-none"
        style={{
          border: `1.5px solid ${border}`,
          background: surface,
          color: fg,
        }}
      />

      {/* Submit button */}
      <button
        type="button"
        data-testid="submit-payment-button"
        onClick={() => {
          if (paymentInFlight.current) return;
          paymentInFlight.current = true;
          pagoMutation.mutate();
        }}
        disabled={pagoMutation.isPending || !tipoEfectivo}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-4 text-lg font-bold text-white transition-opacity disabled:cursor-not-allowed"
        style={{
          background: pagoMutation.isPending ? muted : brand,
          opacity: pagoMutation.isPending ? 0.6 : 1,
        }}
      >
        {pagoMutation.isPending ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Registrando...
          </>
        ) : (
          'Registrar Pago'
        )}
      </button>
    </div>
  );
}
