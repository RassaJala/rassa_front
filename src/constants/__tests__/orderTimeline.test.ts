import { formatTimestamp, getStatusColor } from '../orderTimeline';

describe('formatTimestamp', () => {
  it('formats a valid ISO string in DD/MM HH:mm (UTC)', () => {
    const result = formatTimestamp('2025-06-15T10:30:00Z');
    expect(result).toBe('15/06 10:30');
  });

  it('handles single-digit day and month with padding', () => {
    const result = formatTimestamp('2025-01-05T08:05:00Z');
    expect(result).toBe('05/01 08:05');
  });

  it('returns em dash for empty string', () => {
    expect(formatTimestamp('')).toBe('—');
  });

  it('returns em dash for invalid date string', () => {
    expect(formatTimestamp('not-a-date')).toBe('—');
  });

  it('returns em dash for null-ish input via string coercion', () => {
    expect(formatTimestamp('')).toBe('—');
  });
});

describe('getStatusColor', () => {
  const fallback = '#ccc';

  it('returns amber for pendiente', () => {
    expect(getStatusColor('pendiente', fallback)).toBe('#f59e0b');
  });

  it('returns green for confirmado', () => {
    expect(getStatusColor('confirmado', fallback)).toBe('#22c55e');
  });

  it('returns blue for en_preparacion', () => {
    expect(getStatusColor('en_preparacion', fallback)).toBe('#3b82f6');
  });

  it('returns blue for listo_para_retirar', () => {
    expect(getStatusColor('listo_para_retirar', fallback)).toBe('#3b82f6');
  });

  it('returns green for entregado', () => {
    expect(getStatusColor('entregado', fallback)).toBe('#22c55e');
  });

  it('returns coral for cancelado', () => {
    expect(getStatusColor('cancelado', fallback)).toBe('#DE393A');
  });

  it('returns fallback for unknown status', () => {
    expect(getStatusColor('unknown', fallback)).toBe(fallback);
  });
});
