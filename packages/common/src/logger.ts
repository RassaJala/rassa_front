// Logger helpers shared by the mobile app (src/utils/logger.ts) and the web
// app (web/src/utils/logger.ts), R1-A. An AxiosError carries
// `config.headers.Authorization` (the JWT); logging the raw object exposes the
// token. These helpers describe the error to a safe shape and redact
// credential-looking keys before anything reaches the console or Sentry.

export const SENSITIVE_KEY_PARTS = [
  'authorization',
  'token',
  'refresh',
  'password',
  'secret',
  'api_key',
  'apikey',
  'cookie',
  'jwt',
] as const;

// Se limita la profundidad de redacción para no serializar estructuras
// cíclicas o gigantes.
export const REDACT_DEPTH_LIMIT = 3;

// Reduce un AxiosError a {message, status, method, url} — nunca los headers,
// donde viaja el token. Valores que no tienen forma de axios pasan tal cual.
export function describeError(error: unknown): unknown {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as {
      message?: unknown;
      response?: {
        status?: unknown;
        config?: { url?: unknown; method?: unknown };
      };
    };
    return {
      message: axiosError.message ?? 'AxiosError',
      status: axiosError.response?.status ?? null,
      method: axiosError.response?.config?.method ?? null,
      url: axiosError.response?.config?.url ?? null,
    };
  }
  return error;
}

// Tacha las claves que parecen credenciales, incluidas las que aparecen
// anidadas (p. ej. `{ params: { token } }`).
export function redactSensitive(value: unknown, depth = 0): unknown {
  if (value && typeof value === 'object') {
    if (depth > REDACT_DEPTH_LIMIT) return '[objeto]';
    if (Array.isArray(value)) {
      return value.map((item) => redactSensitive(item, depth + 1));
    }
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      const lower = key.toLowerCase();
      result[key] = SENSITIVE_KEY_PARTS.some((part) => lower.includes(part))
        ? '[redacted]'
        : redactSensitive(child, depth + 1);
    }
    return result;
  }
  return value;
}
