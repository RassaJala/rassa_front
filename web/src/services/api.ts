import * as Sentry from '@sentry/react';
import axios, { type InternalAxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';

import { parseApiError } from '@/common/apiErrors';
import type { SafeMessageError } from '@/common/apiErrors';
import { API_RETRY_LIMIT } from '@/common/networking';
import { redirect } from './navigate';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

// Safe storage accessors: Firefox blocked-storage mode throws on the property
// accessor itself. Every direct localStorage/sessionStorage access in this
// module must go through these so a throwing getter degrades to null.
function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

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

// Ventana de reintentos por request (medida por método+url+params). Limita los
// fallos del mismo request dentro de la ventana: superado el tope, retryCondition
// devuelve false hasta que la ventana venza. No es un bloqueo permanente: al
// vencer se reabre y la retryability se evalúa de inmediato (nunca se envenena
// la URL). El tope es generoso (≈3 despachos completos de `retries: 2`) y solo
// corta los bucles patológicos del mismo endpoint; cada despacho sigue acotado
// por `retries: 2` y los recorridos paginados por `maxDurationMs` del llamador.
// La identidad del config no sobrevive al `mergeConfig` de axios en cada
// reintento (verificado empíricamente), así que se mide por método+url+params;
// cada página de un bucle paginado tiene URL distinta y la entrada se limpia al
// responder con éxito.
const RETRY_WINDOW_MS = 10_000;

// Fallos del mismo request admitidos dentro de una ventana antes de cortar el
// reintento. Un despacho con `retries: 2` evalúa retryCondition como máximo 2
// veces (axios-retry corta por retryCount antes de la 3ª); 6 deja espacio para
// tres despachos completos y corta a partir del 4º dentro de la ventana.
const RETRY_MAX_PER_WINDOW = 6;

// Cota del rastreo de ventanas: las entradas solo se limpian al responder con
// éxito, así que un fallo terminal podría dejar la clave huérfana. Se evita un
// crecimiento sin límite durante sesiones largas con backend inestable.
const RETRY_TRACK_LIMIT = 1000;

// Evicción FIFO por inserción (no LRU): renovar una clave no la mueve al
// final, así que `keys().next()` borra la entrada más antigua.
const requestFailuresByKey = new Map<
  string,
  { readonly start: number; failures: number }
>();

function openRetryWindow(key: string, now: number): void {
  if (requestFailuresByKey.size >= RETRY_TRACK_LIMIT) {
    const oldest = requestFailuresByKey.keys().next().value as
      string | undefined;
    if (oldest !== undefined) requestFailuresByKey.delete(oldest);
  }
  requestFailuresByKey.set(key, { start: now, failures: 1 });
}

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
  retries: API_RETRY_LIMIT,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    const config = error.config;
    if (!config) return false;
    // Un abort (presupuesto del llamador o deadline) no debe re-despacharse:
    // el objetivo del abort es detener, no reintentar.
    if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') {
      return false;
    }
    const method = config.method?.toLowerCase() ?? '';
    if (!IDEMPOTENT_METHODS.has(method)) return false;
    // 429 = throttling: reintentarlo amplifica la carga sobre un endpoint ya
    // limitado y pelea contra los deadlines del llamador.
    if (error.response?.status === 429) return false;

    const key = retryKey(config);
    const now = Date.now();
    // La retryability se evalúa antes de tocar la ventana: un fallo que no se
    // va a reintentar (p. ej. un 4xx no idempotente) no debe abrir una ventana
    // ni consumir uno de los slots del tope.
    const retryableNow =
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status !== undefined &&
        error.response.status >= SERVER_ERROR_THRESHOLD);
    const entry = requestFailuresByKey.get(key);
    if (entry === undefined || now - entry.start > RETRY_WINDOW_MS) {
      // Ventana nueva o vencida: se reabre y la retryability se evalúa de
      // inmediato. Reabrir (y no devolver false sin renovar) evita envenenar
      // los reintentos futuros de esa URL.
      if (retryableNow) openRetryWindow(key, now);
      return retryableNow;
    }
    if (retryableNow) entry.failures += 1;
    if (entry.failures > RETRY_MAX_PER_WINDOW) return false;
    return retryableNow;
  },
});

