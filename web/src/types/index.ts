export type Role = 'cliente' | 'agricultor' | 'vendedor' | 'admin';

export function normalizeRole(apiRole: string | undefined): Role {
  switch (apiRole) {
    case 'admin':
      return 'admin';
    case 'farmer':
      return 'agricultor';
    case 'seller':
      return 'vendedor';
    case 'buyer':
      return 'cliente';
    default:
      return 'cliente';
  }
}

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

export interface Family {
  id_familia: number;
  fk_jefe_familia: number | null;
  jefe_nombre: string | null;
  nombre_familia: string;
  nombre?: string;
  detalle_familia: string | null;
  creado_en: string;
  estado: boolean;
}

export interface FamilyMember {
  id_familia_usuario: number;
  fk_usuario: number;
  usuario_nombre: string;
  usuario_correo: string;
  fk_familia: number;
  estado: boolean;
  creado_en: string;
}

export interface SearchUserResult {
  id_usuario: number;
  email: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
}
