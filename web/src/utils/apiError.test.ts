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
});
