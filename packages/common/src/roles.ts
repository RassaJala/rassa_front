export type UserRole = 'admin' | 'farmer' | 'seller' | 'buyer';

export const ROLE_OPTIONS: readonly {
  readonly label: string;
  readonly value: UserRole;
}[] = [
  { label: 'Agricultor', value: 'farmer' },
  { label: 'Vendedor', value: 'seller' },
  { label: 'Cliente', value: 'buyer' },
] as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  farmer: 'Agricultor',
  seller: 'Vendedor',
  buyer: 'Cliente',
};