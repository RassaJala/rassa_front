import { describe, expect, it } from "vitest";

import {
  generateTempId,
  getNextMonday,
  getWeekNumber,
  validateItem,
} from "./publicationWizard";

describe("generateTempId", () => {
  it("returns unique ids with local_ prefix", () => {
    const id1 = generateTempId();
    const id2 = generateTempId();
    expect(id1).toMatch(/^local_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^local_\d+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });
});

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

describe("validateItem", () => {
  const validItem = {
    tempId: "test",
    fk_producto: 1,
    nombre_producto: "Tomate",
    fk_unidad: 1,
    stock: "10",
    precio: "500",
    foto: null,
    imageFile: null,
    imagePreview: null,
  };

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
});
