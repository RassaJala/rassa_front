import { PageHeader } from "../components/layout/PageHeader";
import { DataTable } from "../components/layout/DataTable";
import { Badge } from "../components/ui/Badge";
import type { Column } from "../types";

interface OrderRow {
  id: number;
  productos: string;
  total: string;
  fecha: string;
  estado: "Pendiente" | "En camino" | "Entregado" | "Cancelado";
}

const sampleOrders: OrderRow[] = [
  {
    id: 1,
    productos: "Tomate orgánico, Lechuga",
    total: "$950",
    fecha: "15/07/2026",
    estado: "Entregado",
  },
  {
    id: 2,
    productos: "Zanahoria baby",
    total: "$195",
    fecha: "14/07/2026",
    estado: "En camino",
  },
  {
    id: 3,
    productos: "Fresas orgánicas",
    total: "$400",
    fecha: "12/07/2026",
    estado: "Pendiente",
  },
  {
    id: 4,
    productos: "Pimiento morrón",
    total: "$255",
    fecha: "10/07/2026",
    estado: "Cancelado",
  },
];

const statusVariant: Record<
  OrderRow["estado"],
  "success" | "warning" | "error" | "default"
> = {
  Entregado: "success",
  "En camino": "default",
  Pendiente: "warning",
  Cancelado: "error",
};

const columns: Column<OrderRow>[] = [
  { key: "id", label: "#", sortable: true },
  { key: "productos", label: "Productos", sortable: true },
  {
    key: "total",
    label: "Total",
    sortable: true,
    className: "font-semibold text-brand-green-forest",
  },
  { key: "fecha", label: "Fecha", sortable: true },
  {
    key: "estado",
    label: "Estado",
    render: (o) => <Badge variant={statusVariant[o.estado]}>{o.estado}</Badge>,
  },
];

export function BuyerOrders() {
  return (
    <>
      <PageHeader title="Mis Pedidos" />
      <DataTable
        data={sampleOrders}
        columns={columns}
        keyExtractor={(o) => o.id}
        emptyTitle="No tenés pedidos"
        emptyMessage="Cuando hagas tu primera compra, los pedidos aparecerán acá."
      />
    </>
  );
}
