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

// Tacha el valor de los query params cuya clave parece credencial
// (p. ej. `?apikey=...`, `?token=...`). Un AxiosError describe la URL de la
// petición y puede arrastrar secretos en la cadena de consulta; se preserva el
// resto (path, fragmento, params no sensibles) para no perder la traza.
export function redactUrlQueryParams(url: string): string {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return url;
  const before = url.slice(0, queryStart + 1);
  const after = url.slice(queryStart + 1);
  const hashIndex = after.indexOf('#');
  const fragment = hashIndex === -1 ? '' : after.slice(hashIndex);
  const query = hashIndex === -1 ? after : after.slice(0, hashIndex);
  const redacted = query
    .split('&')
    .map((pair) => {
      if (!pair) return pair;
      const eq = pair.indexOf('=');
      const key = eq === -1 ? pair : pair.slice(0, eq);
      if (SENSITIVE_KEY_PARTS.some((part) => key.toLowerCase().includes(part))) {
        return `${key}=[redacted]`;
      }
      return pair;
    })
    .join('&');
  return `${before}${redacted}${fragment}`;
}

// Reduce un AxiosError a {message, status, method, url} — nunca los headers,
// donde viaja el token. La URL se pasa por redactUrlQueryParams para que un
// query string con credenciales no llegue a la consola ni a Sentry. Valores
// que no tienen forma de axios pasan tal cual.
export function describeError(error: unknown): unknown {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as {
      message?: unknown;
      response?: {
        status?: unknown;
        config?: { url?: unknown; method?: unknown };
      };
    };
    const url = axiosError.response?.config?.url ?? null;
    return {
      message: axiosError.message ?? 'AxiosError',
      status: axiosError.response?.status ?? null,
      method: axiosError.response?.config?.method ?? null,
      url: typeof url === 'string' ? redactUrlQueryParams(url) : url,
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
