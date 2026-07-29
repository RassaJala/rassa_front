import type { Payment, PaymentPayload, TipoPago } from '@/types';

import api from './api';

export async function fetchTiposPago(): Promise<TipoPago[]> {
  const { data } = await api.get<TipoPago[]>('/tipos-pago/');
  return data;
}

export async function createPayment(payload: PaymentPayload): Promise<Payment> {
  const { data } = await api.post<Payment>('/pagos/', payload);
  return data;
}

export async function fetchPayment(id: number): Promise<Payment> {
  const { data } = await api.get<Payment>(`/pagos/${id}/`);
  return data;
}
