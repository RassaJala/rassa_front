// ── Production-safe logger ──────────────────────────────────

const isDev = import.meta.env.DEV;

// En producción no logueamos el objeto de error crudo: un AxiosError trae
// `config.headers.Authorization` (el JWT) y exponerlo en consola es una fuga.
function describeError(error: unknown): unknown {
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

const SENSITIVE_KEY_PARTS = [
  'authorization',
  'token',
  'refresh',
  'password',
  'secret',
  'api_key',
  'apikey',
  'cookie',
  'jwt',
];

// El `extra` también puede arrastrar datos sensibles desde un call site; en
// producción se tachan las claves que parecen credenciales, incluidas las que
// aparecen anidadas (p. ej. `{ params: { token } }`). Se limita la profundidad
// para no serializar estructuras cíclicas o gigantes.
const REDACT_DEPTH_LIMIT = 3;

function redactSensitive(value: unknown, depth = 0): unknown {
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

export function logError(
  context: string,
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  if (isDev) {
    console.error(`[${context}]`, error, extra ?? '');
    return;
  }

  // Producción: sin servicio de tracking (pendiente de decisión), dejamos
  // evidencia en consola para poder diagnosticar sin silenciar el error.
  console.warn(
    `[${context}]`,
    describeError(error),
    redactSensitive(extra ?? {}),
  );
}
