import { buildResumenUrl, unwrapWasteEnvelope } from '@/common/waste';
import type {
  MermaResumenResponse,
  ResumenParams,
  WasteEnvelope,
} from '@/common/waste';
import type { ApiResponse, Order } from '@/types';
import type {
  PublishedPublication,
  WasteDecision,
  WasteRecord,
  WasteRecordPayload,
} from '@/types/waste';

import api from './api';

const DECISIONES_URL = '/decisiones-merma/';
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

export async function fetchWasteDecisions(): Promise<WasteDecision[]> {
  const { data } =
    await api.get<ApiResponse<{ results: WasteDecision[] }>>(DECISIONES_URL);
  // The backend may return a paginated {results} envelope or a bare array;
  // normalize both so a shape change does not crash the selector.
  const payload = data.data as
    { results?: WasteDecision[] } | WasteDecision[] | undefined;
  if (Array.isArray(payload)) return payload;
  return payload?.results ?? [];
}

export async function createWasteRecord(
  payload: WasteRecordPayload,
): Promise<WasteRecord> {
  const { data } = await api.post<ApiResponse<WasteRecord>>(
    MERMAS_URL,
    payload,
  );
  return data.data;
}

export async function fetchWasteRecords(): Promise<WasteRecord[]> {
  const { data } =
    await api.get<ApiResponse<{ results: WasteRecord[] }>>(MERMAS_URL);
  return data.data.results;
}

export async function fetchWasteRecord(id: number): Promise<WasteRecord> {
  const { data } = await api.get<ApiResponse<WasteRecord>>(
    `${MERMAS_URL}${id}/`,
  );
  return data.data;
}

export async function fetchWasteOrders(): Promise<Order[]> {
  const { data } = await api.get<{ results?: Order[] }>(PEDIDOS_URL);
  return data.results ?? [];
}

export async function fetchCurrentPublications(): Promise<
  PublishedPublication[]
> {
  const { data } = await api.get<ApiResponse<PublishedPublication[]>>(
    '/publicaciones/current/',
  );
  return data.data;
}
