import { ROLE_OPTIONS as SHARED_ROLE_OPTIONS } from '@/common/roles';

import { colors } from './colors';

export { ROLE_LABELS } from '@/common/roles';
export type { UserRole } from '@/common/roles';

export const ROLE_FILTERS = [
  { label: 'Todos', value: null as string | null },
  { label: 'Admin', value: 'Admin' },
  { label: 'Agricultor', value: 'Agricultor' },
  { label: 'Vendedor', value: 'Vendedor' },
  { label: 'Cliente', value: 'Cliente' },
] as const;

export const STATUS_FILTERS = [
  { label: 'Todos', value: null as string | null },
  { label: 'Activos', value: 'true' },
  { label: 'Inactivos', value: 'false' },
] as const;

export const ROLE_OPTIONS = SHARED_ROLE_OPTIONS.map((opt) => ({
  ...opt,
  color:
    opt.value === 'farmer'
      ? colors.primary
      : opt.value === 'seller'
        ? colors.accent
        : colors.info,
})) as readonly {
  readonly label: string;
  readonly value: 'farmer' | 'seller' | 'buyer';
  readonly color: string;
}[];

export const ROLE_COLOR_MAP: Record<string, string> = {
  admin: colors.error,
  farmer: colors.primary,
  seller: colors.accent,
  buyer: colors.info,
};
