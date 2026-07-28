import axios from "axios";
import { describe, expect, it, vi } from "vitest";

import { extractApiError } from "./apiError";

function makeAxiosError(data: unknown): unknown {
  const error = new Error("Request failed");
  Object.defineProperty(error, "isAxiosError", { value: true });
  Object.defineProperty(error, "response", {
    value: { data, status: 500, statusText: "", headers: {}, config: {} },
  });
  return error;
}

describe("extractApiError", () => {
  const fields = ["detail", "message", "errors"];

  it("returns fallback for non-Axios non-Error", () => {
    expect(extractApiError("some string", fields)).toBe("Error desconocido.");
  });

  it("returns message from Error instance", () => {
    expect(extractApiError(new Error("boom"), fields)).toBe("boom");
  });

  it("returns fallback for Axios error with no response", () => {
    const error = new Error("Request failed");
    Object.defineProperty(error, "isAxiosError", { value: true });
    expect(extractApiError(error, fields)).toBe(
      "Error del servidor. Intenta de nuevo.",
    );
  });

  it("returns string data directly", () => {
    expect(extractApiError(makeAxiosError("Not found"), fields)).toBe(
      "Not found",
    );
  });

  it("returns data.detail when string", () => {
    expect(
      extractApiError(makeAxiosError({ detail: "Unauthorized" }), fields),
    ).toBe("Unauthorized");
  });

  it("returns data.message when string", () => {
    expect(
      extractApiError(makeAxiosError({ message: "Rate limited" }), fields),
    ).toBe("Rate limited");
  });

  it("returns first fieldKey array value", () => {
    expect(
      extractApiError(makeAxiosError({ errors: ["Name is required"] }), fields),
    ).toBe("Name is required");
  });

  it("returns fieldKey string value", () => {
    expect(
      extractApiError(makeAxiosError({ errors: "Too many" }), fields),
    ).toBe("Too many");
  });

  it("returns fallback when no fieldKey matches", () => {
    expect(extractApiError(makeAxiosError({ other: "nope" }), fields)).toBe(
      "Error del servidor. Intenta de nuevo.",
    );
  });

  it("prefers detail over message", () => {
    expect(
      extractApiError(
        makeAxiosError({ detail: "First", message: "Second" }),
        fields,
      ),
    ).toBe("First");
  });

  it("returns fallback for empty array field value", () => {
    expect(extractApiError(makeAxiosError({ errors: [] }), fields)).toBe(
      "Error del servidor. Intenta de nuevo.",
    );
  });

  // ── Security: error message handling ──────────────────────

  it("SECURITY: does not leak stack traces", () => {
    const error = new Error("Internal error");
    Object.defineProperty(error, "stack", {
      value: "Error: Internal error\n    at server.ts:42:10",
    });
    const result = extractApiError(error, fields);
    expect(result).not.toContain("at server.ts");
    expect(result).not.toContain("42:10");
  });

  it("SECURITY: handles deeply nested data objects", () => {
    const deepData = { a: { b: { c: { d: "deep error" } } } };
    const error = makeAxiosError(deepData);
    expect(extractApiError(error, fields)).toBe(
      "Error del servidor. Intenta de nuevo.",
    );
  });

  it("SECURITY: handles circular references without crash", () => {
    const data: Record<string, unknown> = { detail: "error" };
    data.self = data;
    const error = makeAxiosError(data);
    expect(extractApiError(error, fields)).toBe("error");
  });

  it("SECURITY: handles null data gracefully", () => {
    const error = new Error("Request failed");
    Object.defineProperty(error, "isAxiosError", { value: true });
    Object.defineProperty(error, "response", {
      value: { data: null, status: 500 },
    });
    expect(extractApiError(error, fields)).toBe(
      "Error del servidor. Intenta de nuevo.",
    );
  });

  it("SECURITY: handles undefined data gracefully", () => {
    const error = new Error("Request failed");
    Object.defineProperty(error, "isAxiosError", { value: true });
    Object.defineProperty(error, "response", {
      value: { data: undefined, status: 500 },
    });
    expect(extractApiError(error, fields)).toBe(
      "Error del servidor. Intenta de nuevo.",
    );
  });

  it("SECURITY: handles numeric field values", () => {
    const error = makeAxiosError({ detail: 12345 });
    expect(extractApiError(error, fields)).toBe(
      "Error del servidor. Intenta de nuevo.",
    );
  });

  it("SECURITY: handles boolean field values", () => {
    const error = makeAxiosError({ detail: true });
    expect(extractApiError(error, fields)).toBe(
      "Error del servidor. Intenta de nuevo.",
    );
  });

  it("SECURITY: handles array of non-strings", () => {
    const error = makeAxiosError({ errors: [123, true, null] });
    expect(extractApiError(error, fields)).toBe("123");
  });

  it("SECURITY: handles object in array", () => {
    const error = makeAxiosError({ errors: [{ msg: "nested" }] });
    expect(extractApiError(error, fields)).toBe("[object Object]");
  });

  it("SECURITY: limits error message length", () => {
    const longMessage = "x".repeat(100000);
    const error = makeAxiosError({ detail: longMessage });
    const result = extractApiError(error, fields);
    expect(result.length).toBeLessThanOrEqual(1000);
  });
});
