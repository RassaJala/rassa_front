/** Convierte un precio string a número, retorna 0 si es inválido */
export function safePrice(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Formatea un precio numérico a string con signo $ y 2 decimales.
 * Acepta tanto string como number.
 */
export function formatPrice(value: string | number): string {
  const n = typeof value === 'string' ? safePrice(value) : value;
  return `$${(n || 0).toFixed(2)}`;
}
