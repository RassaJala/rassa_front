import { formatMoney, parseMoney } from '@/utils/money';

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
