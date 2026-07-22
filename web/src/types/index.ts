export type Role = 'cliente' | 'agricultor' | 'vendedor' | 'admin';

export interface User {
  id: number;
  email: string;
  nombre: string;
  rol: Role;
  apellido_paterno: string;
  apellido_materno?: string;
  telefono?: string;
  fecha_nacimiento?: string;
  genero?: string;
  direccion?: string;
  municipio_id?: number;
  municipio_nombre?: string;
  localidad?: number;
  localidad_nombre?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface NavItem {
  key: string;
  label: string;
  icon: string;
  path: string;
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}
