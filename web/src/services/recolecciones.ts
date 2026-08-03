import { assertValidId } from '../constants/api';
import type { ApiResponse } from '../types';
import type {
  Recoleccion,
  RecoleccionEstado,
  RecoleccionList,
  RecoleccionPayload,
} from '../types/recolecciones';
import { fetchAllPages, type FetchAllPagesResult } from '../utils/pagination';
import api from './api';

export type RecoleccionFilters = {
  estado?: RecoleccionEstado;
  fk_agricultor?: number;
  fecha?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
};

// El fetch completo de las recolecciones se usa para detectar duplicados; si
// el backend tarda demasiado, el deadline corta con un fallo visible en lugar
// de dejar el modal en spinner indefinidamente.
const TODAS_DEADLINE_MS = 30_000;

export async function getRecolecciones(
  params?: RecoleccionFilters,
): Promise<ApiResponse<RecoleccionList>> {
  const { data } = await api.get<ApiResponse<RecoleccionList>>(
    '/recolecciones/',
    { params },
  );
  return data;
}

export async function getTodasLasRecolecciones(
  params?: RecoleccionFilters,
  signal?: AbortSignal,
): Promise<FetchAllPagesResult<Recoleccion>> {
  return fetchAllPages<Recoleccion>({
    url: '/recolecciones/',
    params,
    signal,
    maxDurationMs: TODAS_DEADLINE_MS,
    fetchPage: async (url, pageParams, pageSignal) =>
      (
        await api.get<ApiResponse<RecoleccionList>>(url, {
          params: pageParams,
          signal: pageSignal,
        })
      ).data,
    unwrap: (body) => {
      const envelope = body as ApiResponse<RecoleccionList>;
      return { results: envelope.data.results, next: envelope.data.next };
    },
  });
}

// Key de idempotencia: los reintentos de red/timeout no reenvían POST (solo se
// reintentan GET/HEAD/PUT/DELETE), pero el re-despacho tras un 401 con refresh
// reusa el MISMO config — y por tanto la misma clave. Así el servidor puede
// detectar el duplicado si el POST original llegó a persistirse antes del
// fallo. `crypto.randomUUID` solo está disponible en contextos seguros; el
// fallback sigue siendo único por cliente+time.
function idempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  throw new Error(
    'crypto.randomUUID no está disponible — la aplicación requiere un contexto seguro (HTTPS).',
  );
}

export async function createRecoleccion(
  payload: RecoleccionPayload,
): Promise<ApiResponse<Recoleccion>> {
  const { data } = await api.post<ApiResponse<Recoleccion>>(
    '/recolecciones/',
    payload,
    { headers: { 'Idempotency-Key': idempotencyKey() } },
  );
  return data;
}

export async function cambiarEstadoRecoleccion(
  id: number,
  estado: RecoleccionEstado,
): Promise<ApiResponse<Recoleccion>> {
  assertValidId(id, 'recoleccion');
  const { data } = await api.post<ApiResponse<Recoleccion>>(
    `/recolecciones/${String(id)}/estado/`,
    { estado },
  );
  return data;
}

export async function cancelarRecoleccion(
  id: number,
): Promise<ApiResponse<Recoleccion>> {
  assertValidId(id, 'recoleccion');
  const { data } = await api.post<ApiResponse<Recoleccion>>(
    `/recolecciones/${String(id)}/cancelar/`,
  );
  return data;
}
