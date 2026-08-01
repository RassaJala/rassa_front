const STATUS_MESSAGES: Record<number, string> = {
  401: 'Credenciales inválidas o sesión expirada.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'El recurso solicitado no fue encontrado.',
  409: 'Conflicto: Ya existe un registro con esos datos.',
  429: 'Límite de peticiones excedido. Intenta más tarde.',
};

const GENERIC_INTERNAL =
  'Error interno del servidor. Revisa los logs del backend.';
const GENERIC_SERVER = 'Error del servidor. Intenta de nuevo.';

function isHtmlOrTraceback(data: string): boolean {
  const lower = data.trim().toLowerCase();
  return (
    lower.startsWith('<!doctype') ||
    lower.startsWith('<html') ||
    lower.includes('traceback (most recent call last)')
  );
}

/**
 * Sanea un cuerpo de respuesta en texto plano: si es HTML, un traceback o un
 * texto que filtra detalles técnicos (vía `isSafeDetail`), devuelve el mensaje
 * genérico; en caso contrario devuelve el texto tal cual.
 */
function sanitizeBody(data: string, status?: number): string {
  const trimmed = data.trim();
  if (isHtmlOrTraceback(trimmed)) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(
        '[API Error] Backend returned HTML instead of JSON — check backend logs. Status:',
        status,
      );
    }
    return GENERIC_INTERNAL;
  }
  return isSafeDetail(trimmed) ? trimmed : GENERIC_INTERNAL;
}

export function isSafeDetail(detail: string): boolean {
  // Regex targeting standard python/django tracebacks or database errors.
  // Note: /at\s+.*:\d+/i was removed — it caused false positives on common
  // Spanish text (e.g. "tratamiento: 3 sesiones", "atención: 5").
  // Python/JS stack traces are already caught by the patterns above.
  if (
    /traceback\s+\(most\s+recent\s+call\s+last\)/i.test(detail) ||
    /django\.db/i.test(detail) ||
    /database\s+error/i.test(detail) ||
    /sql\s+syntax/i.test(detail) ||
    /operationalerror/i.test(detail) ||
    /programmingerror/i.test(detail) ||
    /integrityerror/i.test(detail) ||
    /exception\s+at/i.test(detail) ||
    /file\s+".*"\s*,\s*line\s+\d+/i.test(detail)
  ) {
    return false;
  }
  return true;
}

function isAxiosError(error: unknown): error is {
  isAxiosError: true;
  response?: { status?: number; data?: unknown };
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as Record<string, unknown>).isAxiosError === true
  );
}

function unwrapCandidate(error: unknown): unknown {
  return error instanceof Error && error.cause !== undefined
    ? error.cause
    : error;
}

/** Convierte un item de un array en texto solo si es un primitivo (no objeto). */
function stringifySafeItem(item: unknown): string | null {
  if (item == null || typeof item === 'object') return null;
  const text = String(item);
  return text.length > 0 ? text : null;
}

/** Devuelve un valor "string o lista" solo si supera `isSafeDetail`. */
function pickSafeString(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0 && isSafeDetail(value)) {
    return value;
  }
  if (Array.isArray(value) && value.length > 0) {
    const first = stringifySafeItem(value[0]);
    if (first !== null && isSafeDetail(first)) return first;
  }
  return null;
}

/** Primer valor (sanitizado) de las claves dadas, respetando su orden. */
function firstFieldValue(
  record: Record<string, unknown>,
  fieldKeys: readonly string[],
): string | null {
  for (const key of fieldKeys) {
    const first = pickSafeString(record[key]);
    if (first !== null) return first;
  }
  return null;
}

/**
 * Recorre todos los campos del objeto (sanitizado): `non_field_errors` se
 * agrega sin prefijo; los demás arrays como "clave: v1, v2". Une todo con "\n".
 * Solo aplica a arrays (los valores string sueltos se ignoran) para no exponer
 * claves técnicas arbitrarias al usuario.
 */
