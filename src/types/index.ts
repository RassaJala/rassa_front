export type UserRole = "Cliente" | "Agricultor" | "Administrador" | "Vendedor";

export interface User {
  id: number;
  email: string;
  phone_number: string;
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
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
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
