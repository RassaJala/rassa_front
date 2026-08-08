// Waste service layer for the web app: registration (mirrors
// src/services/waste.ts mobile) and the resumen used by the admin dashboard.
import { buildResumenUrl, unwrapWasteEnvelope } from '@/common/waste';
import type {
  MermaResumenResponse,
  ResumenParams,
  WasteEnvelope,
} from '@/common/waste';
import {
  TERMINAL_ORDER_STATES,
  type PublishedPublication,
  type WasteRecord,
  type WasteRecordPayload,
} from '@/common/wasteRegister';
import type { Order } from '@root/types';

import api from './api';

export async function fetchWastePublications(): Promise<
  PublishedPublication[]
> {
  const { data } = await api.get<{ data: PublishedPublication[] }>(
    '/publicaciones/current/',
  );
  return data.data;
}

export async function fetchWasteOrders(): Promise<Order[]> {
  const { data } = await api.get<{ results?: Order[] }>('/pedidos/');
  // A merma references an order that is still in flight; terminal states
  // (entregado/cancelado) are not valid candidates and would only bloat the
  // selector with historical orders.
  return (data.results ?? []).filter(
    (order) => !TERMINAL_ORDER_STATES.has(order.estado_actual),
  );
}

export async function createWasteRecord(
  payload: WasteRecordPayload,
): Promise<WasteRecord> {
  const { data } = await api.post<{ data: WasteRecord }>('/mermas/', payload);
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
