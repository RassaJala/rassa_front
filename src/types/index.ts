export type UserRole = 'admin' | 'seller' | 'farmer' | 'buyer';

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

export interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  stock: number;
  image: string;
  farmer: number;
  category: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  Notificaciones: undefined;
};
