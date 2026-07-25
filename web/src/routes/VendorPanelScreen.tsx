import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';

import { DataTable } from '../components/layout/DataTable';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Toast } from '../components/ui/Toast';
import type { ToastState } from '../components/ui/Toast';
import { useAppColors } from '../hooks/useAppColors';
import api from '../services/api';
import type { Column } from '../types';

interface PedidoRow {
  id_pedido: number;
  cliente_nombre: string;
  total: string;
  estado_actual: string;
  creado_en: string;
}

type PedidoEstado =
  | 'pendiente'
  | 'confirmado'
  | 'en_preparacion'
  | 'listo_para_retirar'
  | 'entregado'
  | 'cancelado';

const FILTROS: { label: string; value: PedidoEstado | '' }[] = [
  { label: 'Todos', value: '' },
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'Confirmado', value: 'confirmado' },
  { label: 'Preparación', value: 'en_preparacion' },
  { label: 'Listo', value: 'listo_para_retirar' },
  { label: 'Entregado', value: 'entregado' },
  { label: 'Cancelado', value: 'cancelado' },
];

const STATUS_VARIANT: Record<
  string,
  'default' | 'success' | 'warning' | 'error'
> = {
  pendiente: 'warning',
  confirmado: 'default',
  en_preparacion: 'default',
  listo_para_retirar: 'success',
  entregado: 'success',
  cancelado: 'error',
};

const ACCIONES: Record<string, { label: string; estado: string } | null> = {
  pendiente: { label: 'Confirmar', estado: 'confirmado' },
  confirmado: { label: 'Preparar', estado: 'en_preparacion' },
  en_preparacion: { label: 'Marcar Listo', estado: 'listo_para_retirar' },
  listo_para_retirar: { label: 'Entregar', estado: 'entregado' },
  entregado: null,
  cancelado: null,
};

const ESTADOS_NO_TERMINALES = new Set([
  'pendiente',
  'confirmado',
  'en_preparacion',
  'listo_para_retirar',
]);

function extraerError(err: unknown): string | null {
  if (axios.isAxiosError(err) && err.response?.data) {
    const data = err.response.data as Record<string, unknown>;
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.message === 'string') return data.message;
  }
  return null;
}

function formatearFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function VendorPanelScreen() {
  const queryClient = useQueryClient();
  const colors = useAppColors();
  const [filtro, setFiltro] = useState<PedidoEstado | ''>('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  const queryParams = filtro ? `?estado=${filtro}` : '';
  const {
    data: orders = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<PedidoRow[]>({
    queryKey: ['pedidos', filtro],
    queryFn: async () => {
      const { data } = await api.get<{ results?: PedidoRow[] }>(
        `/pedidos/${queryParams}`,
      );
      return data.results ?? [];
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      pedidoId,
      nuevoEstado,
    }: {
      pedidoId: number;
      nuevoEstado: string;
    }) => {
      await api.patch(`/pedidos/${pedidoId}/status/`, {
        nuevo_estado: nuevoEstado,
      });
    },
    onMutate: ({ pedidoId }) => {
      setPendingIds((prev) => new Set(prev).add(pedidoId));
    },
    onSettled: (_data, _error, { pedidoId }) => {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(pedidoId);
        return next;
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      setToast({
        message: 'Estado actualizado correctamente',
        type: 'success',
      });
    },
    onError: (err) => {
      setToast({
        message: extraerError(err) ?? 'Error al cambiar estado',
        type: 'error',
      });
      void queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (pedidoId: number) => {
      await api.patch(`/pedidos/${pedidoId}/status/`, {
        nuevo_estado: 'cancelado',
      });
    },
    onMutate: (pedidoId) => {
      setPendingIds((prev) => new Set(prev).add(pedidoId));
    },
    onSettled: (_data, _error, pedidoId) => {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(pedidoId);
        return next;
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      setToast({ message: 'Pedido cancelado', type: 'success' });
    },
    onError: (err) => {
      setToast({
        message: extraerError(err) ?? 'Error al cancelar pedido',
        type: 'error',
      });
      void queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });

  const isRowPending = (id: number) => pendingIds.has(id);

  const columns: Column<PedidoRow>[] = [
    { key: 'id_pedido', label: 'N°', sortable: true },
    { key: 'cliente_nombre', label: 'Cliente', sortable: true },
    {
      key: 'total',
      label: 'Total',
      sortable: true,
      sortValue: (o) => parseFloat(o.total),
      className: 'font-semibold',
    },
    {
      key: 'creado_en',
      label: 'Fecha',
      sortable: true,
      render: (o) => <span>{formatearFecha(o.creado_en)}</span>,
    },
    {
      key: 'estado_actual',
      label: 'Estado',
      render: (o) => (
        <Badge variant={STATUS_VARIANT[o.estado_actual] ?? 'default'}>
          {o.estado_actual.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (o) => {
        const accion = ACCIONES[o.estado_actual];
        const busy = isRowPending(o.id_pedido);
        return (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {accion ? (
              <Button
                variant="primary"
                disabled={busy}
                onClick={() => {
                  statusMutation.mutate({
                    pedidoId: o.id_pedido,
                    nuevoEstado: accion.estado,
                  });
                }}
              >
                {accion.label}
              </Button>
            ) : null}
            {ESTADOS_NO_TERMINALES.has(o.estado_actual) ? (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      '¿Cancelar este pedido? Esta acción no se puede deshacer.',
                    )
                  ) {
                    cancelMutation.mutate(o.id_pedido);
                  }
                }}
              >
                Cancelar
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <PageHeader title="Pedidos" />

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 24,
        }}
      >
        {FILTROS.map((f) => {
          const selected = filtro === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFiltro(f.value)}
              style={{
                padding: '8px 18px',
                borderRadius: 20,
                border: `1.5px solid ${selected ? colors.brand : colors.border}`,
                background: selected ? colors.brand : 'transparent',
                color: selected ? '#FFFFFF' : colors.fg,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {isError ? (
        <div
          style={{
            textAlign: 'center',
            padding: 40,
            color: colors.muted,
          }}
        >
          <p style={{ marginBottom: 16 }}>Error al cargar pedidos</p>
          <Button variant="secondary" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <DataTable
          data={orders}
          columns={columns}
          keyExtractor={(o) => o.id_pedido}
          emptyTitle="No hay pedidos"
          emptyMessage={
            filtro ? 'No hay pedidos en este estado' : 'No hay pedidos todavía'
          }
        />
      )}

      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
