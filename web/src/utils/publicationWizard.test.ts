import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  canJumpToStep,
  formatDate,
  generateTempId,
  getNextMonday,
  getWeekNumber,
  type WizardItemDraft,
  validateAllItems,
  validateItem,
} from './publicationWizard';

// ── Helpers ──────────────────────────────────────────────────

function makeItem(overrides: Partial<WizardItemDraft> = {}): WizardItemDraft {
  return {
    tempId: 'test',
    isNew: false,
    fk_producto: 1,
    nombre_producto: 'Tomate',
    fk_unidad: 1,
    stock: '10',
    precio: '500',
    foto: null,
    imageFile: null,
    imagePreview: null,
    ...overrides,
  };
}

const VALID_STEPS = ['fecha', 'productos', 'resumen', 'publicar'];

// ── generateTempId ───────────────────────────────────────────

describe('generateTempId', () => {
  it('returns unique ids with local_ prefix', () => {
    const id1 = generateTempId();
    const id2 = generateTempId();
    expect(id1).toMatch(/^local_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^local_\d+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });
});

// ── getNextMonday ────────────────────────────────────────────

describe('getNextMonday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns next Monday on a Tuesday', () => {
    vi.setSystemTime(new Date(2026, 6, 28, 12, 0, 0)); // Tuesday July 28
    const monday = getNextMonday();
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(3); // Aug 3
    expect(monday.getMonth()).toBe(7); // August
  });

  it('returns today on Monday', () => {
    vi.setSystemTime(new Date(2026, 6, 27, 12, 0, 0)); // Monday July 27
    const monday = getNextMonday();
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(27);
    expect(monday.getMonth()).toBe(6); // July
  });

  it('returns next Monday on Sunday', () => {
    vi.setSystemTime(new Date(2026, 7, 2, 12, 0, 0)); // Sunday Aug 2
    const monday = getNextMonday();
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(3);
    expect(monday.getMonth()).toBe(7); // August
  });

  it('returns next Monday on Saturday', () => {
    vi.setSystemTime(new Date(2026, 7, 1, 12, 0, 0)); // Saturday Aug 1
    const monday = getNextMonday();
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(3);
    expect(monday.getMonth()).toBe(7); // August
  });

  it('returns a date in the future or today', () => {
    vi.setSystemTime(new Date(2026, 6, 30, 12, 0, 0)); // Thursday
    const monday = getNextMonday();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(monday.getTime()).toBeGreaterThanOrEqual(today.getTime());
  });

  it('returns next Monday on Wednesday', () => {
    vi.setSystemTime(new Date(2026, 6, 29, 12, 0, 0)); // Wednesday July 29
    const monday = getNextMonday();
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(3); // Aug 3
    expect(monday.getMonth()).toBe(7); // August
  });

  it('returns next Monday on Thursday', () => {
    vi.setSystemTime(new Date(2026, 6, 30, 12, 0, 0)); // Thursday July 30
    const monday = getNextMonday();
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(3); // Aug 3
    expect(monday.getMonth()).toBe(7); // August
  });

  it('returns next Monday on Friday', () => {
    vi.setSystemTime(new Date(2026, 7, 0, 12, 0, 0)); // Friday Jul 31 (wait Jul 31 is a Friday)
    const monday = getNextMonday();
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(3); // Aug 3
    expect(monday.getMonth()).toBe(7); // August
  });

  it('normalizes hours to 00:00:00', () => {
    vi.setSystemTime(new Date(2026, 6, 29, 23, 59, 59)); // Wednesday late night
    const monday = getNextMonday();
    expect(monday.getHours()).toBe(0);
    expect(monday.getMinutes()).toBe(0);
    expect(monday.getSeconds()).toBe(0);
  });
});

// ── getWeekNumber ────────────────────────────────────────────

