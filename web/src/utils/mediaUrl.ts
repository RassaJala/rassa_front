const BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/api\/?$/, '');

const TRUSTED_DOMAINS = ['localhost', '127.0.0.1', 'api.example.com'];

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const url = new URL(path);
      const host = url.hostname;
      if (TRUSTED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
        return path;
      }
    } catch {
      return null;
    }
    return null;
  }
  const clean = path
    .replace(/%2e/gi, '')
    .replace(/%2f/gi, '')
    .replace(/\.\./g, '')
    .replace(/\/\/+/g, '/')
    .replace(/^\/+/, '/')
    .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑüÜ0-9_%\-/.]/g, '');
  const prefixed = clean.startsWith('/') ? clean : `/${clean}`;
  return `${BASE}${prefixed}`;
}
