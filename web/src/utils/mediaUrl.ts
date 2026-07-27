const BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/api\/?$/, "");

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const clean = path
    .replace(/%2e/gi, "")
    .replace(/\.\./g, "")
    .replace(/\/\/+/g, "/")
    .replace(/^\/+/, "/")
    .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑüÜ0-9_%\-/.]/g, "");
  const prefixed = clean.startsWith("/") ? clean : `/${clean}`;
  return `${BASE}${prefixed}`;
}
