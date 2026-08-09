import { parseApiList } from '@/common/apiResponse';

import api from './api';

export interface Corte {
  id_corte: number;
  fecha: string;
  monto_teorico: string;
  monto_real: string;
  diferencia: string;
  estado: 'abierto' | 'cerrado' | 'cuadrado';
  creado_en: string;
}

export interface TeoricoResponse {
  fecha: string;
  monto_teorico: string;
}

export async function getCortes(): Promise<Corte[]> {
  const { data } = await api.get<{ results?: Corte[] }>('/cortes/');
  return parseApiList<Corte>(data);
}

export async function getTeorico(fecha: string): Promise<TeoricoResponse> {
  const { data } = await api.get<TeoricoResponse>('/cortes/teorico/', {
    params: { fecha },
  });
  return data;
}

export async function crearCorte(
  montoReal: string,
  fecha: string,
): Promise<Corte> {
  const { data } = await api.post<Corte>('/cortes/', {
    monto_real: montoReal,
    fecha,
  });
  return data;
}
