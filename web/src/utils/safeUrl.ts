/**
 * Devuelve una URL de paginación segura o `null` si no es del mismo origen.
 * Solo se permite una ruta relativa que empiece con `/`; las URLs absolutas o
 * de protocolo relativo (`https://host/…`, `//host/…`) se rechazan para
 * evitar exfiltrar el token de autorización hacia otro origen.
 */
export function safeNextUrl(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith('/')) return null;
  if (next.startsWith('//')) return null;
  if (next.includes('\\')) return null;
  return next;
}
