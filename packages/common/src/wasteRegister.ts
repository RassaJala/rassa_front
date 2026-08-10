// Waste registration domain shared by the mobile app (WasteRegisterScreen,
// src/services/waste.ts) and the web app (web/src/routes/WasteRegister.tsx).

export interface WasteDecision {
  readonly id_decision: number;
  readonly decision: string;
  readonly creado_en: string;
  readonly estado: boolean;
}

export interface WasteDecisionOption {
  readonly id_decision: number;
  readonly decision: string;
}

// Initial options (backend seed: id 1-4). Keep in sync with the backend
// migration that inserts the DecisionMerma rows.
export const WASTE_DECISION_OPTIONS: readonly WasteDecisionOption[] = [
  { id_decision: 1, decision: 'Donar' },
  { id_decision: 2, decision: 'Desechar' },
  { id_decision: 3, decision: 'Vender más barato' },
  { id_decision: 4, decision: 'Compostar' },
];

// A merma references an order that is still in flight; terminal states
// (entregado/cancelado) are not valid candidates and would only bloat the
// selector with historical orders. Shared by the mobile and web services.
const TERMINAL_ORDER_STATES: ReadonlySet<string> = new Set([
  'entregado',
  'cancelado',
]);

// True when the ORDER is in a terminal state (entregado/cancelado) and can no
// longer be linked to a merma record.
export function isTerminalOrderState(estado: string): boolean {
  return TERMINAL_ORDER_STATES.has(estado);
}

// Estado legible para el selector de pedidos (móvil y web): el backend usa
// guiones bajos ("listo_para_retirar"), la UI muestra espacios.
export function formatEstado(estado: string): string {
  return estado.replaceAll('_', ' ');
}

export interface WasteProductInfo {
  readonly id: number;
  readonly producto: string;
  readonly publicacion: number;
  readonly stock_restante: number;
}

export interface WasteDecisionInfo {
  readonly id: number;
  readonly nombre: string;
}

export interface WastePedidoInfo {
  readonly id: number;
  readonly cliente: string | null;
  readonly estado: string | null;
  readonly total: string | null;
}

export interface WasteRecord {
  readonly id_merma: number;
  readonly fk_producto_semanal: number | null;
  readonly fk_pedido: number | null;
  readonly cantidad: number;
  readonly motivo: string;
  readonly comentarios: string | null;
  readonly fk_decision: number;
  readonly creado_en: string;
  readonly estado: boolean;
  readonly producto_info: WasteProductInfo | null;
  readonly pedido_info: WastePedidoInfo | null;
  readonly decision_info: WasteDecisionInfo | null;
}

// Payload para crear un registro de merma (POST /api/mermas/).
export interface WasteRecordPayload {
  fk_producto_semanal: number;
  fk_pedido: number;
  cantidad: number;
  motivo: string;
  comentarios?: string;
  fk_decision: number;
}

// Producto publicado (ProductoSemanal) para el selector de la pantalla.
export interface PublishedProduct {
  readonly id_producto_semanal: number;
  readonly producto: string;
  readonly unidad: string;
  readonly stock: number;
  readonly precio: string;
  readonly foto: string;
}

export interface PublishedPublication {
  readonly id_publicacion: number;
  readonly agricultor: {
    readonly id_usuario: number;
    readonly nombre: string;
    readonly apellido: string;
  } | null;
  readonly fecha_publicacion: string;
  readonly semana: string;
  readonly productos: PublishedProduct[];
}

// Client-side validation shared by mobile (WasteRegisterScreen) and web
// (WasteRegister). Returns a plain error map keyed by field; an empty map
// means the payload can be submitted. Keeps business rules in one place so a
// new rule is not implemented twice with different messages.
// `pedido`/`producto` stay loosely typed on purpose: mobile passes the full
// Order/PublishedProduct objects, web passes a string id (pedido) plus the
// selected product object. Only the guards shown below touch them.
export interface WasteFormValues {
  pedido: { readonly id_pedido: number } | string | null | undefined;
  producto:
    { readonly id_producto_semanal: number } | string | null | undefined;
  cantidad: string;
  motivo: string;
  // Optional free-text note. Explicitly includes undefined: both screens keep
  // a string state that may be empty; exactOptionalPropertyTypes rejects
  // `comentarios?: string` when callers pass `comentarios` directly.
  comentarios?: string | undefined;
  // Explicitly includes undefined: callers pass `selected?.stock` which may be
  // undefined when nothing is selected; exactOptionalPropertyTypes rejects
  // `stock?: number` for that shape.
  stock?: number | undefined;
  // Numeric id (mobile uses `number | null`) or the empty string (web uses
  // `''` until an option is chosen).
  decision: number | string | null | undefined;
}

export function validateWasteRecord(
  values: WasteFormValues,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.pedido) {
    errors.pedido = 'Selecciona un pedido.';
  }
  if (!values.producto) {
    errors.producto = 'Selecciona un producto publicado.';
  }
  if (!values.decision) {
    errors.decision = 'Elige una decisión.';
  }

  const cantidadNum = Number(values.cantidad);
  if (!values.cantidad || !Number.isInteger(cantidadNum) || cantidadNum <= 0) {
    errors.cantidad = 'La cantidad debe ser un número entero mayor a 0.';
  } else if (cantidadNum > 999_999_999) {
    errors.cantidad = 'La cantidad es demasiado grande.';
  } else if (typeof values.stock === 'number' && cantidadNum > values.stock) {
    errors.cantidad = `Stock disponible: ${values.stock}.`;
  }

  if (!values.motivo.trim()) {
    errors.motivo = 'El motivo es obligatorio.';
  } else if (values.motivo.trim().length > 300) {
    errors.motivo = 'El motivo no puede superar los 300 caracteres.';
  }

  // The UI caps the input at maxLength={500}; this rule guards programmatic
  // submits (pasted/autofilled values bypass the cap).
  if (values.comentarios && values.comentarios.trim().length > 500) {
    errors.comentarios =
      'Los comentarios no pueden superar los 500 caracteres.';
  }

  return errors;
}
