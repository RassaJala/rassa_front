import type { MermaResumenResponse, ResumenParams } from '@/common/waste';

import api from './api';

// Unwrap the {ok, data} envelope. Throws when ok === false.
function unwrap<T>(response: { data: unknown }): T {
  const body = response.data as { ok?: boolean; data?: T; message?: string };
  if (body.ok === false || body.data === undefined) {
    throw new Error(body.message ?? 'Error en la respuesta del servidor');
  }
  return body.data;
}

export async function fetchMermaResumen(
  params: ResumenParams = {},
): Promise<MermaResumenResponse> {
  const query = new URLSearchParams();
  if (params.fecha_desde) query.set('fecha_desde', params.fecha_desde);
  if (params.fecha_hasta) query.set('fecha_hasta', params.fecha_hasta);
  if (params.producto_id !== undefined) {
    query.set('producto_id', String(params.producto_id));
  }
  if (params.agrupar_por) query.set('agrupar_por', params.agrupar_por);

  const qs = query.toString();
  const url = qs ? `/mermas/resumen/?${qs}` : '/mermas/resumen/';

  const { data } = await api.get<{ ok: boolean; data: MermaResumenResponse }>(
    url,
  );
  return unwrap<MermaResumenResponse>({ data });
}
