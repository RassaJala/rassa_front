import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { DataTable } from '~/components/layout/DataTable';
import { PageHeader } from '~/components/layout/PageHeader';
import { Badge } from '~/components/ui/Badge';
import { LoadingSpinner } from '~/components/ui/LoadingSpinner';
import { Button } from '~/components/ui/Button';
import api from '~/services/api';
import type { Column } from '~/types';

interface OrderRow {
  id_pedido: number;
  total: string;
  estado_actual: string;
  creado_en: string;
  productos?: string[];
  has_more_productos?: boolean;
  expirado?: boolean;
}

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

export function BuyerOrders() {
  const {
    data: orders = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<OrderRow[]>({
    queryKey: ['pedidos-cliente'],
    queryFn: async () => {
      const { data } = await api.get<{ results?: OrderRow[] }>('/pedidos/');
      return data.results ?? [];
    },
  });

  const columns: Column<OrderRow>[] = [
    {
      key: 'id_pedido',
      label: '#',
      sortable: true,
    },
    {
      key: 'productos',
      label: 'Productos',
      sortable: true,
      sortValue: (o) => o.productos?.join(', ') ?? '',
      render: (o) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {o.productos && o.productos.length > 0
            ? o.productos.join(', ') + (o.has_more_productos ? '...' : '')
            : '—'}
        </span>
      ),
    },
    {
      key: 'total',
      label: 'Total',
      sortable: true,
      sortValue: (o) => parseFloat(o.total),
      className: 'font-semibold text-brand-green-forest',
    },
    {
      key: 'creado_en',
      label: 'Fecha',
      sortable: true,
      sortValue: (o) => o.creado_en,
      render: (o) => <span>{formatearFecha(o.creado_en)}</span>,
    },
    {
      key: 'estado_actual',
      label: 'Estado',
      render: (o) => (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Badge variant={STATUS_VARIANT[o.estado_actual] ?? 'default'}>
            {o.estado_actual.replace(/_/g, ' ')}
          </Badge>
          {o.expirado === true ? <Badge variant="error">Expirado</Badge> : null}
        </div>
      ),
    },
    {
      key: 'accion',
      label: '',
      render: (o) => (
        <Link to={`/cliente/pedidos/${o.id_pedido}`}>
          <Button variant="secondary">Ver detalle</Button>
        </Link>
      ),
    },
  ];

  if (isLoading) {
    return <LoadingSpinner className="mt-20" />;
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="Mis Pedidos" />
        <div className="flex flex-col items-center gap-4 py-20 text-gray-500 dark:text-gray-400">
          <p>Error al cargar pedidos</p>
          <Button variant="secondary" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Mis Pedidos" />
      <DataTable
        data={orders}
        columns={columns}
        keyExtractor={(o) => o.id_pedido}
        emptyTitle="No tienes pedidos"
        emptyMessage="Cuando hagas tu primera compra, los pedidos aparecerán acá."
      />
    </div>
  );
}
