import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

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
import { crearCorte, getCortes, getTeorico } from '../services/cortes';
import type { Corte, TeoricoResponse } from '../services/cortes';
import type { Column } from '../types';
import { extractApiError } from '../utils/apiErrors';

function hoyISO(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function formatearFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-');
  if (!y || !m || !d) return fecha;
  return `${d}/${m}/${y}`;
}

function formatoDinero(monto: string): string {
  return `$${parseFloat(monto).toFixed(2)}`;
}

export function VendorCorteCaja() {
  const c = useAppColors();
  const queryClient = useQueryClient();
  const [monto, setMonto] = useState('');
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
  });

  const { data: teorico } = useQuery<TeoricoResponse>({
    queryKey: ['cortes-teorico', today],
    queryFn: () => getTeorico(today),
  });

  const confirmarMutation = useMutation({
    mutationFn: async (montoReal: string) => crearCorte(montoReal, hoyISO()),
    onSuccess: () => {
      setMonto('');
      void queryClient.invalidateQueries({ queryKey: ['cortes'] });
      void queryClient.invalidateQueries({ queryKey: ['cortes-teorico'] });
      setToast({ message: 'Corte registrado correctamente', type: 'success' });
    },
    onError: (error: unknown) => {
      const detail = extractApiError(error, ['fecha', 'monto_real']);
      setToast({ message: detail, type: 'error' });
    },
  });

  const confirmar = () => {
    const valor = monto.trim();
    if (!valor || confirmarMutation.isPending) return;
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
        <Card>
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
              onChange={(e) => setMonto(e.target.value)}
              inputMode="decimal"
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
