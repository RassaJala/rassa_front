import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchTiposPago } from '@/common/payments';
import type { TipoPago } from '@/common/payments';
import type { MarcarPagadaParams } from '@/common/settlements';
import { FormSelect } from '@/components/ui/FormSelect';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAppColors } from '@/hooks/useAppColors';
import api from '@/services/api';
import { parseApiError } from '@/utils/apiErrors';

interface PagarModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (params: MarcarPagadaParams) => Promise<unknown>;
}

export function PagarModal({ visible, onClose, onConfirm }: PagarModalProps) {
  const colors = useAppColors();
  const [selectedTipo, setSelectedTipo] = useState<number | null>(null);
  const [referencia, setReferencia] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    data: tiposPago = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<TipoPago[]>({
    queryKey: ['tipos-pago'],
    queryFn: () => fetchTiposPago(api),
    enabled: visible,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });

  // Reset draft state every time the modal reopens.
  useEffect(() => {
    if (visible) {
      setSelectedTipo(null);
      setReferencia('');
      setSubmitError('');
      setIsSubmitting(false);
    }
  }, [visible]);

  // Default to the first payment type once the list arrives.
  useEffect(() => {
    if (tiposPago.length > 0 && selectedTipo === null) {
      setSelectedTipo(tiposPago[0]?.id_tipo_pago ?? null);
    }
  }, [tiposPago, selectedTipo]);

  async function handleConfirm() {
    if (selectedTipo === null || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const trimmed = referencia.trim();
      await onConfirm(
        trimmed
          ? { tipo_pago: selectedTipo, referencia: trimmed }
          : { tipo_pago: selectedTipo },
      );
    } catch (e) {
      setSubmitError(parseApiError(e, 'No se pudo registrar el pago'));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Registrar pago"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl dark:bg-gray-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">
          Registrar pago
        </h2>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Tipo de pago
        </label>
        {isLoading ? (
          <LoadingSpinner className="py-6" />
        ) : isError ? (
          <button
            type="button"
            onClick={() => void refetch()}
            className="py-3 text-sm font-medium text-brand-red-coral"
          >
            {parseApiError(error, 'No se pudieron cargar los tipos de pago')}
          </button>
        ) : tiposPago.length === 0 ? (
          // CONV-5: an empty list must not silently dead-end the submit — the
          // modal explains the situation and offers a retry, and stays open.
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-3 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              No hay tipos de pago configurados
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-2 text-sm font-semibold text-brand-green-forest transition-colors hover:underline"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <FormSelect
            colors={colors}
            value={selectedTipo ?? ''}
            onChange={(e) => {
              const v = Number(e.target.value);
              setSelectedTipo(Number.isNaN(v) ? null : v);
            }}
            aria-label="Tipo de pago"
          >
            {tiposPago.map((tipo) => (
              <option key={tipo.id_tipo_pago} value={tipo.id_tipo_pago}>
                {tipo.nombre}
              </option>
            ))}
          </FormSelect>
        )}

        <div className="mt-4">
          <Input
            label="Referencia (opcional)"
            aria-label="Referencia (opcional)"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder="Nº de transferencia o efectivo"
            colors={colors}
          />
        </div>

        {submitError && (
          <p className="mt-3 text-sm font-medium text-brand-red-coral">
            {submitError}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isSubmitting || selectedTipo === null}
            className="rounded-lg bg-brand-green-forest px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-forest/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? 'Registrando…' : 'Confirmar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}
