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
  /** Full name from backend (nombre) */
  nombre?: string;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  fecha_nacimiento?: string | null;
  genero?: string | null;
  direccion?: string | null;
  localidad?: number | null;
  localidad_nombre?: string | null;
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
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
