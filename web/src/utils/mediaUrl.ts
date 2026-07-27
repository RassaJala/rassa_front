const BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/api\/?$/, "");

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const clean = path
    .replace(/\.\./g, "")
    .replace(/^\/+/, "/")
    .replace(/[^a-zA-Z0-9_\-/.]/g, "");
  return `${BASE}${clean}`;
}
