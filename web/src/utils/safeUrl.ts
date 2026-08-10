/**
 * Devuelve una URL de paginación segura o `null` si no es del mismo origen.
 * DRF construye los enlaces `next` con `request.build_absolute_uri()`, así que
 * llegan como URLs absolutas del mismo origen (`http://host/api/…?page=2`).
 * Se aceptan rutas relativas y absolutas del mismo origen que la API; las URLs
 * cross-origin o de protocolo relativo (`https://evil/…`, `//host/…`) se
 * rechazan para evitar exfiltrar el token de autorización hacia otro origen.
 */

/** Origen de la API: base configurada o `window.location.origin` si es relativa. */
function apiOrigin(): string | null {
  try {
    const base = import.meta.env.VITE_API_URL ?? '/api';
    const baseUrl = new URL(
      base,
      typeof window === 'undefined' ? undefined : window.location.origin,
    );
    return baseUrl.origin;
  } catch {
    return null;
  }
}

export function safeNextUrl(next: string | null | undefined): string | null {
  if (!next) return null;
  if (next.startsWith('//')) return null;
  if (next.includes('\\')) return null;
  if (next.startsWith('/')) return next;
  try {
    const origin = apiOrigin();
    if (origin === null) return null;
    return new URL(next).origin === origin ? next : null;
  } catch {
    return null;
  }
}
