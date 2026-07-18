import { PageHeader } from '../components/layout/PageHeader';
import { DataTable } from '../components/layout/DataTable';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import type { Column } from '../types';

// --- Types ---

interface ProductRow {
  id: number;
  nombre: string;
  precio: string;
  stock: number;
  categoria: string;
  estado: 'Activo' | 'Inactivo';
}

interface OrderRow {
  id: number;
  producto: string;
  cantidad: number;
  total: string;
  fecha: string;
  estado: 'Pendiente' | 'Completado' | 'Cancelado';
}

// --- Mock Data ---

const sampleProducts: ProductRow[] = [
  { id: 1, nombre: 'Tomate orgánico', precio: '$150 / kg', stock: 45, categoria: 'Verduras', estado: 'Activo' },
  { id: 2, nombre: 'Lechuga hidropónica', precio: '$100 / unit', stock: 120, categoria: 'Verduras', estado: 'Activo' },
  { id: 3, nombre: 'Pimiento morrón', precio: '$85 / kg', stock: 60, categoria: 'Verduras', estado: 'Inactivo' },
  { id: 4, nombre: 'Zanahoria baby', precio: '$65 / kg', stock: 200, categoria: 'Tubérculos', estado: 'Activo' },
  { id: 5, nombre: 'Cebolla colorada', precio: '$40 / kg', stock: 0, categoria: 'Tubérculos', estado: 'Inactivo' },
];

const sampleOrders: OrderRow[] = [
  { id: 1, producto: 'Tomate orgánico', cantidad: 5, total: '$750', fecha: '15/07/2026', estado: 'Completado' },
  { id: 2, producto: 'Lechuga hidropónica', cantidad: 10, total: '$1.000', fecha: '14/07/2026', estado: 'Pendiente' },
  { id: 3, producto: 'Pimiento morrón', cantidad: 3, total: '$255', fecha: '12/07/2026', estado: 'Cancelado' },
  { id: 4, producto: 'Zanahoria baby', cantidad: 8, total: '$520', fecha: '10/07/2026', estado: 'Completado' },
];

// --- Columns ---

const productColumns: Column<ProductRow>[] = [
  { key: 'nombre', label: 'Nombre', sortable: true },
  {
    key: 'precio',
    label: 'Precio',
    sortable: true,
    className: 'font-semibold text-brand-orange',
  },
  { key: 'stock', label: 'Stock', sortable: true },
  { key: 'categoria', label: 'Categoría' },
  {
    key: 'estado',
    label: 'Estado',
    render: (p) => (
      <Badge variant={p.estado === 'Activo' ? 'success' : 'default'}>
        {p.estado}
      </Badge>
    ),
  },
];

const orderStatusVariant: Record<OrderRow['estado'], 'success' | 'warning' | 'error'> = {
  Completado: 'success',
  Pendiente: 'warning',
  Cancelado: 'error',
};

const orderColumns: Column<OrderRow>[] = [
  { key: 'producto', label: 'Producto', sortable: true },
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
      <Badge variant={orderStatusVariant[o.estado]}>
        {o.estado}
      </Badge>
    ),
  },
];

// --- Pages ---

export function FarmerProducts() {
  return (
    <>
      <PageHeader
        title="Mis Productos"
        action={
          <a href="/agricultor/productos/nuevo">
            <Button variant="primary">Agregar producto</Button>
          </a>
        }
      />
      <DataTable
        data={sampleProducts}
        columns={productColumns}
        keyExtractor={(p) => p.id}
        emptyTitle="No tenés productos todavía"
        emptyMessage="Publicá lo que producís para que los compradores te encuentren."
      />
    </>
  );
}

export function FarmerOrders() {
  return (
    <>
      <PageHeader title="Pedidos" />
      <DataTable
        data={sampleOrders}
        columns={orderColumns}
        keyExtractor={(o) => o.id}
        emptyTitle="No hay pedidos"
        emptyMessage="Cuando los compradores te hagan pedidos, van a aparecer acá."
      />
    </>
  );
}
