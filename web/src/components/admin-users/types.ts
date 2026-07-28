import { colors } from '../../constants/colors';

export type UserRole = 'admin' | 'farmer' | 'seller' | 'buyer';

export interface User {
  id: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  email: string;
  role: UserRole;
  estado: boolean;
  creado_en: string;
}

export const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  farmer: 'Agricultor',
  seller: 'Vendedor',
  buyer: 'Cliente',
};

export const roleColors: Record<UserRole, string> = {
  admin: colors.brand.redCoral,
  farmer: colors.primary,
  seller: colors.accent,
  buyer: colors.info,
};

export const ROLE_FILTERS = [
  { label: 'Todos', value: '' },
  { label: 'Admin', value: 'Admin' },
  { label: 'Agricultor', value: 'Agricultor' },
  { label: 'Vendedor', value: 'Vendedor' },
  { label: 'Cliente', value: 'Cliente' },
] as const;

export const STATUS_FILTERS = [
  { label: 'Todos', value: '' },
  { label: 'Activos', value: 'true' },
  { label: 'Inactivos', value: 'false' },
] as const;

export const ROLE_OPTIONS: { label: string; value: UserRole; color: string }[] =
  [
    { label: 'Agricultor', value: 'farmer', color: colors.primary },
    { label: 'Vendedor', value: 'seller', color: colors.accent },
    { label: 'Cliente', value: 'buyer', color: colors.info },
  ];

export function getFullName(u: User): string {
  return [u.nombre, u.apellido_paterno, u.apellido_materno]
    .filter(Boolean)
    .join(' ');
}
