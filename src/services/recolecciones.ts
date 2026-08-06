import * as Sentry from '@sentry/react-native';
import { isAxiosError } from 'axios';

import { TRANSICIONES } from '@/features/recolecciones/constants';
import type {
  Recoleccion,
  RecoleccionEstado,
  RecoleccionPayload,
} from '@/types/recolecciones';
import { assertValidId } from '@/utils/ids';
import { uuidV4 } from '@/utils/uuid';

import api from './api';
import { fetchAllPages, unwrapOk } from './pagination';
import type { PaginatedFetchResult } from './pagination';
import { sanitizeSentryError } from './sentry';

const RECOLECCIONES_URL = '/recolecciones/';

function isServerError(error: unknown): boolean {
  return (
    !isAxiosError(error) ||
    error.response?.status === undefined ||
    error.response.status >= 500
  );
}

function addRecoleccionBreadcrumb(
  action: string,
  data: Record<string, unknown>,
): void {
  Sentry.addBreadcrumb({
    category: 'recoleccion',
    message: action,
    data,
    level: 'info',
  });
}

async function withRecoleccionErrorHandling<T>(
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    if (isServerError(error)) {
      Sentry.captureException(sanitizeSentryError(error));
    }
    throw error;
  }
}

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
  if (filters.fkAgricultor != null)
    params.set('fk_agricultor', String(filters.fkAgricultor));
  if (filters.fecha) params.set('fecha', filters.fecha);
  if (filters.fechaDesde) params.set('fecha_desde', filters.fechaDesde);
  if (filters.fechaHasta) params.set('fecha_hasta', filters.fechaHasta);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchRecolecciones(
  filters: RecoleccionFilters = {},
  signal?: AbortSignal,
): Promise<RecoleccionesResult> {
  const baseOptions = {
    keyOf: (r: Recoleccion) => r.id_recoleccion,
    source: 'recolecciones',
  } as const;
  return fetchAllPages<Recoleccion>(
    `${RECOLECCIONES_URL}${buildQuery(filters)}`,
    signal !== undefined ? { ...baseOptions, signal } : baseOptions,
  );
}

export async function createRecoleccion(
  payload: RecoleccionPayload,
): Promise<Recoleccion> {
  addRecoleccionBreadcrumb('createRecoleccion', {
    fk_agricultor: payload.fk_agricultor,
    fecha_recoleccion: payload.fecha_recoleccion,
  });
  return withRecoleccionErrorHandling(async () => {
    const { data } = await api.post<unknown>(RECOLECCIONES_URL, payload, {
      headers: { 'Idempotency-Key': uuidV4() },
    });
    return unwrapOk<Recoleccion>(data);
  });
}

export async function cambiarEstadoRecoleccion(
  id: number,
  estado: RecoleccionEstado,
  estadoActual: RecoleccionEstado,
): Promise<Recoleccion> {
  assertValidId(id, 'recoleccion');
  const permitidos = TRANSICIONES[estadoActual];
  if (!permitidos.includes(estado)) {
    throw new Error(`Transición inválida: ${estadoActual} → ${estado}`);
  }
  addRecoleccionBreadcrumb('cambiarEstadoRecoleccion', {
    id_recoleccion: id,
    estado,
    estado_actual: estadoActual,
  });
  return withRecoleccionErrorHandling(async () => {
    const { data } = await api.post<unknown>(
      `${RECOLECCIONES_URL}${id}/estado/`,
      { estado },
    );
    return unwrapOk<Recoleccion>(data);
  });
}

export async function cancelarRecoleccion(id: number): Promise<Recoleccion> {
  assertValidId(id, 'recoleccion');
  addRecoleccionBreadcrumb('cancelarRecoleccion', {
    id_recoleccion: id,
  });
  return withRecoleccionErrorHandling(async () => {
    const { data } = await api.post<unknown>(
      `${RECOLECCIONES_URL}${id}/cancelar/`,
    );
    return unwrapOk<Recoleccion>(data);
  });
}
