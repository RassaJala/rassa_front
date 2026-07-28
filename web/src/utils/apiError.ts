import axios from "axios";

const MAX_ERROR_LENGTH = 1000;

/**
 * Extract a readable error message from an API error response.
 * @param error - The caught error (unknown type)
 * @param fieldKeys - Backend field names to check for validation errors
 */
export function extractApiError(error: unknown, fieldKeys: string[]): string {
  const raw = extractRawError(error, fieldKeys);
  return raw.length > MAX_ERROR_LENGTH ? raw.slice(0, MAX_ERROR_LENGTH) : raw;
}

function extractRawError(error: unknown, fieldKeys: string[]): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : "Error desconocido.";
  }

  const data = error.response?.data;
  if (!data) return "Error del servidor. Intenta de nuevo.";

  if (typeof data === "string") return data;
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.message === "string") return data.message;

  for (const key of fieldKeys) {
    const value = data[key];
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      return typeof first === "string" ? first : String(first);
    }
    if (typeof value === "string") return value;
  }

  return "Error del servidor. Intenta de nuevo.";
}
