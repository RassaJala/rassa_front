/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import {
  extractProducts,
  formatDisplayDate,
  getDaysInMonth,
  getWeekNumber,
  groupBy,
  hashString,
  toDateString,
  toLocalDate,
} from '@/common/waste';

describe('waste date helpers', () => {
  it('toLocalDate tolerates full ISO datetimes and slices the date part', () => {
    const d = toLocalDate('2026-07-01T00:00:00-03:00');
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(6);
    expect(d?.getDate()).toBe(1);
  });

  it('toLocalDate rejects invalid dates', () => {
    expect(toLocalDate('2026-13-01')).toBeNull();
    expect(toLocalDate('2026-02-30')).toBeNull();
    expect(toLocalDate('not-a-date')).toBeNull();
    expect(toLocalDate('')).toBeNull();
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

  it('toDateString zero-pads month and day', () => {
    expect(toDateString(2026, 6, 5)).toBe('2026-07-05');
    expect(toDateString(2026, 0, 1)).toBe('2026-01-01');
  });

  it('getDaysInMonth handles leap years', () => {
    expect(getDaysInMonth(2024, 1)).toBe(29); // leap February
    expect(getDaysInMonth(2026, 1)).toBe(28);
    expect(getDaysInMonth(2026, 6)).toBe(31);
  });

  it('formatDisplayDate renders Spanish month names from MONTH_NAMES', () => {
    expect(formatDisplayDate('2026-07-05')).toBe('5 de Julio 2026');
    expect(formatDisplayDate('2026-01-01')).toBe('1 de Enero 2026');
  });
});

describe('waste aggregations', () => {
  it('groupBy sums totals and sorts descending', () => {
    const items = [
      { nombre: 'a', total: 1 },
      { nombre: 'a', total: 2 },
      { nombre: 'b', total: 5 },
    ];
    const result = groupBy(
      items,
      (x) => x.nombre,
      (x) => x.total,
    );
    expect(result).toEqual([
      { nombre: 'b', total: 5 },
      { nombre: 'a', total: 3 },
    ]);
  });

  it('groupBy handles a single record and empty input', () => {
    expect(
      groupBy(
        [{ nombre: 'a', total: 7 }],
        (x) => x.nombre,
        (x) => x.total,
      ),
    ).toEqual([{ nombre: 'a', total: 7 }]);
    expect(
      groupBy(
        [] as { nombre: string; total: number }[],
        (x) => x.nombre,
        (x) => x.total,
      ),
    ).toEqual([]);
  });

  it('groupBy aggregates identical keys into one entry', () => {
    const items = [
      { nombre: 'a', total: 2 },
      { nombre: 'a', total: 3 },
      { nombre: 'a', total: 1 },
    ];
    expect(
      groupBy(
        items,
        (x) => x.nombre,
        (x) => x.total,
      ),
    ).toEqual([{ nombre: 'a', total: 6 }]);
  });

  it('groupBy sums zero and negative quantities', () => {
    const items = [
      { nombre: 'a', total: 0 },
      { nombre: 'a', total: -2 },
      { nombre: 'b', total: -1 },
    ];
    expect(
      groupBy(
        items,
        (x) => x.nombre,
        (x) => x.total,
      ),
    ).toEqual([
      { nombre: 'b', total: -1 },
      { nombre: 'a', total: -2 },
    ]);
  });

  it('extractProducts returns empty for an empty detail and keeps first name on duplicates', () => {
    expect(extractProducts([])).toEqual([]);
    const detalle = [
      {
        periodo: '2026-07-01',
        producto_nombre: 'Manzana',
        producto_id: 1,
        decision_nombre: 'tirar',
        decision_id: 1,
        total_cantidad: 5,
        total_mermas: 3,
      },
      {
        periodo: '2026-07-01',
        producto_nombre: 'Manzana',
        producto_id: 1,
        decision_nombre: 'donar',
        decision_id: 2,
        total_cantidad: 2,
        total_mermas: 1,
      },
      {
        periodo: '2026-07-01',
        producto_nombre: 'Pera',
        producto_id: 2,
        decision_nombre: 'tirar',
        decision_id: 1,
        total_cantidad: 3,
        total_mermas: 2,
      },
    ];
    expect(extractProducts(detalle)).toEqual([
      { id: 1, nombre: 'Manzana' },
      { id: 2, nombre: 'Pera' },
    ]);
  });

  it('hashString is deterministic and differs across inputs', () => {
    expect(hashString('manzana')).toBe(835999604);
    expect(hashString('pera')).toBe(3437284);
    expect(hashString('manzana')).not.toBe(hashString('pera'));
  });
});
