import axios from 'axios';

const STATUS_MESSAGES: Record<number, string> = {
  401: 'Credenciales inválidas o sesión expirada.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'El recurso solicitado no fue encontrado.',
  409: 'Conflicto: Ya existe un registro con esos datos.',
  429: 'Límite de peticiones excedido. Intenta más tarde.',
};

function extractFieldErrors(data: Record<string, unknown>): string | null {
  const fieldErrors: string[] = [];

  for (const [key, val] of Object.entries(data)) {
    if (key === 'non_field_errors') {
      const arr = Array.isArray(val) ? val : [val];
      fieldErrors.push(...arr.map(String));
    } else if (Array.isArray(val)) {
      fieldErrors.push(`${key}: ${val.map(String).join(', ')}`);
    }
  }

  return fieldErrors.length > 0 ? fieldErrors.join('\n') : null;
}

function isSafeDetail(detail: string): boolean {
  const lower = detail.toLowerCase();
  if (
    lower.includes('traceback (most recent call last)') ||
    lower.includes('line ') ||
    lower.includes('exception') ||
    lower.includes('error in file') ||
    lower.includes('django.db') ||
    lower.includes('database error') ||
    lower.includes('sql') ||
    lower.includes('stacktrace') ||
    lower.includes('file "') ||
    lower.includes('operationalerror') ||
    lower.includes('programmingerror') ||
    lower.includes('integrityerror') ||
    /at\s+[\w\.\$/]+:\d+/i.test(detail)
  ) {
    return false;
  }
  return true;
}

function parseAxiosError(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null;

  const status = error.response?.status;
  const data = error.response?.data as unknown;

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === 'string') {
      if (isSafeDetail(record.detail)) {
        return record.detail;
      }
    }
    const fieldsErr = extractFieldErrors(record);
    if (fieldsErr !== null) return fieldsErr;
  }

  if (status !== undefined) {
    const mapped = STATUS_MESSAGES[status];
    if (mapped !== undefined) return mapped;
  }

  return null;
}

export function parseApiError(
  error: unknown,
  defaultMessage = 'Ocurrió un error inesperado.',
): string {
  const parsed = parseAxiosError(error);
  return parsed ?? defaultMessage;
}
