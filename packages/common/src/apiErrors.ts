const STATUS_MESSAGES: Record<number, string> = {
  401: 'Credenciales inválidas o sesión expirada.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'El recurso solicitado no fue encontrado.',
  409: 'Conflicto: Ya existe un registro con esos datos.',
  429: 'Límite de peticiones excedido. Intenta más tarde.',
};

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
    return 'Error interno del servidor. Revisa los logs del backend.';
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

function parseAxiosError(error: unknown): string | null {
  const candidate =
    error instanceof Error && error.cause !== undefined ? error.cause : error;

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
      for (const item of arr) {
        const text = String(item).trim();
        // The array path enforces the same sanitization policy as detail/message.
        if (text !== '' && isSafeDetail(text)) {
          fieldErrors.push(text);
        }
      }
    } else if (Array.isArray(val)) {
      const safeItems = val
        .map((item) => String(item).trim())
        .filter((text) => text !== '' && isSafeDetail(text));
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
  const candidate =
    error instanceof Error && error.cause !== undefined ? error.cause : error;

  if (!isAxiosError(candidate)) {
    return error instanceof Error ? error.message : 'Error desconocido.';
  }

  const data = candidate.response?.data;

  if (!data) return defaultMessage;

  if (typeof data === 'string') {
    return parseHtmlOrStringError(data, candidate.response?.status);
  }

  const record = data as Record<string, unknown>;
  if (typeof record.detail === 'string') {
    if (isSafeDetail(record.detail)) {
      return record.detail;
    }
  }
  if (typeof record.message === 'string' && isSafeDetail(record.message)) {
    return record.message;
  }

  for (const key of fieldKeys) {
    const value = record[key];

    if (Array.isArray(value) && value[0]) return String(value[0]);
  }

  return defaultMessage;
}

function extractFieldErrorsFromData(
  data: Record<string, unknown>,
  fieldKeys: string[],
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
  if (typeof data.message === 'string' && isSafeDetail(data.message)) {
    return { fields, general: data.message };
  }

  let foundField = false;
  for (const key of fieldKeys) {
    const value = data[key];
    if (Array.isArray(value) && value.length > 0) {
      fields[key] = String(value[0]);
      foundField = true;
    } else if (typeof value === 'string') {
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
    return { fields, general: 'Error del servidor. Intenta de nuevo.' };
  }

  return { fields, general: null };
}

export function extractFieldErrors(
  error: unknown,
  fieldKeys: string[],
): { fields: Record<string, string>; general: string | null } {
  const candidate =
    error instanceof Error && error.cause !== undefined ? error.cause : error;

  if (!isAxiosError(candidate)) {
    return {
      fields: {},
      general: error instanceof Error ? error.message : 'Error desconocido.',
    };
  }

  const data = candidate.response?.data;

  if (!data) {
    return { fields: {}, general: 'Error del servidor. Intenta de nuevo.' };
  }

  if (typeof data === 'string') {
    return {
      fields: {},
      general: parseHtmlOrStringError(data, candidate.response?.status),
    };
  }

  return extractFieldErrorsFromData(data as Record<string, unknown>, fieldKeys);
}
