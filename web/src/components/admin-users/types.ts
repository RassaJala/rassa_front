import { colors } from '../../constants/colors';

import {
  ROLE_LABELS,
  ROLE_OPTIONS as SHARED_ROLE_OPTIONS,
} from '@/common/roles';

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

export const roleLabels = ROLE_LABELS;

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
  SHARED_ROLE_OPTIONS.map((opt) => ({
    ...opt,
    color:
      opt.value === 'farmer'
        ? colors.primary
        : opt.value === 'seller'
          ? colors.accent
          : colors.info,
  }));

export function getFullName(u: User): string {
  return [u.nombre, u.apellido_paterno, u.apellido_materno]
    .filter(Boolean)
    .join(' ');
}
