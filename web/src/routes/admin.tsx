import { PageHeader } from "../components/layout/PageHeader";
import { DataTable } from "../components/layout/DataTable";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import type { Column, Role } from "../types";

// --- Types ---

interface UserRow {
  id: number;
  name: string;
  email: string;
  rol: Role;
  fechaRegistro: string;
  estado: "Activo" | "Inactivo";
}

interface AdminProductRow {
  id: number;
  nombre: string;
  precio: string;
  stock: number;
  categoria: string;
  agricultor: string;
  estado: "Activo" | "Inactivo";
}

interface AdminOrderRow {
  id: number;
  comprador: string;
  total: string;
  fecha: string;
  estado: "Pendiente" | "En camino" | "Entregado" | "Cancelado";
}

// --- Mock Data ---

const sampleUsers: UserRow[] = [
  {
    id: 1,
    name: "María García",
    email: "maria@rassa.com",
    rol: "cliente",
    fechaRegistro: "10/01/2026",
    estado: "Activo",
  },
  {
    id: 2,
    name: "Juan López",
    email: "juan@rassa.com",
    rol: "agricultor",
    fechaRegistro: "15/02/2026",
    estado: "Activo",
  },
  {
    id: 3,
    name: "Ana Martínez",
    email: "ana@rassa.com",
    rol: "vendedor",
    fechaRegistro: "03/03/2026",
    estado: "Activo",
  },
  {
    id: 4,
    name: "Carlos Ruiz",
    email: "carlos@rassa.com",
    rol: "admin",
    fechaRegistro: "01/01/2026",
    estado: "Activo",
  },
  {
    id: 5,
    name: "Laura Díaz",
    email: "laura@rassa.com",
    rol: "cliente",
    fechaRegistro: "20/04/2026",
    estado: "Inactivo",
  },
];

const sampleAdminProducts: AdminProductRow[] = [
  {
    id: 1,
    nombre: "Tomate orgánico",
    precio: "$150 / kg",
    stock: 45,
    categoria: "Verduras",
    agricultor: "Juan López",
    estado: "Activo",
  },
  {
    id: 2,
    nombre: "Lechuga hidropónica",
    precio: "$100 / unit",
    stock: 120,
    categoria: "Verduras",
    agricultor: "Pedro Gómez",
    estado: "Activo",
  },
  {
    id: 3,
    nombre: "Pimiento morrón",
    precio: "$85 / kg",
    stock: 60,
    categoria: "Verduras",
    agricultor: "Juan López",
    estado: "Activo",
  },
  {
    id: 4,
    nombre: "Zanahoria baby",
    precio: "$65 / kg",
    stock: 200,
    categoria: "Tubérculos",
    agricultor: "Elena Torres",
    estado: "Activo",
  },
  {
    id: 5,
    nombre: "Cebolla colorada",
    precio: "$40 / kg",
    stock: 0,
    categoria: "Tubérculos",
    agricultor: "Pedro Gómez",
    estado: "Inactivo",
  },
  {
    id: 6,
    nombre: "Miel artesanal",
    precio: "$500 / frasco",
    stock: 30,
    categoria: "Apicultura",
    agricultor: "Elena Torres",
    estado: "Activo",
  },
];

const sampleAdminOrders: AdminOrderRow[] = [
  {
    id: 1,
    comprador: "María García",
    total: "$750",
    fecha: "15/07/2026",
    estado: "Entregado",
  },
  {
    id: 2,
    comprador: "Laura Díaz",
    total: "$1.000",
    fecha: "14/07/2026",
    estado: "Pendiente",
  },
  {
    id: 3,
    comprador: "María García",
    total: "$255",
    fecha: "12/07/2026",
    estado: "Cancelado",
  },
  {
    id: 4,
    comprador: "Sofía Vargas",
    total: "$520",
    fecha: "10/07/2026",
    estado: "En camino",
  },
  {
    id: 5,
    comprador: "Laura Díaz",
    total: "$480",
    fecha: "08/07/2026",
    estado: "Entregado",
  },
];

// --- Columns ---

const roleVariant: Record<Role, "default" | "success" | "warning" | "error"> = {
  cliente: "default",
  agricultor: "success",
  vendedor: "warning",
  admin: "error",
};

const userColumns: Column<UserRow>[] = [
  { key: "name", label: "Nombre", sortable: true },
  { key: "email", label: "Email" },
  {
    key: "rol",
    label: "Rol",
    render: (u) => <Badge variant={roleVariant[u.rol]}>{u.rol}</Badge>,
  },
  { key: "fechaRegistro", label: "Fecha registro", sortable: true },
  {
    key: "estado",
    label: "Estado",
    render: (u) => (
      <Badge variant={u.estado === "Activo" ? "success" : "default"}>
        {u.estado}
      </Badge>
    ),
  },
];

const adminProductColumns: Column<AdminProductRow>[] = [
  { key: "nombre", label: "Nombre", sortable: true },
  {
    key: "precio",
    label: "Precio",
    sortable: true,
    className: "font-semibold text-brand-orange",
  },
  { key: "stock", label: "Stock", sortable: true },
  { key: "categoria", label: "Categoría" },
  { key: "agricultor", label: "Agricultor", sortable: true },
  {
    key: "estado",
    label: "Estado",
    render: (p) => (
      <Badge variant={p.estado === "Activo" ? "success" : "default"}>
        {p.estado}
      </Badge>
    ),
  },
];

const adminOrderStatusVariant: Record<
  AdminOrderRow["estado"],
  "default" | "success" | "warning" | "error"
> = {
  Pendiente: "warning",
  "En camino": "default",
  Entregado: "success",
  Cancelado: "error",
};

const adminOrderColumns: Column<AdminOrderRow>[] = [
  { key: "id", label: "# Pedido", sortable: true },
  { key: "comprador", label: "Comprador", sortable: true },
  {
    key: "total",
    label: "Total",
    sortable: true,
    className: "font-semibold text-brand-orange",
  },
  { key: "fecha", label: "Fecha", sortable: true },
  {
    key: "estado",
    label: "Estado",
    render: (o) => (
      <Badge variant={adminOrderStatusVariant[o.estado]}>{o.estado}</Badge>
    ),
  },
];

// --- Pages ---

export function AdminUsers() {
  return (
    <>
      <PageHeader
        title="Usuarios"
        action={<Button variant="primary">Agregar usuario</Button>}
      />
      <DataTable
        data={sampleUsers}
        columns={userColumns}
        keyExtractor={(u) => u.id}
        emptyTitle="No hay usuarios"
        emptyMessage="Cuando se registren usuarios, aparecerán aquí."
      />
    </>
  );
}

export function AdminProducts() {
  return (
    <>
      <PageHeader
        title="Productos"
        action={<Button variant="primary">Agregar producto</Button>}
      />
      <DataTable
        data={sampleAdminProducts}
        columns={adminProductColumns}
        keyExtractor={(p) => p.id}
        emptyTitle="No hay productos"
        emptyMessage="Cuando los agricultores publiquen productos, aparecerán aquí."
      />
    </>
  );
}

export function AdminOrders() {
  return (
    <>
      <PageHeader title="Pedidos" />
      <DataTable
        data={sampleAdminOrders}
        columns={adminOrderColumns}
        keyExtractor={(o) => o.id}
        emptyTitle="No hay pedidos"
        emptyMessage="Cuando los compradores hagan pedidos, aparecerán aquí."
      />
    </>
  );
}
