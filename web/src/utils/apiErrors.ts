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

function parseAxiosError(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null;

  const status = error.response?.status;
  const data = error.response?.data as unknown;

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === 'string') {
      return record.detail;
    }
    const fieldsErr = extractFieldErrors(record);
    if (fieldsErr !== null) return fieldsErr;
  }

  if (status !== undefined) {
    const mapped = STATUS_MESSAGES[status];
    if (mapped !== undefined) return mapped;
    if (status >= 500) return 'Error del servidor. Intenta más tarde.';
  }

  return null;
}

/**
 * Parsea un error de Axios (o estándar) de la API y devuelve un mensaje seguro
 * y amigable para el usuario, evitando filtrar información técnica sensible.
 *
 * @param error El error capturado en el bloque catch
 * @param defaultMessage Mensaje a devolver si no se puede determinar la causa
 * @returns string con el mensaje de error sanitizado
 */
export function parseApiError(
  error: unknown,
  defaultMessage = 'Ocurrió un error inesperado.',
): string {
  const parsed = parseAxiosError(error);
  return parsed ?? defaultMessage;
}
