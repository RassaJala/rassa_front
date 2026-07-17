/**
 * Shared role-label mapping used across admin screens.
 * Single source of truth — keeps labels consistent and easy to update.
 */

export const ROLE_LABEL_MAP: Record<string, string> = {
  admin: 'Admin',
  farmer: 'Agricultor',
  seller: 'Vendedor',
  buyer: 'Comprador',
};

export function getRoleLabel(role: string): string {
  return ROLE_LABEL_MAP[role] ?? role;
}

export function getGenderLabel(val: string): string {
  if (val === 'M') return 'Masculino';
  if (val === 'F') return 'Femenino';
  return 'Otro';
}
}