api.interceptors.request.use((config) => {
  const url = config.url ?? '';
  if (isPublic(url)) return config;
  const token = getLocalStorage()?.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const NO_REDIRECT_ON_401 = ['/auth/change-password/', '/token/refresh/'];

// --- Refresh token ---

// ponytail: sanitize — never send the raw AxiosError (its toJSON leaks the Authorization header)
// Preserves status, url, and method context for per-endpoint error-rate monitoring
// while ensuring no credentials leak into Sentry events.
function reportError(error: unknown): void {
  if (!(error && typeof error === 'object' && 'isAxiosError' in error)) {
    if (error instanceof Error) {
      Sentry.captureException(error);
    }
    return;
  }

  const axiosError = error as {
    message?: unknown;
    name?: unknown;
    code?: unknown;
    response?: {
      status?: unknown;
      config?: { url?: unknown; method?: unknown };
    };
    config?: { url?: unknown; method?: unknown };
  };

  Sentry.captureException(
    Object.assign(new Error(String(axiosError.message ?? 'AxiosError')), {
      name: axiosError.name ?? 'AxiosError',
      code: axiosError.code ?? null,
      status: axiosError.response?.status ?? null,
      url: axiosError.response?.config?.url ?? axiosError.config?.url ?? null,
      method:
        axiosError.response?.config?.method ??
        axiosError.config?.method ??
        null,
    }),
  );
}

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
  getLocalStorage()?.removeItem('token');
  getLocalStorage()?.removeItem('user');
  getSessionStorage()?.removeItem('refresh_token');
  pendingRequests.forEach(({ reject }) => reject(new Error('Sesión expirada')));
  pendingRequests = [];
  isRefreshing = false;
  refreshRetried.clear();
  redirect('/login', { from: window.location.pathname });
}

// Fallos del refresh que sí justifican cerrar sesión: no hay refresh token
// guardado o la respuesta fue malformada. Son estados no transitorios (la
// sesión no se puede renovar), a diferencia de un error de red/timeout.
function crearFalloDeAutenticacionRefresh(): Error {
  return Object.assign(new Error('Sesión no renovable'), {
    esFalloDeAutenticacionRefresh: true,
  });
}

// Estados fatales del endpoint de refresh: token revocado, expirado o inválido.
// Un 408 (timeout de proxy), 422 (validación) o 429 (throttle) son transitorios
// y no deben destruir una sesión válida.
const STATUS_FATALES_REFRESH = new Set([400, 401, 403]);

// Un fallo de red/timeout del refresh no invalida la sesión: el access token
// sigue siendo válido hasta expirar y un 401 posterior (cuando la red vuelva)
// puede reintentar el refresh. Solo un 400/401/403 del endpoint de refresh
// (token revocado, expirado o inválido) o un fallo no transitorio (sin refresh
// token, respuesta malformada) justifican borrar credenciales y redirigir.
function esFalloDeAutenticacionRefresh(error: unknown): boolean {
  if (error && typeof error === 'object') {
    if ('esFalloDeAutenticacionRefresh' in error) return true;
    if ('response' in error) {
      const status = (error as { response?: { status?: unknown } }).response
        ?.status;
      return typeof status === 'number' && STATUS_FATALES_REFRESH.has(status);
    }
  }
  return false;
}

async function refreshAccessToken(
  originalRequest: InternalAxiosRequestConfig,
): Promise<unknown> {
  const refreshToken = getSessionStorage()?.getItem('refresh_token');
  if (!refreshToken) throw crearFalloDeAutenticacionRefresh();

  const { data } = await axios.post<{ access?: string; refresh?: string }>(
    `${API_URL}/token/refresh/`,
    { refresh: refreshToken },
    { timeout: 10_000 },
  );

  if (typeof data.access !== 'string' || data.access.length === 0) {
    throw crearFalloDeAutenticacionRefresh();
  }

  const access = data.access;

  getLocalStorage()?.setItem('token', access);
  if (data.refresh) {
    getSessionStorage()?.setItem('refresh_token', data.refresh);
  }

  // Retry all queued requests with the new token
  pendingRequests.forEach(({ resolve }) => resolve(access));
  pendingRequests = [];

  // Reset BEFORE retrying to avoid deadlock if retry also gets 401
  isRefreshing = false;

  originalRequest.headers.Authorization = `Bearer ${access}`;
  refreshRetried.add(retryKey(originalRequest));
  return api(originalRequest);
}

api.interceptors.response.use(
  (response) => {
    requestFailuresByKey.delete(retryKey(response.config));
    // Un reintento con token fresco que terminó OK no debe marcar para siempre
    // la URL: si el marcador sobreviviera, un 401 posterior cerraría sesión
    // directo en vez de volver a refrescar.
    refreshRetried.delete(retryKey(response.config));
    return response;
  },
  (error) => {
    const requestUrl: string | undefined = error.config?.url;

    // Ya reintentamos con un token fresco y el servidor vuelve a devolver 401:
    // la sesión es inválida, cerramos sesión y redirigimos en vez de re-refrescar.
    // Un fallo distinto (5xx, red, timeout, cancelación) NO cierra sesión: la
    // sesión sigue siendo válida y un 401 futuro podrá refrescar de nuevo.
    if (error.config && refreshRetried.has(retryKey(error.config))) {
      refreshRetried.delete(retryKey(error.config));
      if (error.response?.status === 401) {
        clearAuthAndRedirect();
      }
      return Promise.reject(error);
    }

    const is401 =
      error.response?.status === 401 &&
      window.location.pathname !== '/login' &&
      requestUrl &&
      !NO_REDIRECT_ON_401.some((prefix) => requestUrl.startsWith(prefix));

    if (!is401) {
      reportError(error);
      // Expose a UI-safe `safeMessage` without mutating the original `message`
      // (R1-002/R4-002): Sentry/downstream keep the raw text, surfaces read the
      // sanitized variant. 401 flow is untouched (CRITICAL #1 from #82).
      (error as SafeMessageError).safeMessage = parseApiError(error);
      return Promise.reject(error);
    }

    // Intenta refrescar el token antes de redirigir
    if (!isRefreshing) {
      isRefreshing = true;
      return refreshAccessToken(error.config).catch((refreshError) => {
        if (esFalloDeAutenticacionRefresh(refreshError)) {
          clearAuthAndRedirect();
          return Promise.reject(error);
        }
        // Red caída o timeout del refresh: no destruimos la sesión (el token
        // sigue siendo válido); rechazamos las peticiones en cola y dejamos
        // que un 401 posterior, con red disponible, reintente el refresh.
        // La request disparadora se rechaza con el error transitorio del
        // refresh (no con el 401 crudo) para no mostrar "Credenciales
        // inválidas" cuando la sesión sigue siendo válida.
        pendingRequests.forEach(({ reject }) =>
          reject(new Error('No se pudo renovar la sesión')),
        );
        pendingRequests = [];
        isRefreshing = false;
        return Promise.reject(refreshError);
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
