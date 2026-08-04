type NavigateFn = (
  path: string,
  options?: { state?: Record<string, unknown> },
) => void;

let navigateFn: NavigateFn | null = null;

export function setNavigate(fn: NavigateFn): void {
  navigateFn = fn;
}

export function redirect(path: string, state?: Record<string, unknown>): void {
  if (navigateFn) {
    navigateFn(path, state !== undefined ? { state } : {});
  } else {
    // Fallback por si se llama antes de que React Router esté listo.
    // Solo permite rutas relativas para evitar open redirect.
    if (path.startsWith('/') && !path.startsWith('//')) {
      window.location.href = path;
    }
  }
}
