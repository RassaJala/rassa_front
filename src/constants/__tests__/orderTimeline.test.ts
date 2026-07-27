import {
  buildDescription,
  formatTimestamp,
  getStatusColor,
  normalizeOrderHistoryResponse,
} from '../orderTimeline';

describe('formatTimestamp', () => {
  it('formats a valid ISO string in DD/MM HH:mm (local time)', () => {
    // Use UTC midnight — local time may vary by timezone;
    // we check the pattern, not the exact value
    const result = formatTimestamp('2025-06-15T12:00:00Z');
    expect(result).toMatch(/^\d{2}\/\d{2} \d{2}:\d{2}$/);
  });

  it('handles single-digit day and month with padding (local time)', () => {
    const result = formatTimestamp('2025-01-05T08:05:00Z');
    // Pattern check: DD/MM HH:mm
    expect(result).toMatch(/^\d{2}\/\d{2} \d{2}:\d{2}$/);
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

describe('normalizeOrderHistoryResponse', () => {
  it('passes through a flat array', () => {
    const data = [{ id_historial: 1, estado_nuevo: 'pendiente' }];
    expect(normalizeOrderHistoryResponse(data)).toEqual(data);
  });

  it('unwraps { data: [...] }', () => {
    const entries = [{ id_historial: 1, estado_nuevo: 'pendiente' }];
    expect(normalizeOrderHistoryResponse({ data: entries })).toEqual(entries);
  });

  it('returns [] for { data: null }', () => {
    expect(normalizeOrderHistoryResponse({ data: null })).toEqual([]);
  });

  it('returns [] for { data: "string" }', () => {
    expect(normalizeOrderHistoryResponse({ data: 'not-array' })).toEqual([]);
  });

  it('returns [] for null', () => {
    expect(normalizeOrderHistoryResponse(null)).toEqual([]);
  });

  it('returns [] for undefined', () => {
    expect(normalizeOrderHistoryResponse(undefined)).toEqual([]);
  });

  it('returns [] for a plain object without data wrapper', () => {
    expect(normalizeOrderHistoryResponse({ foo: 'bar' })).toEqual([]);
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

describe('buildDescription', () => {
  it('returns "Pedido creado" when estado_anterior is null', () => {
    expect(
      buildDescription({
        estado_anterior: null,
        estado_nuevo: 'pendiente',
      }),
    ).toBe('Pedido creado');
  });

  it('returns transition with labels for known statuses', () => {
    expect(
      buildDescription({
        estado_anterior: 'pendiente',
        estado_nuevo: 'confirmado',
      }),
    ).toBe('Pendiente → Confirmado');
  });

  it('uses raw status key as fallback when label is missing', () => {
    expect(
      buildDescription({
        estado_anterior: 'unknown_from',
        estado_nuevo: 'pendiente',
      }),
    ).toBe('unknown_from → Pendiente');
  });

  it('uses raw status key as fallback when both labels are missing', () => {
    expect(
      buildDescription({
        estado_anterior: 'foo',
        estado_nuevo: 'bar',
      }),
    ).toBe('foo → bar');
  });
});
