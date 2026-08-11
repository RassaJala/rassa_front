import { createIdempotencyKey } from '@/common/payments';
import { buildResumenUrl, unwrapWasteEnvelope } from '@/common/waste';
import type {
  MermaResumenResponse,
  ResumenParams,
  WasteEnvelope,
} from '@/common/waste';
import { isTerminalOrderState } from '@/common/wasteRegister';
import type { ApiResponse, Order } from '@/types';
import type {
  PublishedPublication,
  WasteRecord,
  WasteRecordPayload,
} from '@/types/waste';

import api from './api';
import { fetchAllPages } from './pagination';

const MERMAS_URL = '/mermas/';
const PEDIDOS_URL = '/pedidos/';

export async function fetchMermaResumen(
  params: ResumenParams = {},
): Promise<MermaResumenResponse> {
  const { data } = await api.get<WasteEnvelope<MermaResumenResponse>>(
    buildResumenUrl(params),
  );
  return unwrapWasteEnvelope(data);
}

export async function createWasteRecord(
  payload: WasteRecordPayload,
): Promise<WasteRecord> {
  // Idempotency-Key: a 401 re-dispatch reuses the same config → same key →
  // the backend can dedupe if the original POST was already persisted.
  const { data } = await api.post<ApiResponse<WasteRecord>>(
    MERMAS_URL,
    payload,
    { headers: { 'Idempotency-Key': createIdempotencyKey() } },
  );
  return data.data;
}

export async function fetchWasteOrders(): Promise<Order[]> {
  const { data } = await fetchAllPages<Order>(PEDIDOS_URL, {
    source: 'waste-orders',
    keyOf: (order) => order.id_pedido,
  });
  return data.filter((order) => !isTerminalOrderState(order.estado_actual));
}

export async function fetchCurrentPublications(): Promise<
  PublishedPublication[]
> {
  const { data } = await api.get<ApiResponse<PublishedPublication[]>>(
    '/publicaciones/current/',
  );
  return data.data;
}
