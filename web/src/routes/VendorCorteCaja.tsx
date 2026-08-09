import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { formatearFecha, formatoDinero, hoyISO } from '@/common/cortes';
import { colors } from '../constants/colors';
import { DataTable } from '../components/layout/DataTable';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Toast } from '../components/ui/Toast';
import type { ToastState } from '../components/ui/Toast';
import { useAppColors } from '../hooks/useAppColors';
import { useOnline } from '../hooks/useOnline';
import { crearCorte, getCortes, getTeorico } from '../services/cortes';
import type { Corte, TeoricoResponse } from '../services/cortes';
import type { Column } from '../types';
import { extractApiError } from '../utils/apiErrors';

export function VendorCorteCaja() {
  const c = useAppColors();
  const online = useOnline();
  const queryClient = useQueryClient();
  const [monto, setMonto] = useState('');
  const [ultimoCorte, setUltimoCorte] = useState<Corte | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const today = hoyISO();

  const {
    data: cortes = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Corte[]>({
    queryKey: ['cortes'],
    queryFn: getCortes,
    staleTime: 30_000,
  });

  const { data: teorico } = useQuery<TeoricoResponse>({
    queryKey: ['cortes-teorico', today],
    queryFn: () => getTeorico(today),
    staleTime: 30_000,
  });

  const confirmarMutation = useMutation({
    mutationFn: async (montoReal: string) => crearCorte(montoReal, hoyISO()),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['cortes'] });
      const prev = queryClient.getQueryData<Corte[]>(['cortes']);
      return { prev };
    },
    onSuccess: (corte) => {
      setUltimoCorte(corte);
      setMonto('');
      setToast({ message: 'Corte registrado correctamente', type: 'success' });
    },
    onError: (
      error: unknown,
      _montoReal: string,
      context: { prev: Corte[] | undefined } | undefined,
    ) => {
      if (context?.prev) {
        queryClient.setQueryData(['cortes'], context.prev);
      }
      const detail = extractApiError(error, ['fecha', 'monto_real']);
      setToast({ message: detail, type: 'error' });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['cortes'] });
      void queryClient.invalidateQueries({ queryKey: ['cortes-teorico'] });
    },
  });

  const confirmar = () => {
    const valor = monto.trim();
    const num = parseFloat(valor);
    if (!valor || confirmarMutation.isPending || Number.isNaN(num) || num < 0) {
      return;
    }
    confirmarMutation.mutate(valor);
  };

  const columns: Column<Corte>[] = [
    {
      key: 'fecha',
      label: 'Fecha',
      sortable: true,
      render: (corte) => <span>{formatearFecha(corte.fecha)}</span>,
    },
    {
      key: 'monto_teorico',
      label: 'Monto teórico',
      sortable: true,
      sortValue: (corte) => parseFloat(corte.monto_teorico),
      render: (corte) => <span>{formatoDinero(corte.monto_teorico)}</span>,
    },
    {
      key: 'monto_real',
      label: 'Monto contado',
      sortable: true,
      sortValue: (corte) => parseFloat(corte.monto_real),
      render: (corte) => <span>{formatoDinero(corte.monto_real)}</span>,
    },
    {
      key: 'diferencia',
      label: 'Diferencia',
      sortable: true,
      sortValue: (corte) => parseFloat(corte.diferencia),
      render: (corte) => {
        const hasDiff = parseFloat(corte.diferencia) !== 0;
        return (
          <span
            style={{
              color: hasDiff ? c.coral : colors.success,
              fontWeight: 700,
            }}
          >
            {formatoDinero(corte.diferencia)}
          </span>
        );
      },
    },
  ];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const montoEsperado = teorico?.monto_teorico ?? '0.00';
  const canConfirmar = monto.trim().length > 0 && !confirmarMutation.isPending;

  return (
    <div>
      <PageHeader title="Corte de caja" />

      <div style={{ display: 'grid', gap: 24 }}>
        {!online && (
          <div
            className="flex items-center gap-2 rounded-lg border px-3 py-2"
            style={{
              backgroundColor: c.isDark
                ? colors.admCoralBgD
                : colors.admCoralBgL,
              borderColor: c.coral,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: c.coral }}>
              Sin conexión a Internet — los datos pueden estar desactualizados
            </span>
          </div>
        )}
        <Card className="dark:!bg-[#263028] dark:!border-[#353D35]">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              maxWidth: 420,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ color: c.muted, fontSize: 14 }}>
                Monto esperado
              </span>
              <span style={{ fontSize: 22, fontWeight: 700, color: c.fg }}>
                {formatoDinero(montoEsperado)}
              </span>
            </div>
            <Input
              label="Monto contado"
              value={monto}
              onChange={(e) => {
                const raw = e.target.value;
                const cleaned = raw
                  .replace(/[^\d.]/g, '')
                  .replace(/(\..*)\./g, '$1');
                setMonto(cleaned);
                setUltimoCorte(null);
              }}
              inputMode="decimal"
              maxLength={15}
              placeholder="0.00"
              colors={c}
            />
            <Button
              variant="primary"
              disabled={!canConfirmar}
              onClick={confirmar}
            >
              Confirmar corte
            </Button>
            {ultimoCorte != null &&
              (() => {
                const diff = parseFloat(ultimoCorte.diferencia);
                const esCero = diff === 0;
                const bannerColor = esCero ? colors.success : c.coral;
                const texto = esCero
                  ? 'Caja cuadrada — diferencia $0.00'
                  : diff > 0
                    ? `Sobró ${formatoDinero(ultimoCorte.diferencia)}`
                    : `Faltó ${formatoDinero(String(Math.abs(diff)))}`;
                return (
                  <div
                    className="flex items-center gap-2 rounded-lg border px-3 py-2"
                    style={{
                      backgroundColor: esCero
                        ? colors.activeGreenBg
                        : c.isDark
                          ? colors.admCoralBgD
                          : colors.admCoralBgL,
                      borderColor: bannerColor,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: bannerColor,
                      }}
                    >
                      {texto}
                    </span>
                  </div>
                );
              })()}
          </div>
        </Card>

        <div>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: c.muted,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 12,
            }}
          >
            Historial
          </h2>
          {isError ? (
            <div style={{ textAlign: 'center', padding: 40, color: c.muted }}>
              <p style={{ marginBottom: 16 }}>Error al cargar cortes de caja</p>
              <Button variant="secondary" onClick={() => void refetch()}>
                Reintentar
              </Button>
            </div>
          ) : (
            <DataTable
              data={cortes}
              columns={columns}
              keyExtractor={(corte) => corte.id_corte}
              emptyTitle="No hay cortes registrados"
              emptyMessage="Cuando hagas tu primer corte, va a aparecer acá."
            />
          )}
        </div>
      </div>

      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
