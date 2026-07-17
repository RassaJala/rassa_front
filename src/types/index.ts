export type UserRole = 'buyer' | 'farmer' | 'admin';

export interface User {
  id: number;
  email: string;
  username?: string;
  id_usuario?: number;
  telefono?: string | null;
  role: UserRole;
  first_name: string;
  last_name: string;
}

export interface Producto {
  id_producto: number;
  nombre_producto: string;
  descripcion: string;
  precio: string;
  stock: number;
  es_perecedero: boolean;
  imagen: string | null;
  estado: boolean;
  categoria: Category;
  unidad: Unidad | null;
  imagenes?: { id_imagen: number; url: string; es_principal: boolean }[];
  imagen_principal: string | null;
  creado_en: string;
}

export interface Order {
  id: number;
  buyer: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  total: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order: number;
  product: number | null;
  quantity: number;
  price: string;
}

export interface Category {
  id_categoria: number;
  nombre: string;
  descripcion: string;
  estado: boolean;
  creado_en: string;
}

export interface Unidad {
  id_unidad: number;
  tipo: string;
}

export interface Unit {
  id_unidad: number;
  nombre: string;
  abreviatura: string;
  estado: boolean;
  creado_en: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export type AdminStackParamList = {
  AdminPanel: undefined;
  CategoryList: undefined;
  UnitList: undefined;
  CategoryTrash: undefined;
  UnitTrash: undefined;
};

export type FarmerStackParamList = {
  ProductList: undefined;
  ProductForm: { productoId?: number };
};
