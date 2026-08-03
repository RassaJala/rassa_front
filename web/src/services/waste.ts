import { buildResumenUrl, unwrapWasteEnvelope } from '@/common/waste';
import type {
  MermaResumenResponse,
  ResumenParams,
  WasteEnvelope,
} from '@/common/waste';

import api from './api';

export async function fetchMermaResumen(
  params: ResumenParams = {},
): Promise<MermaResumenResponse> {
  const { data } = await api.get<WasteEnvelope<MermaResumenResponse>>(
    buildResumenUrl(params),
  );
  return unwrapWasteEnvelope(data);
}
