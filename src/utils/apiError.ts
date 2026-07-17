/* global console, __DEV__ -- console + RN dev-mode flag set by Metro bundler */
import type { AxiosError } from 'axios';
import axios from 'axios';

function parseHtmlOrStringError(data: string, status?: number): string {
  const trimmed = data.trim();

  if (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.includes('Traceback (most recent call last)')
  ) {
    if (__DEV__) {
      console.warn(
        '[API Error] Backend returned HTML instead of JSON — check backend logs. Status:',
        status,
      );
    }
    return 'Error interno del servidor. Revisa los logs del backend.';
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
    return error instanceof Error ? error.message : 'Error desconocido.';
  }

  const axiosErr = error as AxiosError<Record<string, unknown> | string>;
  const data = axiosErr.response?.data;

  if (!data) return 'Error del servidor. Intenta de nuevo.';

  // ── HTML error page (e.g. Django DEBUG=True 500 page) ──────
  if (typeof data === 'string') {
    return parseHtmlOrStringError(data, axiosErr.response?.status);
  }

  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.message === 'string') return data.message;

  for (const key of fieldKeys) {
    const value = data[key];

    if (Array.isArray(value) && value[0]) return String(value[0]);
  }

  return 'Error del servidor. Intenta de nuevo.';
}
