import { DataTable } from '../components/layout/DataTable';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import type { Column } from '../types';

// --- Types ---

interface SaleRow {
  id: number;
  producto: string;
  cantidad: number;
  total: string;
  fecha: string;
  estado: 'Completada' | 'Pendiente' | 'Cancelada';
  imagen_url?: string | null;
}

interface SellerOrderRow {
  id: number;
  comprador: string;
  producto: string;
  cantidad: number;
  total: string;
  fecha: string;
  estado: 'Pendiente' | 'En camino' | 'Entregado';
  imagen_url?: string | null;
}

// --- Mock Data ---

const sampleSales: SaleRow[] = [
  {
    id: 1,
    producto: 'Tomate orgánico',
    cantidad: 5,
    total: '$750',
    fecha: '15/07/2026',
    estado: 'Completada',
  },
  {
    id: 2,
    producto: 'Lechuga hidropónica',
    cantidad: 10,
    total: '$1.000',
    fecha: '14/07/2026',
    estado: 'Pendiente',
  },
  {
    id: 3,
    producto: 'Pimiento morrón',
    cantidad: 3,
    total: '$255',
    fecha: '12/07/2026',
    estado: 'Cancelada',
  },
  {
    id: 4,
    producto: 'Zanahoria baby',
    cantidad: 8,
    total: '$520',
    fecha: '10/07/2026',
    estado: 'Completada',
  },
  {
    id: 5,
    producto: 'Cebolla colorada',
    cantidad: 12,
    total: '$480',
    fecha: '08/07/2026',
    estado: 'Completada',
  },
];

const sampleSellerOrders: SellerOrderRow[] = [
  {
    id: 1,
    comprador: 'María García',
    producto: 'Tomate orgánico',
    cantidad: 3,
    total: '$450',
    fecha: '16/07/2026',
    estado: 'Pendiente',
  },
  {
    id: 2,
    comprador: 'Carlos López',
    producto: 'Lechuga hidropónica',
    cantidad: 5,
    total: '$500',
    fecha: '15/07/2026',
    estado: 'En camino',
  },
  {
    id: 3,
    comprador: 'Ana Martínez',
    producto: 'Zanahoria baby',
    cantidad: 8,
    total: '$520',
    fecha: '14/07/2026',
    estado: 'Entregado',
  },
  {
    id: 4,
    comprador: 'Juan Pérez',
    producto: 'Pimiento morrón',
    cantidad: 2,
    total: '$170',
    fecha: '13/07/2026',
    estado: 'Entregado',
  },
];

// --- Columns ---

const saleStatusVariant: Record<
  SaleRow['estado'],
  'success' | 'warning' | 'error'
> = {
  Completada: 'success',
  Pendiente: 'warning',
  Cancelada: 'error',
};

const saleColumns: Column<SaleRow>[] = [
  {
    key: 'producto',
    label: 'Producto',
    sortable: true,
    render: (s) => (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            overflow: 'hidden',
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            background: '#E8F5E9',
          }}
        >
          {s.imagen_url ? (
            <img
              src={s.imagen_url}
              alt={s.producto}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 16 }}>📦</span>
          )}
        </span>
        {s.producto}
      </span>
    ),
  },
  { key: 'cantidad', label: 'Cantidad', sortable: true },
  {
    key: 'total',
    label: 'Total',
    sortable: true,
    className: 'font-semibold text-brand-orange',
  },
  { key: 'fecha', label: 'Fecha', sortable: true },
  {
    key: 'estado',
    label: 'Estado',
    render: (s) => (
      <Badge variant={saleStatusVariant[s.estado]}>{s.estado}</Badge>
    ),
  },
];

const sellerOrderStatusVariant: Record<
  SellerOrderRow['estado'],
  'default' | 'success' | 'warning' | 'error'
> = {
  Pendiente: 'warning',
  'En camino': 'default',
  Entregado: 'success',
};

const sellerOrderColumns: Column<SellerOrderRow>[] = [
  { key: 'comprador', label: 'Comprador', sortable: true },
  {
    key: 'producto',
    label: 'Producto',
    sortable: true,
    render: (o) => (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            overflow: 'hidden',
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            background: '#E8F5E9',
          }}
        >
          {o.imagen_url ? (
            <img
              src={o.imagen_url}
              alt={o.producto}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 16 }}>📦</span>
          )}
        </span>
        {o.producto}
      </span>
    ),
  },
  { key: 'cantidad', label: 'Cantidad', sortable: true },
  {
    key: 'total',
    label: 'Total',
    sortable: true,
    className: 'font-semibold text-brand-orange',
  },
  { key: 'fecha', label: 'Fecha', sortable: true },
  {
    key: 'estado',
    label: 'Estado',
    render: (o) => (
      <Badge variant={sellerOrderStatusVariant[o.estado]}>{o.estado}</Badge>
    ),
  },
];

// --- Pages ---

export function SellerSales() {
  return (
    <>
      <PageHeader
        title="Mis Ventas"
        action={<Button variant="primary">Nueva venta</Button>}
      />
      <DataTable
        data={sampleSales}
        columns={saleColumns}
        keyExtractor={(s) => s.id}
        emptyTitle="No tenés ventas todavía"
        emptyMessage="Cuando registres ventas, van a aparecer acá."
      />
    </>
  );
}

export function SellerOrders() {
  return (
    <>
      <PageHeader title="Pedidos" />
      <DataTable
        data={sampleSellerOrders}
        columns={sellerOrderColumns}
        keyExtractor={(o) => o.id}
        emptyTitle="No hay pedidos"
        emptyMessage="Cuando los compradores te hagan pedidos, van a aparecer acá."
      />
    </>
  );
}
