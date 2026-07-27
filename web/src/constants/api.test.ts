import { describe, expect, it } from "vitest";

import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_MB,
  QUERY_RETRY,
  QUERY_STALE_TIME,
  UPLOAD_TIMEOUT_MS,
  assertValidId,
} from "./api";

describe("constants", () => {
  it("MAX_IMAGE_SIZE_BYTES is 5 MB", () => {
    expect(MAX_IMAGE_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });

  it("MAX_IMAGE_SIZE_MB is 5", () => {
    expect(MAX_IMAGE_SIZE_MB).toBe(5);
  });

  it("UPLOAD_TIMEOUT_MS is 60s", () => {
    expect(UPLOAD_TIMEOUT_MS).toBe(60_000);
  });

  it("QUERY_STALE_TIME is 30s", () => {
    expect(QUERY_STALE_TIME).toBe(30_000);
  });

  it("QUERY_RETRY is 3", () => {
    expect(QUERY_RETRY).toBe(3);
  });

  it("ALLOWED_IMAGE_TYPES includes common image formats", () => {
    expect(ALLOWED_IMAGE_TYPES).toContain("image/jpeg");
    expect(ALLOWED_IMAGE_TYPES).toContain("image/png");
    expect(ALLOWED_IMAGE_TYPES).toContain("image/webp");
    expect(ALLOWED_IMAGE_TYPES).toContain("image/gif");
  });
});

describe("assertValidId", () => {
  it("passes for positive integers", () => {
    expect(() => assertValidId(1)).not.toThrow();
    expect(() => assertValidId(42)).not.toThrow();
    expect(() => assertValidId(999_999)).not.toThrow();
  });

  it("throws for zero", () => {
    expect(() => assertValidId(0)).toThrow("Invalid ID: 0");
  });

  it("throws for negative", () => {
    expect(() => assertValidId(-1)).toThrow("Invalid ID: -1");
  });

  it("throws for NaN", () => {
    expect(() => assertValidId(NaN)).toThrow("Invalid ID: NaN");
  });

  it("throws for Infinity", () => {
    expect(() => assertValidId(Infinity)).toThrow("Invalid ID: Infinity");
  });

  it("throws for float", () => {
    expect(() => assertValidId(1.5)).toThrow("Invalid ID: 1.5");
  });

  it("uses custom label", () => {
    expect(() => assertValidId(0, "publicacion")).toThrow(
      "Invalid publicacion: 0",
    );
  });
});
