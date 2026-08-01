import { assertValidId } from '../constants/api';
import type {
  Recoleccion,
  RecoleccionEstado,
  RecoleccionList,
  RecoleccionPayload,
} from '../types/recolecciones';
import { fetchAllPages, type FetchAllPagesResult } from '../utils/pagination';
import api from './api';

export interface ApiResponse<T> {
  data: T;
}

export type RecoleccionFilters = {
  estado?: RecoleccionEstado;
  fk_agricultor?: number;
  fecha?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
};

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

export async function createRecoleccion(
  payload: RecoleccionPayload,
): Promise<ApiResponse<Recoleccion>> {
  const { data } = await api.post<ApiResponse<Recoleccion>>(
    '/recolecciones/',
    payload,
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