describe('getWeekNumber', () => {
  it('returns a number between 1 and 53', () => {
    const week = getWeekNumber(new Date());
    expect(week).toBeGreaterThanOrEqual(1);
    expect(week).toBeLessThanOrEqual(53);
  });

  it('returns consistent week for same date', () => {
    const date = new Date('2026-07-27');
    expect(getWeekNumber(date)).toBe(getWeekNumber(date));
  });

  it('returns week 1 for Jan 1 2026 (Thursday)', () => {
    const week = getWeekNumber(new Date(2026, 0, 1));
    expect(week).toBe(1);
  });

  it('returns week 53 for Dec 31 2020 (Thursday — ISO week 53 year)', () => {
    const week = getWeekNumber(new Date(2020, 11, 31));
    expect(week).toBe(53);
  });

  it('returns week 53 for Dec 28 2026 (Monday — week 53 of 2026)', () => {
    const week = getWeekNumber(new Date(2026, 11, 28));
    expect(week).toBe(53);
  });

  it('returns week 52 for Dec 27 2026 (Sunday)', () => {
    const week = getWeekNumber(new Date(2026, 11, 27));
    expect(week).toBe(52);
  });

  it('returns week 1 for Jan 4 2027 (Monday)', () => {
    const week = getWeekNumber(new Date(2027, 0, 4));
    expect(week).toBe(1);
  });
});

// ── formatDate ───────────────────────────────────────────────

describe('formatDate', () => {
  it('returns long format by default', () => {
    const result = formatDate(new Date(2026, 6, 28));
    expect(result).toContain('28');
  });

  it('returns short format when opts.short is true', () => {
    const result = formatDate(new Date(2026, 6, 28), { short: true });
    expect(result).toContain('28');
    expect(result.length).toBeLessThan(
      formatDate(new Date(2026, 6, 28)).length,
    );
  });
});

// ── validateItem ─────────────────────────────────────────────

describe('validateItem', () => {
  const validItem = makeItem();

  it('returns empty errors for valid item', () => {
    expect(validateItem(validItem)).toEqual({});
  });

  it('requires stock > 0', () => {
    expect(validateItem({ ...validItem, stock: '' })).toHaveProperty('stock');
    expect(validateItem({ ...validItem, stock: 'abc' })).toHaveProperty(
      'stock',
    );
    expect(validateItem({ ...validItem, stock: '0' })).toHaveProperty('stock');
    expect(validateItem({ ...validItem, stock: '-5' })).toHaveProperty('stock');
  });

  it('requires stock to be an integer', () => {
    expect(validateItem({ ...validItem, stock: '1.5' })).toHaveProperty(
      'stock',
    );
    expect(validateItem({ ...validItem, stock: '10' })).not.toHaveProperty(
      'stock',
    );
  });

  it('requires precio > 0', () => {
    expect(validateItem({ ...validItem, precio: '' })).toHaveProperty('precio');
    expect(validateItem({ ...validItem, precio: 'abc' })).toHaveProperty(
      'precio',
    );
    expect(validateItem({ ...validItem, precio: '0' })).toHaveProperty(
      'precio',
    );
    expect(validateItem({ ...validItem, precio: '-5' })).toHaveProperty(
      'precio',
    );
    expect(validateItem({ ...validItem, precio: '-0.01' })).toHaveProperty(
      'precio',
    );
  });

  it('requires fk_unidad', () => {
    expect(validateItem({ ...validItem, fk_unidad: 0 })).toHaveProperty(
      'fk_unidad',
    );
  });

  it('returns multiple errors for completely invalid item', () => {
    const errs = validateItem(
      makeItem({ stock: '', precio: '', fk_unidad: 0 }),
    );
    expect(Object.keys(errs)).toHaveLength(3);
    expect(errs).toHaveProperty('stock');
    expect(errs).toHaveProperty('precio');
    expect(errs).toHaveProperty('fk_unidad');
  });

  it('does NOT require foto (unlike mobile — web allows drafts without photo)', () => {
    const itemWithoutFoto = makeItem({ foto: null });
    const errs = validateItem(itemWithoutFoto);
    expect(errs).not.toHaveProperty('foto');
  });

  it('does NOT require foto even when foto is empty string', () => {
    const itemWithEmptyFoto = makeItem({ foto: '' });
    const errs = validateItem(itemWithEmptyFoto);
    expect(errs).not.toHaveProperty('foto');
  });

  it('accepts decimal precio (e.g. "10.5")', () => {
    const errs = validateItem(makeItem({ precio: '10.5' }));
    expect(errs).not.toHaveProperty('precio');
  });

  it('accepts stock "10.0" (Number.isInteger true for 10.0)', () => {
    const errs = validateItem(makeItem({ stock: '10.0' }));
    expect(errs).not.toHaveProperty('stock');
  });

  it('rejects stock "0.5" (not integer)', () => {
    expect(validateItem(makeItem({ stock: '0.5' }))).toHaveProperty('stock');
  });

  it('rejects stock as whitespace-only string', () => {
    expect(validateItem(makeItem({ stock: '   ' }))).toHaveProperty('stock');
  });

  it('rejects precio as whitespace-only string', () => {
    expect(validateItem(makeItem({ precio: '   ' }))).toHaveProperty('precio');
  });

  it('accepts stock "1" (minimum valid)', () => {
    const errs = validateItem(makeItem({ stock: '1' }));
    expect(errs).not.toHaveProperty('stock');
  });

  it('accepts precio "0.01" (tiny positive)', () => {
    const errs = validateItem(makeItem({ precio: '0.01' }));
    expect(errs).not.toHaveProperty('precio');
  });
});

