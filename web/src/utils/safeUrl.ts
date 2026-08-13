/**
 * Devuelve una URL de paginación segura o `null` si no es del mismo origen.
 * DRF construye los enlaces `next` con `request.build_absolute_uri()`, así que
 * llegan como URLs absolutas del mismo origen (`http://host/api/…?page=2`).
 * Se aceptan rutas relativas y absolutas del mismo origen que la API; las URLs
 * cross-origin o de protocolo relativo (`https://evil/…`, `//host/…`) se
 * rechazan para evitar exfiltrar el token de autorización hacia otro origen.
 */

import { API_BASE } from './apiBase';

// Origen real de la API: el mismo base que usa el axios instance (API_BASE),
// resuelto contra window.location.origin cuando es relativo. Cuando no hay
// window (SSR) se resuelve contra un fallback neutral; un `next` absoluto
// cross-origin válido sigue anclándose al origen configurado porque el
// resolvedor usa el base absoluto tal cual, sin depender de window.
function apiOrigin(): string | null {
  try {
    const rawOrigin =
      typeof window !== 'undefined' ? window.location.origin : undefined;
    const windowOrigin =
      !rawOrigin || rawOrigin === 'null' ? 'http://localhost' : rawOrigin;
    const baseUrl = new URL(API_BASE, windowOrigin);
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
    const parsed = new URL(next);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    const origin = apiOrigin();
    if (origin !== null && parsed.origin === origin) return next;
    return null;
  } catch {
    return null;
  }
}
