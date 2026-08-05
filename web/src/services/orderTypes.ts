// ── Order domain types (shared across the checkout flow) ────────────────
// S-4: POST /pedidos/ (creation) returns a WRAPPED envelope { data: Pedido }
// with `estado`; GET /pedidos/:id/ (detail) returns the RAW OrderDetail body
// with `estado_actual` + `historial`. Both live here so the two call sites
// cannot drift again — they already diverged once (`estado` vs `estado_actual`).

export interface PedidoDetalle {
  id_detalle: number;
  nombre_producto: string;
  precio_unitario: string;
  cantidad: number;
  importe: string;
}

/** POST /pedidos/ response type (wrapped in ApiResponse<Pedido>). */
export interface Pedido {
  id_pedido: number;
  cliente_nombre: string;
  // POST responde con `estado`; el detalle GET usa `estado_actual` — no conflatar.
  estado: string;
  subtotal: string;
  iva: string;
  total: string;
  detalles: PedidoDetalle[];
  creado_en: string;
}

export interface MermaProductoInfo {
  id: number | null;
  producto: string | null;
  publicacion: number | null;
  stock_restante: number | null;
}

export interface MermaDecisionInfo {
  id: number | null;
  nombre: string | null;
}

export interface MermaPedidoInfo {
  id: number | null;
  cliente: string | null;
  estado: string | null;
  total: string | null;
}

/** Backend GET /mermas/?fk_pedido= shape (MermaListSerializer, nested fields). */
export interface MermaDePedido {
  id_merma: number;
  fk_producto_semanal: number | null;
  fk_pedido: number | null;
  cantidad: number;
  motivo: string;
  comentarios: string | null;
  fk_decision: number | null;
  creado_en: string; // ISO datetime
  estado: boolean;
  producto_info: MermaProductoInfo | null;
  decision_info: MermaDecisionInfo | null;
  pedido_info: MermaPedidoInfo | null;
}

/** GET /pedidos/:id/ response type (raw body). */
export interface OrderDetail {
  id_pedido: number;
  total: string;
  subtotal: string;
  iva: string;
  estado_actual: string;
  creado_en: string;
  fecha_expiracion: string | null;
  /** Backend flag: order is pending and its expiry date has passed. */
  expirado?: boolean;
  detalles: PedidoDetalle[];
  historial: OrderHistoryEntry[];
  /**
   * Mermas are NOT part of the order detail — they load separately via
   * GET /mermas/?fk_pedido={id}. Kept only as an optional legacy field.
   */
  mermas?: MermaDePedido[];
}

export interface OrderHistoryEntry {
  id_historial: number;
  estado_anterior: string | null;
  estado_nuevo: string;
  cambiado_por_nombre: string | null;
  creado_en: string;
}
