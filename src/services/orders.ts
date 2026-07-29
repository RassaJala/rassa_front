import type { ApiResponse } from '@/types';

import api from './api';

// ── Backend response types ─────────────────────────────────

export interface PedidoItemInput {
  readonly id_producto_semanal: number;
  readonly cantidad: number;
}

export interface DetallePedidoOutput {
  readonly id_detalle: number;
  readonly fk_producto_semanal: number;
  readonly nombre_producto: string;
  readonly precio_unitario: string;
  readonly cantidad: number;
  readonly importe: string;
}

export interface PedidoOutput {
  readonly id_pedido: number;
  readonly cliente_nombre: string | null;
  readonly estado: string;
  readonly subtotal: string;
  readonly iva: string;
  readonly total: string;
  readonly detalles: readonly DetallePedidoOutput[];
  readonly creado_en: string;
}

// ── API functions ──────────────────────────────────────────

export async function createPedido(
  items: readonly PedidoItemInput[],
): Promise<ApiResponse<PedidoOutput>> {
  const { data } = await api.post<ApiResponse<PedidoOutput>>('/pedidos/', {
    items,
  });
  return data;
}
