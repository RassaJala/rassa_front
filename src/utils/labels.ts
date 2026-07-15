export function getRoleLabel(role?: string): string {
  if (role === 'farmer') return 'Agricultor';
  if (role === 'seller') return 'Vendedor';
  if (role === 'buyer') return 'Comprador';
  return 'Administrador';
}

export function getGenderLabel(val: string): string {
  if (val === 'M') return 'Masculino';
  if (val === 'F') return 'Femenino';
  return 'Otro';
}
