import {
  buildResumenUrl,
  DEFAULT_DECISION_PALETTE,
  formatDateInput,
  getDecisionColor,
  getWeekNumber,
  periodLabel,
  toLocalDate,
  unwrapWasteEnvelope,
} from './waste';
import type { DecisionPalette } from './waste';

describe('unwrapWasteEnvelope', () => {
  it('returns data when ok is true', () => {
    expect(unwrapWasteEnvelope({ ok: true, data: { total: 1 } })).toEqual({
      total: 1,
    });
  });

  it('throws when ok is false', () => {
    expect(() => unwrapWasteEnvelope({ ok: false })).toThrow();
  });

  it('throws when data is missing', () => {
    expect(() => unwrapWasteEnvelope({ ok: true })).toThrow();
  });

  it('includes the envelope message in the thrown error', () => {
    let message = '';
    try {
      unwrapWasteEnvelope({ ok: false, message: 'Sin autorización' });
    } catch (e) {
      message = e instanceof Error ? e.message : '';
    }
    expect(message).toContain('Sin autorización');
  });

  it('returns falsy-but-defined data such as 0', () => {
    expect(unwrapWasteEnvelope({ ok: true, data: 0 })).toBe(0);
  });
});

describe('waste date helpers', () => {
  it('toLocalDate parses a valid ISO datetime and rejects invalid input', () => {
    const d = toLocalDate('2026-07-05T00:00:00-03:00');
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(6);
    expect(d?.getDate()).toBe(5);
    expect(toLocalDate('not-a-date')).toBeNull();
    expect(toLocalDate('2026-02-30')).toBeNull();
  });

  it('getWeekNumber follows ISO 8601 (Monday-based, matching Django TruncWeek)', () => {
    // 2024-01-01 (Monday) and 2024-01-07 (Sunday) are week 1; the next Monday is week 2.
    expect(getWeekNumber(new Date(2024, 0, 1))).toBe(1);
    expect(getWeekNumber(new Date(2024, 0, 7))).toBe(1);
    expect(getWeekNumber(new Date(2024, 0, 8))).toBe(2);
    // 2026-01-01 (Thursday) starts week 1; 2026 has 53 ISO weeks.
    expect(getWeekNumber(new Date(2026, 0, 1))).toBe(1);
    expect(getWeekNumber(new Date(2026, 11, 31))).toBe(53);
  });

  it('periodLabel renders week and month labels', () => {
    const expectedWeek = `Sem ${getWeekNumber(new Date(2026, 6, 5))}`;
    expect(periodLabel('2026-07-05', 'semana')).toContain(expectedWeek);
    const month = periodLabel('2026-07-05', 'mes');
    expect(month).not.toContain('Sem');
    expect(month).toMatch(/^[a-záéíóúñ]{3,}\s+\d{2}$/i);
  });

  it('formatDateInput returns yyyy-mm-dd for a local Date', () => {
    expect(formatDateInput(new Date(2026, 6, 5))).toBe('2026-07-05');
    expect(formatDateInput(new Date(2026, 0, 1))).toBe('2026-01-01');
  });
});

describe('buildResumenUrl', () => {
  it('builds the full URL with all params', () => {
    expect(
      buildResumenUrl({
        fecha_desde: '2026-07-01',
        fecha_hasta: '2026-07-31',
        producto_id: 2,
        agrupar_por: 'mes',
      }),
    ).toBe(
      '/mermas/resumen/?fecha_desde=2026-07-01&fecha_hasta=2026-07-31&producto_id=2&agrupar_por=mes',
    );
  });

  it('builds a URL when only agrupar_por is set', () => {
    expect(buildResumenUrl({ agrupar_por: 'semana' })).toBe(
      '/mermas/resumen/?agrupar_por=semana',
    );
  });

  it('returns the bare path for empty params', () => {
    expect(buildResumenUrl({})).toBe('/mermas/resumen/');
  });

  it('URL-encodes special characters in values', () => {
    expect(buildResumenUrl({ fecha_desde: '2026-07-01&x=1' })).toBe(
      '/mermas/resumen/?fecha_desde=2026-07-01%26x%3D1',
    );
  });
});

describe('getDecisionColor', () => {
  const palette: DecisionPalette = {
    donar: '#D0',
    tirar: '#T0',
    compostar: '#C0',
    fallback: ['#F1', '#F2', '#F3'],
    defaultColor: '#DF0',
  };

  it('returns the palette color for known decisions', () => {
    expect(getDecisionColor('donar', palette)).toBe('#D0');
    expect(getDecisionColor('tirar', palette)).toBe('#T0');
    expect(getDecisionColor('compostar', palette)).toBe('#C0');
  });

  it('is case- and whitespace-insensitive for known decisions', () => {
    expect(getDecisionColor(' DONAR ', palette)).toBe('#D0');
    expect(getDecisionColor('Tirar', palette)).toBe('#T0');
  });

  it('falls back to a hashed fallback color for unknown decisions, stably', () => {
    const first = getDecisionColor('lechuga', palette);
    expect(getDecisionColor('lechuga', palette)).toBe(first);
    expect(palette.fallback).toContain(first);
  });

  it('falls back to defaultColor when the fallback list is empty', () => {
    const empty = { ...palette, fallback: [] };
    expect(getDecisionColor('lechuga', empty)).toBe('#DF0');
  });

  it('uses DEFAULT_DECISION_PALETTE when no palette is provided', () => {
    expect(getDecisionColor('donar')).toBe(DEFAULT_DECISION_PALETTE.donar);
    expect(getDecisionColor('tirar')).toBe(DEFAULT_DECISION_PALETTE.tirar);
    expect(getDecisionColor('compostar')).toBe(
      DEFAULT_DECISION_PALETTE.compostar,
    );
  });
});
