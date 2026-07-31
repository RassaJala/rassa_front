import api from './api';

// --- Types -------------------------------------------------------------------

export interface MermaResumenItem {
  periodo: string;
  producto_nombre: string;
  producto_id: number;
  decision_nombre: string;
  decision_id: number;
  total_cantidad: number;
  total_mermas: number;
}

export interface MermaResumenResponse {
  agrupacion: 'mes' | 'semana';
  total_general: number;
  producto_mas_afectado: { nombre: string; total: number } | null;
  detalle: MermaResumenItem[];
}

export interface ResumenParams {
  fecha_desde?: string;
  fecha_hasta?: string;
  producto_id?: number;
  agrupar_por?: 'mes' | 'semana';
}

// --- API ---------------------------------------------------------------------

export async function fetchMermaResumen(
  params: Record<string, string> = {},
): Promise<MermaResumenResponse> {
  const query = new URLSearchParams(params);

  const qs = query.toString();
  const url = qs ? `/mermas/resumen/?${qs}` : '/mermas/resumen/';

  const { data } = await api.get<{ ok: boolean; data: MermaResumenResponse }>(
    url,
  );
  return data.data;
}
