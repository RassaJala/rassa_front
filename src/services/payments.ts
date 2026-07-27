import api from '@/services/api';
import type { Payment, PaymentPayload, PaymentType } from '@/types';

export interface PaymentsListResponse {
  results?: Payment[];
}

export async function getPaymentTypes(): Promise<PaymentType[]> {
  const response = await api.get<PaymentType[]>('/tipos-pago/');
  return response.data;
}

export async function registerPayment(
  payload: PaymentPayload,
): Promise<Payment> {
  const response = await api.post<Payment>('/pagos/', payload);
  return response.data;
}

export async function getPayment(paymentId: number): Promise<Payment> {
  const response = await api.get<Payment>(`/pagos/${paymentId}/`);
  return response.data;
}

export async function getPaymentsByOrder(orderId: number): Promise<Payment[]> {
  const response = await api.get<PaymentsListResponse>(
    `/pagos/?pedido=${orderId}`,
  );
  return response.data.results ?? [];
}