function extractFieldList(record: Record<string, unknown>): string | null {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (key === 'non_field_errors') {
      const arr = Array.isArray(value) ? value : [value];
      for (const item of arr) {
        const text = stringifySafeItem(item);
        if (text !== null && isSafeDetail(text)) parts.push(text);
      }
    } else if (Array.isArray(value) && value.length > 0) {
      const strings: string[] = [];
      for (const item of value) {
        const text = stringifySafeItem(item);
        if (text !== null) strings.push(text);
      }
      if (strings.length > 0) {
        const joined = strings.join(', ');
        if (isSafeDetail(joined)) parts.push(`${key}: ${joined}`);
      }
    }
  }
  return parts.length > 0 ? parts.join('\n') : null;
}

/** Cualquier campo del objeto (solo arrays), en formato "clave: valor". */
function catchAllField(record: Record<string, unknown>): string | null {
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value) && value.length > 0) {
      const first = stringifySafeItem(value[0]);
      if (first !== null && isSafeDetail(first)) return `${key}: ${first}`;
    }
  }
  return null;
}

export function parseApiError(
  error: unknown,
  defaultMessage = 'Ocurrió un error inesperado.',
): string {
  const candidate = unwrapCandidate(error);
  if (!isAxiosError(candidate)) return defaultMessage;

  const status = candidate.response?.status;
  const data = candidate.response?.data;

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === 'string' && isSafeDetail(record.detail)) {
      return record.detail;
    }
    const joined = extractFieldList(record);
    if (joined !== null) return joined;
  }

  if (status !== undefined) {
    const mapped = STATUS_MESSAGES[status];
    if (mapped !== undefined) return mapped;
  }

  return defaultMessage;
}

/**
 * Precedencia única para mensajes planos (mutations/toasts):
 * detail → message → non_field_errors → fieldKeys → STATUS_MESSAGES →
 * defaultMessage. Todos los valores pasan por `isSafeDetail`.
 */
export function extractApiError(
  error: unknown,
  fieldKeys: readonly string[],
  defaultMessage = GENERIC_SERVER,
): string {
  const candidate = unwrapCandidate(error);
  if (!isAxiosError(candidate)) {
    return error instanceof Error ? error.message : 'Error desconocido.';
  }

  const data = candidate.response?.data;
  const status = candidate.response?.status;

  if (data == null) return STATUS_MESSAGES[status ?? -1] ?? defaultMessage;

  if (typeof data === 'string') {
    return sanitizeBody(data, status);
  }

  const record = data as Record<string, unknown>;
  const general =
    pickSafeString(record.detail) ??
    pickSafeString(record.message) ??
    pickSafeString(record.non_field_errors) ??
    firstFieldValue(record, fieldKeys);

  return general ?? STATUS_MESSAGES[status ?? -1] ?? defaultMessage;
}

/**
 * Precedencia para errores de formulario (pares campo/mensaje):
 * detail → message → non_field_errors (como `general`); luego fieldKeys (en
 * `fields`); catch-all de arrays si no hubo coincidencia; STATUS_MESSAGES;
 * default si nada.
 */
export function extractFieldErrors(
  error: unknown,
  fieldKeys: readonly string[],
): { fields: Record<string, string>; general: string | null } {
  const candidate = unwrapCandidate(error);
  if (!isAxiosError(candidate)) {
    return {
      fields: {},
      general: error instanceof Error ? error.message : 'Error desconocido.',
    };
  }

  const data = candidate.response?.data;
  const status = candidate.response?.status;
  const statusMessage = STATUS_MESSAGES[status ?? -1];

  if (data == null) {
    return { fields: {}, general: statusMessage ?? GENERIC_SERVER };
  }

  if (typeof data === 'string') {
    return {
      fields: {},
      general: sanitizeBody(data, status),
    };
  }

  const record = data as Record<string, unknown>;

  const detail = pickSafeString(record.detail);
  if (detail !== null) return { fields: {}, general: detail };

  const message = pickSafeString(record.message);
  if (message !== null) return { fields: {}, general: message };

  const nonField = pickSafeString(record.non_field_errors);
  if (nonField !== null) return { fields: {}, general: nonField };

  const fields: Record<string, string> = {};
  let foundField = false;
  for (const key of fieldKeys) {
    const first = pickSafeString(record[key]);
    if (first !== null) {
      fields[key] = first;
      foundField = true;
    }
  }

  if (!foundField) {
    const catchAll = catchAllField(record);
    if (catchAll !== null) return { fields, general: catchAll };
    return { fields, general: statusMessage ?? GENERIC_SERVER };
  }

  return { fields, general: null };
}
