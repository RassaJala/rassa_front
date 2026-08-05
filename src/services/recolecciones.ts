import type {
  Recoleccion,
  RecoleccionEstado,
  RecoleccionPayload,
} from '@/types/recolecciones';
import { assertValidId } from '@/utils/ids';

import api from './api';
import { fetchAllPages, unwrapOk } from './pagination';
import type { PaginatedFetchResult } from './pagination';

const RECOLECCIONES_URL = '/recolecciones/';

export type RecoleccionesResult = PaginatedFetchResult<Recoleccion>;

interface RecoleccionFilters {
  readonly estado?: RecoleccionEstado;
  readonly fkAgricultor?: number;
  readonly fecha?: string;
  readonly fechaDesde?: string;
  readonly fechaHasta?: string;
}

function buildQueryString(filters: RecoleccionFilters): string {
  const params = new URLSearchParams();
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.fkAgricultor !== undefined) {
    params.set('fk_agricultor', String(filters.fkAgricultor));
  }
  if (filters.fecha) params.set('fecha', filters.fecha);
  if (filters.fechaDesde) params.set('fecha_desde', filters.fechaDesde);
  if (filters.fechaHasta) params.set('fecha_hasta', filters.fechaHasta);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function fetchRecolecciones(
  filters: RecoleccionFilters = {},
): Promise<RecoleccionesResult> {
  return fetchAllPages<Recoleccion>(
    `${RECOLECCIONES_URL}${buildQueryString(filters)}`,
    { source: 'recolecciones', keyOf: (r) => r.id_recoleccion },
  );
}

function uuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function createRecoleccion(
  payload: RecoleccionPayload,
): Promise<Recoleccion> {
  const { data } = await api.post<unknown>(RECOLECCIONES_URL, payload, {
    headers: { 'Idempotency-Key': uuidV4() },
  });
  return unwrapOk<Recoleccion>(data);
}

export async function cambiarEstadoRecoleccion(
  id: number,
  estado: RecoleccionEstado,
): Promise<Recoleccion> {
  assertValidId(id, 'recoleccion');
  const { data } = await api.post<unknown>(
    `${RECOLECCIONES_URL}${id}/estado/`,
    { estado },
  );
  return unwrapOk<Recoleccion>(data);
}

export async function cancelarRecoleccion(id: number): Promise<Recoleccion> {
  assertValidId(id, 'recoleccion');
  const { data } = await api.post<unknown>(
    `${RECOLECCIONES_URL}${id}/cancelar/`,
  );
  return unwrapOk<Recoleccion>(data);
}
