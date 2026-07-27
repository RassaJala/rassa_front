import { describe, expect, it } from "vitest";

import {
  canJumpToStep,
  formatDate,
  generateTempId,
  getNextMonday,
  getWeekNumber,
  type WizardItemDraft,
  validateAllItems,
  validateItem,
} from "./publicationWizard";

// ── Helpers ──────────────────────────────────────────────────

function makeItem(overrides: Partial<WizardItemDraft> = {}): WizardItemDraft {
  return {
    tempId: "test",
    fk_producto: 1,
    nombre_producto: "Tomate",
    fk_unidad: 1,
    stock: "10",
    precio: "500",
    foto: null,
    imageFile: null,
    imagePreview: null,
    ...overrides,
  };
}

const VALID_STEPS = ["fecha", "productos", "resumen", "publicar"];

// ── generateTempId ───────────────────────────────────────────

describe("generateTempId", () => {
  it("returns unique ids with local_ prefix", () => {
    const id1 = generateTempId();
    const id2 = generateTempId();
    expect(id1).toMatch(/^local_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^local_\d+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });
});

// ── getNextMonday ────────────────────────────────────────────

describe("getNextMonday", () => {
  it("returns a Monday", () => {
    const monday = getNextMonday();
    expect(monday.getDay()).toBe(1);
  });

  it("returns a date in the future or today", () => {
    const monday = getNextMonday();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(monday.getTime()).toBeGreaterThanOrEqual(today.getTime());
  });
});

// ── getWeekNumber ────────────────────────────────────────────

describe("getWeekNumber", () => {
  it("returns a number between 1 and 53", () => {
    const week = getWeekNumber(new Date());
    expect(week).toBeGreaterThanOrEqual(1);
    expect(week).toBeLessThanOrEqual(53);
  });

  it("returns consistent week for same date", () => {
    const date = new Date("2026-07-27");
    expect(getWeekNumber(date)).toBe(getWeekNumber(date));
  });
});

// ── formatDate ───────────────────────────────────────────────

describe("formatDate", () => {
  it("returns long format by default", () => {
    const result = formatDate(new Date(2026, 6, 28));
    expect(result).toContain("28");
  });

  it("returns short format when opts.short is true", () => {
    const result = formatDate(new Date(2026, 6, 28), { short: true });
    expect(result).toContain("28");
    expect(result.length).toBeLessThan(
      formatDate(new Date(2026, 6, 28)).length,
    );
  });
});

// ── validateItem ─────────────────────────────────────────────

describe("validateItem", () => {
  const validItem = makeItem();

  it("returns empty errors for valid item", () => {
    expect(validateItem(validItem)).toEqual({});
  });

  it("requires stock > 0", () => {
    expect(validateItem({ ...validItem, stock: "" })).toHaveProperty("stock");
    expect(validateItem({ ...validItem, stock: "abc" })).toHaveProperty(
      "stock",
    );
    expect(validateItem({ ...validItem, stock: "0" })).toHaveProperty("stock");
    expect(validateItem({ ...validItem, stock: "-5" })).toHaveProperty("stock");
  });

  it("requires precio > 0", () => {
    expect(validateItem({ ...validItem, precio: "" })).toHaveProperty("precio");
    expect(validateItem({ ...validItem, precio: "abc" })).toHaveProperty(
      "precio",
    );
    expect(validateItem({ ...validItem, precio: "0" })).toHaveProperty(
      "precio",
    );
  });

  it("requires fk_unidad", () => {
    expect(validateItem({ ...validItem, fk_unidad: 0 })).toHaveProperty(
      "fk_unidad",
    );
  });

  it("returns multiple errors for completely invalid item", () => {
    const errs = validateItem(
      makeItem({ stock: "", precio: "", fk_unidad: 0 }),
    );
    expect(Object.keys(errs)).toHaveLength(3);
    expect(errs).toHaveProperty("stock");
    expect(errs).toHaveProperty("precio");
    expect(errs).toHaveProperty("fk_unidad");
  });
});

// ── validateAllItems ─────────────────────────────────────────

describe("validateAllItems", () => {
  it("returns true for empty list", () => {
    expect(validateAllItems([])).toBe(true);
  });

  it("returns true when all items valid", () => {
    expect(validateAllItems([makeItem(), makeItem({ tempId: "2" })])).toBe(
      true,
    );
  });

  it("returns false when any item is invalid", () => {
    const items = [makeItem(), makeItem({ tempId: "2", stock: "" })];
    expect(validateAllItems(items)).toBe(false);
  });

  it("returns false when all items are invalid", () => {
    const items = [
      makeItem({ stock: "", precio: "" }),
      makeItem({ tempId: "2", fk_unidad: 0 }),
    ];
    expect(validateAllItems(items)).toBe(false);
  });
});

// ── canJumpToStep ────────────────────────────────────────────

describe("canJumpToStep", () => {
  const validItems = [makeItem()];
  const invalidItems = [makeItem({ stock: "" })];

  it("allows jumping backwards to any step", () => {
    expect(canJumpToStep(0, 2, VALID_STEPS, validItems)).toBe(true);
    expect(canJumpToStep(1, 3, VALID_STEPS, validItems)).toBe(true);
  });

  it("allows jumping to the same step", () => {
    expect(canJumpToStep(1, 1, VALID_STEPS, validItems)).toBe(true);
  });

  it("allows jumping forward past productos when items are valid", () => {
    expect(canJumpToStep(3, 0, VALID_STEPS, validItems)).toBe(true);
    expect(canJumpToStep(2, 0, VALID_STEPS, validItems)).toBe(true);
  });

  it("blocks jumping forward past productos when items are invalid", () => {
    expect(canJumpToStep(2, 0, VALID_STEPS, invalidItems)).toBe(false);
    expect(canJumpToStep(3, 0, VALID_STEPS, invalidItems)).toBe(false);
  });

  it("allows jumping forward to step 0 (fecha) from any position", () => {
    expect(canJumpToStep(0, 2, VALID_STEPS, invalidItems)).toBe(true);
  });

  it("allows jumping from fecha (0) to fecha (0) even with invalid items", () => {
    expect(canJumpToStep(0, 0, VALID_STEPS, invalidItems)).toBe(true);
  });

  it("blocks jumping from productos (1) to publicar (3) when items invalid", () => {
    expect(canJumpToStep(3, 1, VALID_STEPS, invalidItems)).toBe(false);
  });

  it("allows jumping from productos (1) to publicar (3) when items valid", () => {
    expect(canJumpToStep(3, 1, VALID_STEPS, validItems)).toBe(true);
  });
});
