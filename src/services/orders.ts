import type { ApiResponse } from "@/types";

import api from "./api";

// ── Types ────────────────────────────────────────────────

export interface CreateOrderItem {
  id_producto_semanal: number;
  cantidad: number;
}

export interface CreateOrderPayload {
  items: CreateOrderItem[];
}

export interface PedidoDetalle {
  id_detalle: number;
  fk_producto_semanal: number;
  nombre_producto: string;
  precio_unitario: string;
  cantidad: number;
  importe: string;
}

export interface Pedido {
  id_pedido: number;
  cliente_nombre: string;
  estado: string;
  subtotal: string;
  iva: string;
  total: string;
  detalles: PedidoDetalle[];
  creado_en: string;
}

// ── API calls ────────────────────────────────────────────

export async function createOrder(
  payload: CreateOrderPayload,
): Promise<Pedido> {
  // Backend envuelve la respuesta: { ok, message, data: Pedido }
  const { data } = await api.post<ApiResponse<Pedido>>("/pedidos/", payload);
  return data.data;
}
