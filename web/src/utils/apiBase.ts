// Única fuente de verdad del base de la API para la web. api.ts la usa como
// baseURL del axios instance y safeUrl.ts la usa como ancla para validar los
// enlaces `next` de paginación: si una fuente derivara el origen de otro lado
// (window.location.origin) y la otra no, un despliegue cross-origin validaría
// contra un origen distinto del real y truncaría o exfiltraría.
export const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
