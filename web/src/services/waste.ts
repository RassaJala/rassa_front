// Waste service layer for the web app: registration (mirrors
// src/services/waste.ts mobile) and the resumen used by the admin dashboard.
import { createIdempotencyKey } from '@/common/payments';
import { buildResumenUrl, unwrapWasteEnvelope } from '@/common/waste';
import type {
  MermaResumenResponse,
  ResumenParams,
  WasteEnvelope,
} from '@/common/waste';
import {
  isTerminalOrderState,
  type PublishedPublication,
  type WasteRecord,
  type WasteRecordPayload,
} from '@/common/wasteRegister';
import type { Order } from '@root/types';

import { fetchAllPages, type FetchAllPagesPage } from '../utils/pagination';
import api from './api';

export async function fetchWastePublications(): Promise<
  PublishedPublication[]
> {
  const { data } = await api.get<{ data: PublishedPublication[] }>(
    '/publicaciones/current/',
  );
  return data.data;
}

// The /pedidos/ endpoint returns the raw DRF shape ({ results, next }) rather
// than the { ok, data } envelope; fetchAllPages walks every page and unwrap
// maps the raw body directly. The unwrap is deliberately tolerant, mirroring
// the mobile toPage (src/services/pagination.ts): raw pages, bare arrays and
// { ok, data } envelopes all resolve; an invalid body degrades to an empty
// page instead of crashing the whole walk.
function unwrapOrdersPage(body: unknown): FetchAllPagesPage<Order> {
  const payload =
    body !== null &&
    typeof body === 'object' &&
    'data' in (body as Record<string, unknown>)
      ? (body as { data: unknown }).data
      : body;
  if (Array.isArray(payload)) {
    return { results: payload as Order[], next: null };
  }
  if (payload === null || typeof payload !== 'object') {
    // Un cuerpo inválido no corta el recorrido: página vacía, sin `results`.
    return { next: null };
  }
  const record = payload as { results?: unknown; next?: unknown };
  return {
    ...(Array.isArray(record.results)
      ? { results: record.results as Order[] }
      : {}),
    next: typeof record.next === 'string' ? record.next : null,
  };
}

export async function fetchWasteOrders(): Promise<Order[]> {
  const { data } = await fetchAllPages<Order>({
    url: '/pedidos/',
    fetchPage: async (url, params, signal) => {
      // exactOptionalPropertyTypes: only pass the keys that are defined, or
      // axios rejects the config (params/signal may be undefined).
      const config = {
        ...(params !== undefined ? { params } : {}),
        ...(signal !== undefined ? { signal } : {}),
      };
      return (await api.get<unknown>(url, config)).data;
    },
    unwrap: unwrapOrdersPage,
  });
  return data.filter((order) => !isTerminalOrderState(order.estado_actual));
}

export async function createWasteRecord(
  payload: WasteRecordPayload,
): Promise<WasteRecord> {
  // Idempotency-Key: a 401 re-dispatch reuses the same config → same key →
  // the backend can dedupe if the original POST was already persisted.
  const { data } = await api.post<{ data: WasteRecord }>('/mermas/', payload, {
    headers: { 'Idempotency-Key': createIdempotencyKey() },
  });
  return data.data;
}

export async function fetchMermaResumen(
  params: ResumenParams = {},
): Promise<MermaResumenResponse> {
  const { data } = await api.get<WasteEnvelope<MermaResumenResponse>>(
    buildResumenUrl(params),
  );
  return unwrapWasteEnvelope(data);
}
