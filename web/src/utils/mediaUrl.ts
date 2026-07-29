const BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/api\/?$/, '');

let BASE_HOST = '';
try {
  if (BASE.startsWith('http')) {
    BASE_HOST = new URL(BASE).hostname;
  }
} catch {
  // BASE is a relative path — no host to derive
}

const TRUSTED_DOMAINS = [BASE_HOST, 'localhost', '127.0.0.1'].filter(Boolean);

const BLOCKED_PROTOCOLS = /^(javascript|data|vbscript|blob|file):/i;

function fullyDecode(s: string): string {
  let prev = s;
  let limit = 5;
  while (limit-- > 0) {
    try {
      const next = decodeURIComponent(prev);
      if (next === prev) break;
      prev = next;
    } catch {
      break;
    }
  }
  return prev;
}

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const url = new URL(path);
      const host = url.hostname;
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        TRUSTED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))
      ) {
        if (url.username || url.password) return null;
        return path;
      }
    } catch {
      return null;
    }
    return null;
  }
  if (BLOCKED_PROTOCOLS.test(path)) return null;
  const decoded = fullyDecode(path);
  if (BLOCKED_PROTOCOLS.test(decoded)) return null;
  const clean = decoded
    .replace(/\0/g, '')
    .replace(/\.\./g, '')
    .replace(/\/+/g, '/')
    .replace(/^\/+/, '/')
    .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑüÜ0-9_%\-/.?&=#]/g, '');
  const prefixed = clean.startsWith('/') ? clean : `/${clean}`;
  return `${BASE}${prefixed}`;
}
