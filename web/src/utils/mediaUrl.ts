const BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/api\/?$/, '');

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const clean = path.replace(/\.\./g, '').replace(/^\/+/, '/');
  return `${BASE}${clean}`;
}
