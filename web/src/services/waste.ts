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

import { fetchAllPages } from '../utils/pagination';
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
// maps the raw body directly.
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
    unwrap: (body) => body as { results?: Order[]; next?: string | null },
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
