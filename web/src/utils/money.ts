// Money is handled as a float in this app; the backend sends Decimal strings.
// These helpers guard the UI against malformed payloads that would otherwise
// render `$NaN`. Mirrors mobile src/utils/money.ts (parseMoney + formatMoney).

export function parseMoney(value: number | string | null | undefined): number {
  const n = typeof value === 'string' ? Number.parseFloat(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

export function formatMoney(value: number | string | null | undefined): string {
  const n = parseMoney(value);
  return `$${n.toFixed(2)}`;
}
