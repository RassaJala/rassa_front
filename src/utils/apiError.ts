/* global console, __DEV__ -- console + RN dev-mode flag set by Metro bundler */
import type { AxiosError } from "axios";
import axios from "axios";

function parseHtmlOrStringError(data: string, status?: number): string {
  const trimmed = data.trim();

  if (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    trimmed.includes("Traceback (most recent call last)")
  ) {
    if (__DEV__) {
      console.warn(
        "[API Error] Backend returned HTML instead of JSON — check backend logs. Status:",
        status,
      );
    }
    return "Error interno del servidor. Revisa los logs del backend.";
  }
  return trimmed;
}

/**
 * Extract a readable error message from an API error response.
 * @param error - The caught error (unknown type)
 * @param fieldKeys - Backend field names to check for validation errors
 */
export function extractApiError(error: unknown, fieldKeys: string[]): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : "Error desconocido.";
  }

  const axiosErr = error as AxiosError<Record<string, unknown> | string>;
  const data = axiosErr.response?.data;

  if (!data) return "Error del servidor. Intenta de nuevo.";

  // ── HTML error page (e.g. Django DEBUG=True 500 page) ──────
  if (typeof data === "string") {
    return parseHtmlOrStringError(data, axiosErr.response?.status);
  }

  if (typeof data.detail === "string") return data.detail;
  if (typeof data.message === "string") return data.message;

  for (const key of fieldKeys) {
    const value = data[key];

    if (Array.isArray(value) && value[0]) return String(value[0]);
  }

  return "Error del servidor. Intenta de nuevo.";
}

function extractFieldErrorsFromData(
  data: Record<string, unknown>,
  fieldKeys: string[],
): { fields: Record<string, string>; general: string | null } {
  const fields: Record<string, string> = {};

  if (typeof data.detail === "string") {
    return { fields, general: data.detail };
  }
  if (typeof data.message === "string") {
    return { fields, general: data.message };
  }

  let foundField = false;
  for (const key of fieldKeys) {
    const value = data[key];
    if (Array.isArray(value) && value.length > 0) {
      fields[key] = String(value[0]);
      foundField = true;
    } else if (typeof value === "string") {
      fields[key] = value;
      foundField = true;
    }
  }

  if (!foundField) {
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v) && v.length > 0) {
        return { fields, general: `${k}: ${String(v[0])}` };
      }
    }
    return { fields, general: "Error del servidor. Intenta de nuevo." };
  }

  return { fields, general: null };
}

/**
 * Extract per-field errors from an API error response.
 * Returns an object mapping field names to error strings, plus a general error.
 */
export function extractFieldErrors(
  error: unknown,
  fieldKeys: string[],
): { fields: Record<string, string>; general: string | null } {
  if (!axios.isAxiosError(error)) {
    return {
      fields: {},
      general: error instanceof Error ? error.message : "Error desconocido.",
    };
  }

  const axiosErr = error as AxiosError<Record<string, unknown> | string>;
  const data = axiosErr.response?.data;

  if (!data) {
    return { fields: {}, general: "Error del servidor. Intenta de nuevo." };
  }

  if (typeof data === "string") {
    return {
      fields: {},
      general: parseHtmlOrStringError(data, axiosErr.response?.status),
    };
  }

  return extractFieldErrorsFromData(data, fieldKeys);
}
