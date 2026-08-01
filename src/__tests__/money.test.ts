import {
  computeTotals,
  formatMoney,
  IVA_RATE,
  parseMoney,
} from '@/utils/money';

describe('formatMoney', () => {
  it('formats valid numbers with two decimals', () => {
    expect(formatMoney(9.68)).toBe('$9.68');
    expect(formatMoney(30.25)).toBe('$30.25');
    expect(formatMoney(0)).toBe('$0.00');
    expect(formatMoney(174)).toBe('$174.00');
  });

  it('formats valid numeric strings', () => {
    expect(formatMoney('174.00')).toBe('$174.00');
    expect(formatMoney('9.68')).toBe('$9.68');
  });

  it('returns $0.00 for malformed or missing values', () => {
    expect(formatMoney(NaN)).toBe('$0.00');
    expect(formatMoney(undefined)).toBe('$0.00');
    expect(formatMoney(null)).toBe('$0.00');
    expect(formatMoney('abc')).toBe('$0.00');
    expect(formatMoney(Infinity)).toBe('$0.00');
  });
});

describe('parseMoney', () => {
  it('parses valid numbers and numeric strings', () => {
    expect(parseMoney(9.68)).toBe(9.68);
    expect(parseMoney('174.00')).toBe(174);
  });

  it('returns 0 for malformed or missing values', () => {
    expect(parseMoney(NaN)).toBe(0);
    expect(parseMoney(undefined)).toBe(0);
    expect(parseMoney(null)).toBe(0);
    expect(parseMoney('abc')).toBe(0);
    expect(parseMoney(Infinity)).toBe(0);
  });
});

describe('computeTotals', () => {
  it('calcula subtotal, IVA (21%) y total sobre los items', () => {
    const totals = computeTotals([
      { precio: 2.5, cantidad: 2 },
      { precio: 1, cantidad: 3 },
    ]);

    expect(totals.subtotal).toBe(8);
    expect(totals.iva).toBeCloseTo(1.68, 5);
    expect(totals.total).toBeCloseTo(9.68, 5);
  });

  it('devuelve ceros con una lista vacía', () => {
    expect(computeTotals([])).toEqual({ subtotal: 0, iva: 0, total: 0 });
  });

  it('respeta precios no enteros y cantidades fraccionarias', () => {
    const totals = computeTotals([{ precio: 0.33, cantidad: 3 }]);

    expect(totals.subtotal).toBeCloseTo(0.99, 5);
    expect(totals.total).toBeCloseTo(0.99 * (1 + IVA_RATE), 5);
  });

  it('expone IVA_RATE como única fuente de la tasa', () => {
    expect(IVA_RATE).toBe(0.21);
  });
});
