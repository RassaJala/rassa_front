import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { createPago, fetchTiposPago, type TipoPago } from '@/common/payments';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAppColors } from '../hooks/useAppColors';
import api from '../services/api';

// ── Constants ──────────────────────────────────────────────

const STATUS_READY = 'listo_para_retirar';
const INPUT_MAX_LENGTH = 200;

// ── Types ──────────────────────────────────────────────────

interface OrderDetail {
  id_pedido: number;
  cliente_nombre: string | null;
  total: string;
  estado_actual: string;
}

// ── Component ──────────────────────────────────────────────

export function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const colors = useAppColors();
  const { brand, fg, muted, border, surface, coral, bg, accentBg } = colors;

  const [selectedTipo, setSelectedTipo] = useState<number | null>(null);
  const [referencia, setReferencia] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  // Fetch order detail
  const {
    data: order,
    isLoading: orderLoading,
    isError: orderError,
    refetch: refetchOrder,
  } = useQuery<OrderDetail>({
    queryKey: ['pedido', Number(orderId)],
    queryFn: async () => {
      const { data } = await api.get<OrderDetail>(`/pedidos/${orderId}/`);
      return data;
    },
    enabled: !!orderId,
    staleTime: 30_000,
  });

  // Fetch payment types
  const { data: tiposPago = [], isLoading: tiposLoading } = useQuery({
    queryKey: ['tipos-pago'],
    queryFn: () => fetchTiposPago(api),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const pagoMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTipo || !order) throw new Error('Datos incompletos');
      if (!orderId || isNaN(Number(orderId)))
        throw new Error('ID de pedido inválido');
      const trimmedRef = referencia.trim();
      return createPago(api, {
        pedido: Number(orderId),
        tipo_pago: selectedTipo,
        monto: order.total,
        ...(trimmedRef ? { referencia: trimmedRef } : {}),
      });
    },
    onSuccess: async (data) => {
      try {
        localStorage.setItem('last_payment_id', String(data.id_pago));
      } catch {
        /* ignore */
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pedidos'] }),
        queryClient.invalidateQueries({
          queryKey: ['pedido', Number(orderId)],
        }),
      ]).catch(() => {});
      navigate(`/vendedor/recibo/${data.id_pago}`, { replace: true });
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data as Record<string, unknown>;
        const msg =
          typeof data.detail === 'string'
            ? data.detail
            : typeof data.message === 'string'
              ? data.message
              : null;
        if (msg) {
          setFieldError(msg);
          return;
        }
        // Check per-field errors
        for (const key of ['pedido', 'tipo_pago', 'monto', 'referencia']) {
          const val = data[key];
          if (Array.isArray(val) && val[0]) {
            setFieldError(String(val[0]));
            return;
          }
        }
      }
      setFieldError('Error al registrar el pago. Intentá de nuevo.');
    },
  });

  const isLoading = orderLoading || tiposLoading;
  const isReady = order?.estado_actual === STATUS_READY;

  if (isLoading) {
    return <LoadingSpinner className="mt-20" />;
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
    <div className="mx-auto max-w-2xl">
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
        className="mb-6 rounded-2xl border p-3"
        style={{
          background: surface,
          borderColor: fieldError ? coral : border,
        }}
      >
        {tiposPago.map((tipo: TipoPago) => {
          const selected = selectedTipo === tipo.id_tipo_pago;
          return (
            <button
              key={tipo.id_tipo_pago}
              type="button"
              onClick={() => {
                setSelectedTipo(tipo.id_tipo_pago);
                setFieldError(null);
              }}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3.5 text-left transition-colors"
              style={{
                background: selected ? accentBg : 'transparent',
                marginBottom: tiposPago.length > 1 ? 6 : 0,
              }}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: selected ? brand : border,
                }}
              >
                {selected && (
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: brand }}
                  />
                )}
              </span>
              <span
                className="text-lg font-semibold"
                style={{
                  color: selected ? brand : fg,
                }}
              >
                {tipo.nombre === 'Efectivo' ? '💵' : '🏦'} {tipo.nombre}
              </span>
            </button>
          );
        })}
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
        placeholder={
          selectedTipo
            ? tiposPago.find((t) => t.id_tipo_pago === selectedTipo)?.nombre ===
              'Transferencia'
              ? 'Número de transferencia'
              : 'Nota o referencia'
            : 'Seleccioná un método de pago primero'
        }
        disabled={!selectedTipo}
        maxLength={INPUT_MAX_LENGTH}
        className="mb-6 w-full rounded-xl px-4 py-3 text-[15px] outline-none"
        style={{
          border: `1.5px solid ${border}`,
          background: surface,
          color: fg,
          opacity: selectedTipo ? 1 : 0.5,
        }}
      />

      {/* Submit button */}
      <button
        type="button"
        onClick={() => {
          if (!selectedTipo) {
            setFieldError('Seleccioná un método de pago');
            return;
          }
          pagoMutation.mutate();
        }}
        disabled={pagoMutation.isPending || !selectedTipo}
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
