// Money is handled as a float in this app; the backend sends Decimal strings.
// These helpers guard the UI against malformed payloads that would otherwise
// render `$NaN`.

// Single source of truth for the checkout IVA rate and its derived label.
export const IVA_RATE = 0.21;

export interface OrderTotals {
  readonly subtotal: number;
  readonly iva: number;
  readonly total: number;
}

/**
 * Computes the checkout totals (subtotal + IVA) for a list of cart items.
 * This is the single source of truth used BOTH by the confirm handler (to
 * reconcile against the order list) and by the render path (to display the
 * totals), so the submitted math can never drift from what the user saw.
 */
export function computeTotals(
  items: ReadonlyArray<{ readonly precio: number; readonly cantidad: number }>,
): OrderTotals {
  const subtotal = items.reduce(
    (sum, item) => sum + item.precio * item.cantidad,
    0,
  );
  const iva = subtotal * IVA_RATE;
  return { subtotal, iva, total: subtotal + iva };
}

export function parseMoney(value: number | string | null | undefined): number {
  const n = typeof value === 'string' ? Number.parseFloat(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

export function formatMoney(value: number | string | null | undefined): string {
  const n = parseMoney(value);
  return `$${n.toFixed(2)}`;
}
