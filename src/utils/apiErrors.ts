import axios from 'axios';

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
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;

    // Si el backend envía un "detail" de texto, lo usamos
    if (data && typeof data === 'object' && typeof data.detail === 'string') {
      return data.detail;
    }

    // Si el backend envía errores de campo específicos en formato de objeto o lista
    if (data && typeof data === 'object') {
      const fieldErrors: string[] = [];
      for (const [key, val] of Object.entries(data)) {
        if (key === 'non_field_errors') {
          const arr = Array.isArray(val) ? val : [val];
          fieldErrors.push(...arr.map(String));
        } else if (Array.isArray(val)) {
          // ponytail: Omitimos los nombres de campos internos de la BD en producción,
          // pero para feedback al usuario a veces es necesario.
          // Idealmente el backend debería mandar un detail genérico o mapear.
          fieldErrors.push(`${key}: ${val.map(String).join(', ')}`);
        }
      }
      if (fieldErrors.length > 0) return fieldErrors.join('\n');
    }

    // Fallbacks por status code
    if (status === 401) return 'Credenciales inválidas o sesión expirada.';
    if (status === 403) return 'No tienes permiso para realizar esta acción.';
    if (status === 404) return 'El recurso solicitado no fue encontrado.';
    if (status === 409) return 'Conflicto: Ya existe un registro con esos datos.';
    if (status === 429) return 'Límite de peticiones excedido. Intenta más tarde.';
    if (status && status >= 500) return 'Error del servidor. Intenta más tarde.';
  }

  // Fallback si no es de axios o no hay status. Nunca retornar error.message en producción.
  return defaultMessage;
}
