import { colors } from './colors';

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

export const ROLE_OPTIONS = [
  { label: 'Admin', value: 'admin', color: colors.error },
  { label: 'Agricultor', value: 'farmer', color: colors.primary },
  { label: 'Vendedor', value: 'seller', color: colors.accent },
  { label: 'Cliente', value: 'buyer', color: colors.info },
] as const;

export const ROLE_COLOR_MAP: Record<string, string> = {
  admin: colors.error,
  farmer: colors.primary,
  seller: colors.accent,
  buyer: colors.info,
};
