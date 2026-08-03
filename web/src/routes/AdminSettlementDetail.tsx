import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import type {
  MarcarPagadaParams,
  SettlementDetail,
} from '@/common/settlements';
import { PageHeader } from '@/components/layout/PageHeader';
import { PagarModal } from '@/components/admin/settlements/PagarModal';
import { SettlementBreakdown } from '@/components/admin/settlements/SettlementBreakdown';
import { SettlementEstadoBadge } from '@/components/admin/settlements/SettlementEstadoBadge';
import { SettlementPagoCard } from '@/components/admin/settlements/SettlementPagoCard';
import { SettlementVentasList } from '@/components/admin/settlements/SettlementVentasList';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Toast } from '@/components/ui/Toast';
import type { ToastState } from '@/components/ui/Toast';
import {
  fetchSettlement,
  marcarSettlementPagada,
} from '@/services/settlements';
import { parseApiError } from '@/utils/apiErrors';

export function AdminSettlementDetail() {
  const { id } = useParams<{ id: string }>();
  const settlementId = Number(id);
  // JD-002: ids that are not positive integers disable the query (enabled:
  // false keeps status 'pending' forever). Gate the spinner on the same
  // predicate so an invalid id degrades to the not-found EmptyState below.
  const isValidId = Number.isInteger(settlementId) && settlementId > 0;
  const queryClient = useQueryClient();
  const [pagarVisible, setPagarVisible] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const detailQuery = useQuery({
    queryKey: ['settlement', settlementId],
    queryFn: () => fetchSettlement(settlementId),
    enabled: isValidId,
    retry: false,
    // Keep the last loaded detail when a refetch fails so the stale-data
    // banner can render beside it instead of an empty error state.
    placeholderData: (prev: SettlementDetail | undefined) => prev,
  });

  // Dual invalidation (R3-001): BOTH success and error paths invalidate the
  // list so a payment never leaves the list out of sync with the detail.
  const pagarMutation = useMutation({
    mutationFn: (params: MarcarPagadaParams) =>
      marcarSettlementPagada(settlementId, params),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.setQueryData(['settlement', settlementId], result.detail);
      setPagarVisible(false);
      setToast({ message: result.message, type: 'success' });
    },
    onError: (error: unknown) => {
      setToast({
        message: parseApiError(error, 'No se pudo marcar como pagada.'),
        type: 'error',
      });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      // JD-005: also refresh the detail — after a 409 (already paid) the
      // refetched detail flips to the paid state instead of staying on the
      // stale "Pendiente" view that invited the repeat 409. cancelRefetch:
      // false reuses the observer fetch triggered by invalidate() instead of
      // cancelling it (default true would discard the refetched payload).
      queryClient.invalidateQueries(
        { queryKey: ['settlement', settlementId] },
        { cancelRefetch: false },
      );
    },
  });

  const detail = detailQuery.data;
  const isStale = detailQuery.isError;

  if (detailQuery.isPending && isValidId) {
    return (
      <>
        <PageHeader title="Liquidación" />
        <LoadingSpinner className="py-20" />
      </>
    );
  }

  if (!detail) {
    return (
      <>
        <PageHeader title="Liquidación" />
        <EmptyState
          icon="🔍"
          title="Liquidación no encontrada"
          message="No se pudo obtener la liquidación solicitada."
          action={
            <button
              type="button"
              onClick={() => void detailQuery.refetch()}
              className="mt-3 rounded-lg bg-brand-green-forest px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-forest/90"
            >
              Reintentar
            </button>
          }
        />
      </>
    );
  }

  return (
    <div>
      <PageHeader title={`Liquidación #${detail.id_liquidacion}`} />

      {isStale && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          <span>
            No se pudieron cargar los datos. Mostrando la última consulta
            exitosa.
          </span>
          <button
            type="button"
            onClick={() => void detailQuery.refetch()}
            className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {detail.agricultor_nombre}
        </h2>
        <SettlementEstadoBadge estado={detail.estado} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SettlementBreakdown
          montoVentas={detail.monto_ventas}
          comision={detail.comision}
          montoLiquidar={detail.monto_liquidar}
        />

        {detail.pago_liquidacion ? (
          <SettlementPagoCard pago={detail.pago_liquidacion} />
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-300 p-6 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setPagarVisible(true)}
              className="rounded-lg bg-brand-green-forest px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-green-forest/90"
            >
              Marcar como pagada
            </button>
          </div>
        )}
      </div>

      <SettlementVentasList ventas={detail.ventas} />

      <PagarModal
        visible={pagarVisible}
        onClose={() => setPagarVisible(false)}
        onConfirm={(params) => pagarMutation.mutateAsync(params)}
      />

      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
