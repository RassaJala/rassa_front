import axios, { type InternalAxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';
import { redirect } from './navigate';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

const PUBLIC_ENDPOINTS = ['/token/', '/auth/register/'];

function isPublic(url: string): boolean {
  return PUBLIC_ENDPOINTS.some((prefix) =>
    url.toLowerCase().startsWith(prefix),
  );
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

const SERVER_ERROR_THRESHOLD = 500;

const IDEMPOTENT_METHODS = new Set([
  'get',
  'head',
  'put',
  'delete',
  'options',
  'trace',
]);

// Ventana total de reintentos por request: evita que un 15s de timeout por
// intento se apile (2 reintentos * 15s ≈ 45s+ por página) en bucles paginados.
// La identidad del config no sobrevive al `mergeConfig` de axios en cada
// reintento (verificado empíricamente), así que se mide por método+url+params;
// cada página de un bucle paginado tiene URL distinta y la entrada se limpia al
// responder con éxito.
const RETRY_WINDOW_MS = 10_000;

const requestStartByUrl = new Map<string, number>();

// `config.url` no incluye los query params (viven en `config.params`), así que
// se serializan en la clave: dos requests paralelas a la misma URL con params
// distintos no comparten presupuesto de reintentos.
function retryKey(config: {
  readonly url?: string;
  readonly method?: string;
  readonly params?: unknown;
}) {
  const query =
    config.params == null ? '' : `?${JSON.stringify(config.params)}`;
  return `${(config.method ?? 'get').toLowerCase()} ${config.url ?? ''}${query}`;
}

axiosRetry(api, {
  retries: 2,
  retryDelay: (retryNumber) => Math.min(200 * 2 ** retryNumber, 1_600),
  retryCondition: (error) => {
    const config = error.config;
    if (!config) return false;
    const method = config.method?.toLowerCase() ?? '';
    if (!IDEMPOTENT_METHODS.has(method)) return false;
    const key = retryKey(config);
    const now = Date.now();
    const started = requestStartByUrl.get(key);
    if (started === undefined) {
      requestStartByUrl.set(key, now);
    } else if (now - started > RETRY_WINDOW_MS) {
      // Entrada vencida: renuevo la ventana y sigo evaluando la retryability.
      // Devolver false sin renovar envenenaría todos los reintentos futuros de
      // esa URL; renovar mantiene el presupuesto real en `retries: 2`.
      requestStartByUrl.set(key, now);
    }
    if (axiosRetry.isNetworkOrIdempotentRequestError(error)) return true;
    return (
      error.response?.status !== undefined &&
      error.response.status >= SERVER_ERROR_THRESHOLD
    );
  },
});

api.interceptors.request.use((config) => {
  const url = config.url ?? '';
  if (isPublic(url)) return config;
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const NO_REDIRECT_ON_401 = ['/auth/change-password/', '/token/refresh/'];

// --- Refresh token ---

let isRefreshing = false;
let pendingRequests: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

// Requests que ya se reintentaron una vez con un token de refresh fresco. Un
// 401 posterior indica sesión inválida (token rotado o revocado), no un acceso
// caducado: si lo reintentáramos de nuevo tendríamos un bucle de refrescos.
// Se indexa por method+url (no por identidad del config): el re-despacho de un
// reintento pasa por `mergeConfig` y genera un objeto nuevo, así que la
// identidad no sobrevive.
const refreshRetried = new Set<string>();

function clearAuthAndRedirect(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('refresh_token');
  pendingRequests.forEach(({ reject }) => reject(new Error('Sesión expirada')));
  pendingRequests = [];
  isRefreshing = false;
  redirect('/login', { from: window.location.pathname });
}

async function refreshAccessToken(
  originalRequest: InternalAxiosRequestConfig,
): Promise<unknown> {
  const refreshToken = sessionStorage.getItem('refresh_token');
  if (!refreshToken) throw new Error('No refresh token');

  const { data } = await axios.post<{ access?: string; refresh?: string }>(
    `${API_URL}/token/refresh/`,
    { refresh: refreshToken },
    { timeout: 10_000 },
  );

  if (typeof data.access !== 'string' || data.access.length === 0) {
    throw new Error('Respuesta de refresh inválida');
  }

  localStorage.setItem('token', data.access);
  if (data.refresh) {
    sessionStorage.setItem('refresh_token', data.refresh);
  }

  // Retry all queued requests with the new token
  pendingRequests.forEach(({ resolve }) => resolve(data.access));
  pendingRequests = [];

  // Reset BEFORE retrying to avoid deadlock if retry also gets 401
  isRefreshing = false;

  originalRequest.headers.Authorization = `Bearer ${data.access}`;
  refreshRetried.add(retryKey(originalRequest));
  return api(originalRequest);
}

api.interceptors.response.use(
  (response) => {
    requestStartByUrl.delete(retryKey(response.config));
    // Un reintento con token fresco que terminó OK no debe marcar para siempre
    // la URL: si el marcador sobreviviera, un 401 posterior cerraría sesión
    // directo en vez de volver a refrescar.
    refreshRetried.delete(retryKey(response.config));
    return response;
  },
  (error) => {
    const requestUrl: string | undefined = error.config?.url;

    // Ya reintentamos con un token fresco y el servidor sigue devolviendo 401:
    // la sesión es inválida, cerramos sesión y redirigimos en vez de re-refrescar.
    if (error.config && refreshRetried.has(retryKey(error.config))) {
      refreshRetried.delete(retryKey(error.config));
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    const is401 =
      error.response?.status === 401 &&
      window.location.pathname !== '/login' &&
      requestUrl &&
      !NO_REDIRECT_ON_401.some((prefix) => requestUrl.startsWith(prefix));

    if (!is401) return Promise.reject(error);

    // Intenta refrescar el token antes de redirigir
    if (!isRefreshing) {
      isRefreshing = true;
      return refreshAccessToken(error.config).catch(() => {
        clearAuthAndRedirect();
        return Promise.reject(error);
      });
    }

    // Otra solicitud ya está refrescando — encolamos esta
    return new Promise<unknown>((resolve, reject) => {
      pendingRequests.push({
        resolve: (newToken: string) => {
          error.config.headers.Authorization = `Bearer ${newToken}`;
          // Si este reintento vuelve a dar 401, la sesión es inválida: marcar
          // aquí garantiza logout directo en vez de un segundo ciclo de refresh.
          refreshRetried.add(retryKey(error.config));
          resolve(api(error.config));
        },
        reject,
      });
    });
  },
);

export default api;
