const STATUS_MESSAGES: Record<number, string> = {
  401: 'Credenciales inválidas o sesión expirada.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'El recurso solicitado no fue encontrado.',
  409: 'Conflicto: Ya existe un registro con esos datos.',
  429: 'Límite de peticiones excedido. Intenta más tarde.',
};

// Shared across clients: the sanitized message shown when the backend returns
// HTML / a traceback body instead of JSON (never render the raw body — R10).
export const INTERNAL_SERVER_HTML_MESSAGE =
  'Error interno del servidor. Revisa los logs del backend.';

function parseHtmlOrStringError(data: string, status?: number): string {
  const trimmed = data.trim();

  if (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.includes('Traceback (most recent call last)')
  ) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(
        '[API Error] Backend returned HTML instead of JSON — check backend logs. Status:',
        status,
      );
    }
    return INTERNAL_SERVER_HTML_MESSAGE;
  }

  // String bodies enforce the same safety policy as the JSON paths: text that
  // looks like a traceback or DB error must never reach the user.
  if (trimmed === '' || !isSafeDetail(trimmed)) {
    return 'Error interno del servidor. Revisa los logs del backend.';
  }
  return trimmed;
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

// Reads error.cause without requiring lib es2022 (web tsconfig lib is ES2020;
// `Error.cause` is only typed from ES2022 onward). Shared by every extractor.
export function unwrapCause(error: unknown): unknown {
  if (!(error instanceof Error)) return error;
  const cause = (error as { cause?: unknown }).cause;
  return cause !== undefined ? cause : error;
}

function parseAxiosError(error: unknown): string | null {
  const candidate = unwrapCause(error);

  if (!isAxiosError(candidate)) return null;

  const status = candidate.response?.status;
  const data = candidate.response?.data as unknown;

  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (trimmed !== '' && !trimmed.startsWith('<') && isSafeDetail(trimmed)) {
      return trimmed;
    }
  } else if (Array.isArray(data)) {
    // DRF non-field errors arrive as a top-level array (["Stock insuficiente..."]).
    // NOTE: arrays are `typeof 'object'`, so this branch must come before the
    // generic object branch below.
    const first = data[0];
    if (first !== undefined) {
      const text = String(first).trim();
      if (text !== '' && isSafeDetail(text)) return text;
    }
  } else if (data !== null && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === 'string' && isSafeDetail(record.detail)) {
      return record.detail;
    }
    for (const key of ['message', 'error'] as const) {
      const value = record[key];
      if (typeof value === 'string' && value !== '' && isSafeDetail(value)) {
        return value;
      }
    }
    const fieldsErr = extractFieldErrorsFromList(record);
    if (fieldsErr !== null) return fieldsErr;
  }

  if (status !== undefined) {
    const mapped = STATUS_MESSAGES[status];
    if (mapped !== undefined) return mapped;
  }

  return null;
}

function extractFieldErrorsFromList(
  data: Record<string, unknown>,
): string | null {
  const fieldErrors: string[] = [];

  for (const [key, val] of Object.entries(data)) {
    if (key === 'non_field_errors') {
      const arr = Array.isArray(val) ? val : [val];
      // R3-W: traceback items must never reach the UI — only safe items are
      // kept; an all-unsafe list contributes nothing.
      fieldErrors.push(...arr.map(String).filter((item) => isSafeDetail(item)));
    } else if (Array.isArray(val)) {
      // R3-W: the field line is built only from safe items — a traceback item
      // must not leak through the list path either.
      const safeItems = val.map(String).filter((item) => isSafeDetail(item));
      if (safeItems.length > 0) {
        fieldErrors.push(`${key}: ${safeItems.join(', ')}`);
      }
    }
  }

  return fieldErrors.length > 0 ? fieldErrors.join('\n') : null;
}

export function parseApiError(
  error: unknown,
  defaultMessage = 'Ocurrió un error inesperado.',
): string {
  const parsed = parseAxiosError(error);
  return parsed ?? defaultMessage;
}

