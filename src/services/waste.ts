import type { ApiResponse } from '@/types';
import type {
  PublishedPublication,
  WasteDecision,
  WasteRecord,
  WasteRecordPayload,
} from '@/types/waste';

import api from './api';

const DECISIONES_URL = '/decisiones-merma/';
const MERMAS_URL = '/mermas/';

export async function fetchWasteDecisions(): Promise<WasteDecision[]> {
  const { data } =
    await api.get<ApiResponse<{ results: WasteDecision[] }>>(DECISIONES_URL);
  return data.data.results;
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

export async function fetchCurrentPublications(): Promise<
  PublishedPublication[]
> {
  const { data } = await api.get<ApiResponse<PublishedPublication[]>>(
    '/publicaciones/current/',
  );
  return data.data;
}
