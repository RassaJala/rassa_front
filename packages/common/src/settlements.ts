// Shared settlements domain: types, constants, envelope unwrap and URL builder.
// Used by the mobile app (src/services/settlements.ts, SettlementListScreen /
// SettlementDetailScreen). Mirrors @/common/waste conventions.

import { buildListUrl, unwrapEnvelope } from './http';

// --- Types -------------------------------------------------------------------

export type SettlementEstado = 'pendiente' | 'pagada';

export interface Settlement {
  id_liquidacion: number;
  agricultor_id: number;
  agricultor_nombre: string;
  periodo_inicio: string;
  periodo_fin: string;
  monto_ventas: string;
  comision: string;
  monto_liquidar: string;
  estado: SettlementEstado;
  creado_en: string;
}

export interface SettlementVenta {
  id_pedido: number;
  cliente_nombre: string;
  total: string;
  creado_en: string;
  pago_folio: string | null;
}

export interface SettlementPago {
  id_pago: number;
  folio: string;
  tipo_pago_nombre: string;
  monto: string;
  referencia: string;
  fecha_pago: string;
}

export interface SettlementDetail extends Settlement {
  ventas: SettlementVenta[];
  pago_liquidacion: SettlementPago | null;
}

export interface MarcarPagadaParams {
  readonly tipo_pago: number;
  readonly referencia?: string;
}

export interface SettlementListParams {
  agricultor?: number;
  estado?: SettlementEstado;
  periodo_inicio?: string;
  periodo_fin?: string;
}

export interface SettlementListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Settlement[];
}

// --- Constants ---------------------------------------------------------------

export const ESTADO_PENDIENTE: SettlementEstado = 'pendiente';
export const ESTADO_PAGADA: SettlementEstado = 'pagada';

// Cap for following `next` pagination links (weekly settlements per farmer).
export const SETTLEMENTS_MAX_PAGES = 20;

// --- Envelope ----------------------------------------------------------------

export interface SettlementEnvelope<T> {
  ok: boolean;
  data?: T;
  message?: string;
}

// Unwrap the {ok, data} envelope returned by the liquidaciones endpoints.
// Throws when ok === false or data is missing (including null — R4-4). NOTE:
// business errors arrive as ok:true with a non-2xx HTTP status — axios
// rejection (not this unwrap) is what surfaces those; callers must branch on
// HTTP status, never on envelope.ok.
export function unwrapLiquidacionesEnvelope<T>(envelope: {
  ok: boolean;
  data?: unknown;
  message?: string;
}): T {
  return unwrapEnvelope<T>(envelope);
}

// --- URL builder -------------------------------------------------------------

// Build the /liquidaciones/ URL with the query params the backend expects:
// agricultor (int), estado, periodo_inicio (YYYY-MM-DD gte), periodo_fin (lte).
export function buildLiquidacionesUrl(
  params: SettlementListParams = {},
): string {
  return buildListUrl('/liquidaciones/', {
    agricultor: params.agricultor,
    estado: params.estado,
    periodo_inicio: params.periodo_inicio,
    periodo_fin: params.periodo_fin,
  });
}
