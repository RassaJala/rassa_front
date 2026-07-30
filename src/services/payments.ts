import type { PaymentDetail, TipoPago } from '@/types';

import api from './api';

export async function fetchTiposPago(): Promise<TipoPago[]> {
  const res = await api.get<TipoPago[]>('/tipos-pago/');
  return res.data;
}

export interface CreatePagoPayload {
  readonly pedido: number;
  readonly tipo_pago: number;
  readonly monto: string;
  readonly referencia?: string;
}

export async function createPago(
  payload: CreatePagoPayload,
): Promise<PaymentDetail> {
  const res = await api.post<PaymentDetail>('/pagos/', payload);
  return res.data;
}

export async function fetchPago(id: number): Promise<PaymentDetail> {
  const res = await api.get<PaymentDetail>(`/pagos/${id}/`);
  return res.data;
}
