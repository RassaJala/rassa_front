import axios from 'axios';
import { extractApiError, isSafeDetail } from '~/utils/apiErrors';
import api from '~/services/api';
import type { ApiResponse } from '~/types';

export interface CreateOrderItem {
  id_producto_semanal: number;
  cantidad: number;
}

export interface CreateOrderPayload {
  items: CreateOrderItem[];
}

export interface PedidoDetalle {
  id_detalle: number;
  nombre_producto: string;
  precio_unitario: string;
  cantidad: number;
  importe: string;
}

export interface Pedido {
  id_pedido: number;
  cliente_nombre: string;
  // POST /pedidos/ responde con `estado`; el detalle GET usa `estado_actual`.
  estado: string;
  subtotal: string;
  iva: string;
  total: string;
  detalles: PedidoDetalle[];
  creado_en: string;
}

export const AMBIGUOUS_MSG =
  'No pudimos confirmar si tu pedido se creó. Revisá tus pedidos antes de intentar de nuevo.';

const ORDER_ERROR_DEFAULT = 'Error del servidor. Intenta de nuevo.';

export async function createOrder(
  payload: CreateOrderPayload,
): Promise<Pedido> {
  // axios-retry reintenta errores de red en POST no idempotentes — se desactiva
  // por request para no duplicar pedidos; los interceptores de `api` se mantienen.
  const { data } = await api.post<ApiResponse<Pedido>>('/pedidos/', payload, {
    'axios-retry': { retries: 0 },
  });
  return data.data; // envelope { data: Pedido } — POST va envuelto, GET va crudo
}

// JD-001: DRF non-field errors llegan como array de strings:
// ["Stock insuficiente para 'Tomate'. Disponible: 2, solicitado: 5."]
export function extractOrderError(error: unknown): string {
  const candidate =
    error instanceof Error && error.cause !== undefined ? error.cause : error;
  const data = (candidate as { response?: { data?: unknown } } | null)?.response
    ?.data;

  if (Array.isArray(data)) {
    const first = data[0];
    if (
      first !== undefined &&
      String(first).trim() !== '' &&
      isSafeDetail(String(first))
    ) {
      return String(first);
    }
    return ORDER_ERROR_DEFAULT;
  }

  return extractApiError(error, ['detail', 'message'], ORDER_ERROR_DEFAULT);
}

// JD-001-B: solo fallas reales de transporte axios (red/timeout, sin response)
// son ambiguas; un Error pelado (ej. cola 401 'Sesión expirada') nunca llegó
// al servidor y no debe clasificarse como "pudo haberse creado".
export function isAmbiguousOrderError(error: unknown): boolean {
  const candidate =
    error instanceof Error && error.cause !== undefined ? error.cause : error;
  return axios.isAxiosError(candidate) && candidate.response === undefined;
}