export function extractApiError(
  error: unknown,
  fieldKeys: string[],
  defaultMessage = 'Error del servidor. Intenta de nuevo.',
): string {
  const candidate = unwrapCause(error);

  if (!isAxiosError(candidate)) {
    return error instanceof Error ? error.message : 'Error desconocido.';
  }

  const data = candidate.response?.data;
  const status = candidate.response?.status;

  if (!data) {
    if (status !== undefined) {
      const mapped = STATUS_MESSAGES[status];
      if (mapped) return mapped;
    }
    return defaultMessage;
  }

  if (typeof data === 'string') {
    return parseHtmlOrStringError(data, candidate.response?.status);
  }

  const record = data as Record<string, unknown>;
  if (typeof record.detail === 'string') {
    if (isSafeDetail(record.detail)) {
      return record.detail;
    }
  }
  if (typeof record.message === 'string') {
    if (isSafeDetail(record.message)) {
      return record.message;
    }
  }
  if (typeof record.non_field_errors === 'string') {
    if (isSafeDetail(record.non_field_errors)) {
      return record.non_field_errors;
    }
  }
  if (Array.isArray(record.non_field_errors) && record.non_field_errors.length > 0) {
    const first = record.non_field_errors[0];
    if (typeof first === 'string' || typeof first === 'number' || typeof first === 'boolean') {
      const text = String(first);
      if (isSafeDetail(text)) {
        return text;
      }
    }
  }

  for (const key of fieldKeys) {
    const value = record[key];

    if (typeof value === 'string') {
      if (isSafeDetail(value)) {
        return value;
      }
    }
    if (Array.isArray(value) && value[0] !== undefined) {
      const item = value[0];
      if (typeof item !== 'string' && typeof item !== 'number' && typeof item !== 'boolean') {
        continue;
      }
      const text = String(item);
      if (isSafeDetail(text)) {
        return text;
      }
    }
  }

  if (status !== undefined) {
    const mapped = STATUS_MESSAGES[status];
    if (mapped) return mapped;
  }

  return defaultMessage;
}

function extractFieldErrorsFromData(
  data: Record<string, unknown>,
  fieldKeys: string[],
  status?: number,
): { fields: Record<string, string>; general: string | null } {
  const fields: Record<string, string> = {};

  if (typeof data.detail === 'string') {
    return {
      fields,
      general: isSafeDetail(data.detail)
        ? data.detail
        : 'Error interno del servidor.',
    };
  }
  if (typeof data.message === 'string') {
    // R3-W: `message` passes through the same sanitizer as `detail` — a
    // traceback body in `message` must never render raw in the UI.
    return {
      fields,
      general: isSafeDetail(data.message)
        ? data.message
        : 'Error interno del servidor.',
    };
  }

  let foundField = false;
  for (const key of fieldKeys) {
    const value = data[key];
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (typeof first !== 'string' && typeof first !== 'number' && typeof first !== 'boolean') {
        continue;
      }
      const item = String(first);
      if (isSafeDetail(item)) {
        fields[key] = item;
        foundField = true;
      }
    } else if (typeof value === 'string') {
      if (isSafeDetail(value)) {
        fields[key] = value;
        foundField = true;
      }
    }
  }

  if (!foundField) {
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v) && v.length > 0) {
        const first = v[0];
        if (typeof first !== 'string' && typeof first !== 'number' && typeof first !== 'boolean') {
          continue;
        }
        const item = String(first);
        if (isSafeDetail(item)) {
          const key = k === 'non_field_errors' ? '' : `${k}: `;
          return { fields, general: `${key}${item}` };
        }
      }
    }
    if (status !== undefined) {
      const mapped = STATUS_MESSAGES[status];
      if (mapped) return { fields, general: mapped };
    }
    return { fields, general: 'Error del servidor. Intenta de nuevo.' };
  }

  if (status !== undefined) {
    const mapped = STATUS_MESSAGES[status];
    if (mapped) return { fields, general: mapped };
  }

  return { fields, general: null };
}

export function extractFieldErrors(
  error: unknown,
  fieldKeys: string[],
): { fields: Record<string, string>; general: string | null } {
  const candidate = unwrapCause(error);

  if (!isAxiosError(candidate)) {
    return {
      fields: {},
      general: error instanceof Error ? error.message : 'Error desconocido.',
    };
  }

  const data = candidate.response?.data;

  if (!data) {
    const status = candidate.response?.status;
    if (status !== undefined) {
      const mapped = STATUS_MESSAGES[status];
      if (mapped) return { fields: {}, general: mapped };
    }
    return { fields: {}, general: 'Error del servidor. Intenta de nuevo.' };
  }

  if (typeof data === 'string') {
    return {
      fields: {},
      general: parseHtmlOrStringError(data, candidate.response?.status),
    };
  }

  return extractFieldErrorsFromData(data as Record<string, unknown>, fieldKeys, candidate.response?.status);
}
