import api from './api';

// --- Types ---

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

// --- API functions ---

export async function fetchMermaResumen(
  params: ResumenParams = {},
): Promise<MermaResumenResponse> {
  const query = new URLSearchParams();
  if (params.fecha_desde) query.set('fecha_desde', params.fecha_desde);
  if (params.fecha_hasta) query.set('fecha_hasta', params.fecha_hasta);
  if (params.producto_id) query.set('producto_id', String(params.producto_id));
  if (params.agrupar_por) query.set('agrupar_por', params.agrupar_por);

  const qs = query.toString();
  const url = qs ? `/mermas/resumen/?${qs}` : '/mermas/resumen/';

  const { data } = await api.get<{ ok: boolean; data: MermaResumenResponse }>(
    url,
  );
  return data.data;
}

export interface DecisionMerma {
  id_decision: number;
  decision: string;
  estado: boolean;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function fetchDecisionesMerma(): Promise<DecisionMerma[]> {
  const { data } = await api.get<{
    ok: boolean;
    data: PaginatedResponse<DecisionMerma>;
  }>('/decisiones-merma/');
  return data.data.results;
}
