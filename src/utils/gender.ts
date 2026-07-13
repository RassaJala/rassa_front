export function getGenderLabel(val: string): string {
  if (val === 'M') return 'Masculino';
  if (val === 'F') return 'Femenino';
  return 'Otro';
}
