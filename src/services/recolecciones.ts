import * as Sentry from '@sentry/react-native';

import type {
  Recoleccion,
  RecoleccionEstado,
  RecoleccionPayload,
} from '@/types/recolecciones';
import { assertValidId } from '@/utils/ids';

import api from './api';
import { fetchAllPages, unwrapOk } from './pagination';
import type { PaginatedFetchResult } from './pagination';
import { sanitizeSentryError } from './sentry';

const RECOLECCIONES_URL = '/recolecciones/';

export type RecoleccionesResult = PaginatedFetchResult<Recoleccion>;

interface RecoleccionFilters {
  readonly estado?: RecoleccionEstado;
  readonly fkAgricultor?: number;
  readonly fecha?: string;
  readonly fechaDesde?: string;
  readonly fechaHasta?: string;
}

function buildQuery(filters: RecoleccionFilters): string {
  const params = new URLSearchParams();
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.fkAgricultor)
    params.set('fk_agricultor', String(filters.fkAgricultor));
  if (filters.fecha) params.set('fecha', filters.fecha);
  if (filters.fechaDesde) params.set('fecha_desde', filters.fechaDesde);
  if (filters.fechaHasta) params.set('fecha_hasta', filters.fechaHasta);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchRecolecciones(
  filters: RecoleccionFilters = {},
): Promise<RecoleccionesResult> {
  return fetchAllPages<Recoleccion>(
    `${RECOLECCIONES_URL}${buildQuery(filters)}`,
    { keyOf: (r) => r.id_recoleccion },
  );
}

function uuidV4(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
      '',
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function createRecoleccion(
  payload: RecoleccionPayload,
): Promise<Recoleccion> {
  try {
    const { data } = await api.post<unknown>(RECOLECCIONES_URL, payload, {
      headers: { 'Idempotency-Key': uuidV4() },
    });
    return unwrapOk<Recoleccion>(data);
  } catch (error: unknown) {
    Sentry.captureException(sanitizeSentryError(error));
    throw error;
  }
}

export async function cambiarEstadoRecoleccion(
  id: number,
  estado: RecoleccionEstado,
): Promise<Recoleccion> {
  assertValidId(id, 'recoleccion');
  try {
    const { data } = await api.post<unknown>(
      `${RECOLECCIONES_URL}${id}/estado/`,
      { estado },
    );
    return unwrapOk<Recoleccion>(data);
  } catch (error: unknown) {
    Sentry.captureException(sanitizeSentryError(error));
    throw error;
  }
}

export async function cancelarRecoleccion(id: number): Promise<Recoleccion> {
  assertValidId(id, 'recoleccion');
  try {
    const { data } = await api.post<unknown>(
      `${RECOLECCIONES_URL}${id}/cancelar/`,
    );
    return unwrapOk<Recoleccion>(data);
  } catch (error: unknown) {
    Sentry.captureException(sanitizeSentryError(error));
    throw error;
  }
}