// ── validateAllItems ─────────────────────────────────────────

describe('validateAllItems', () => {
  it('returns true for empty list', () => {
    expect(validateAllItems([])).toBe(true);
  });

  it('returns true when all items valid', () => {
    expect(validateAllItems([makeItem(), makeItem({ tempId: '2' })])).toBe(
      true,
    );
  });

  it('returns false when any item is invalid', () => {
    const items = [makeItem(), makeItem({ tempId: '2', stock: '' })];
    expect(validateAllItems(items)).toBe(false);
  });

  it('returns false when all items are invalid', () => {
    const items = [
      makeItem({ stock: '', precio: '' }),
      makeItem({ tempId: '2', fk_unidad: 0 }),
    ];
    expect(validateAllItems(items)).toBe(false);
  });
});

// ── canJumpToStep ────────────────────────────────────────────

describe('canJumpToStep', () => {
  const validItems = [makeItem()];
  const invalidItems = [makeItem({ stock: '' })];

  it('allows jumping backwards to any step', () => {
    expect(canJumpToStep(0, 2, VALID_STEPS, validItems)).toBe(true);
    expect(canJumpToStep(1, 3, VALID_STEPS, validItems)).toBe(true);
  });

  it('allows jumping to the same step', () => {
    expect(canJumpToStep(1, 1, VALID_STEPS, validItems)).toBe(true);
  });

  it('allows jumping forward past productos when items are valid', () => {
    expect(canJumpToStep(3, 0, VALID_STEPS, validItems)).toBe(true);
    expect(canJumpToStep(2, 0, VALID_STEPS, validItems)).toBe(true);
  });

  it('blocks jumping forward past productos when items are invalid', () => {
    expect(canJumpToStep(2, 0, VALID_STEPS, invalidItems)).toBe(false);
    expect(canJumpToStep(3, 0, VALID_STEPS, invalidItems)).toBe(false);
  });

  it('allows jumping forward to step 0 (fecha) from any position', () => {
    expect(canJumpToStep(0, 2, VALID_STEPS, invalidItems)).toBe(true);
  });

  it('allows jumping from fecha (0) to fecha (0) even with invalid items', () => {
    expect(canJumpToStep(0, 0, VALID_STEPS, invalidItems)).toBe(true);
  });

  it('blocks jumping from productos (1) to publicar (3) when items invalid', () => {
    expect(canJumpToStep(3, 1, VALID_STEPS, invalidItems)).toBe(false);
  });

  it('allows jumping from productos (1) to publicar (3) when items valid', () => {
    expect(canJumpToStep(3, 1, VALID_STEPS, validItems)).toBe(true);
  });

  it('allows jumping across multiple non-productos steps', () => {
    const steps = ['a', 'b', 'c', 'd'];
    expect(canJumpToStep(3, 0, steps, invalidItems)).toBe(true);
  });

  it('blocks when an intermediate step is productos with invalid items', () => {
    expect(canJumpToStep(3, 0, VALID_STEPS, invalidItems)).toBe(false);
  });

  it('allows when intermediate productos step has valid items', () => {
    expect(canJumpToStep(3, 0, VALID_STEPS, validItems)).toBe(true);
  });

  it('allows jumping from step 2 (resumen) to step 3 (publicar) skipping productos check', () => {
    expect(canJumpToStep(3, 2, VALID_STEPS, invalidItems)).toBe(true);
  });
});
