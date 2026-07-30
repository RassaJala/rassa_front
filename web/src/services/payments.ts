import api from './api';

export interface TipoPago {
  readonly id_tipo_pago: number;
  readonly nombre: string;
}

export interface PaymentProduct {
  readonly nombre: string;
  readonly precio: string;
  readonly cantidad: number;
}

export interface PaymentDetail {
  readonly id_pago: number;
  readonly folio: string;
  readonly pedido: number | null;
  readonly tipo_pago: number;
  readonly tipo_pago_nombre: string;
  readonly cliente_nombre: string | null;
  readonly cliente_id: number | null;
  readonly monto: string;
  readonly referencia: string;
  readonly total_pedido: string | null;
  readonly productos: PaymentProduct[];
  readonly fecha_pago: string;
}

export interface CreatePagoPayload {
  readonly pedido: number;
  readonly tipo_pago: number;
  readonly monto: string;
  readonly referencia?: string;
}

export async function fetchTiposPago(): Promise<TipoPago[]> {
  const res = await api.get<TipoPago[]>('/tipos-pago/');
  return res.data;
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
