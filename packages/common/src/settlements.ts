// Shared settlements domain: types, constants, envelope unwrap and URL builder.
// Used by the mobile app (src/services/settlements.ts, SettlementListScreen /
// SettlementDetailScreen) and the web admin (web/src/routes/AdminSettlements*).
// Mirrors @/common/waste conventions.

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

export const COMISION_RASSA = 0.1;

export const ESTADO_PENDIENTE: SettlementEstado = 'pendiente';
export const ESTADO_PAGADA: SettlementEstado = 'pagada';

// Cap for following `next` pagination links (weekly settlements per farmer).
export const SETTLEMENTS_MAX_PAGES = 20;

// --- Amount resolution -------------------------------------------------------

// Resolved amounts shared by every settlements surface (list + detail). The
// server monto_liquidar is authoritative — it reflects backend rounding — so it
// is used as-is whenever present and valid, including a legitimate 0. Only when
// it is missing/invalid does the resolver derive monto_ventas − comision and
// flag isEstimated, so the UI can mark the numbers as estimates instead of
// rendering $NaN or inventing amounts (CONV-1: list and detail must show
// identical numbers, so both surfaces resolve through this single function).
export interface SettlementAmounts {
  montoVentas: number;
  comision: number;
  montoLiquidar: number;
  isEstimated: boolean;
}

// Parses a Decimal string/number into a finite number, distinguishing a
// legitimate 0 from missing/invalid values (null, undefined, '', 'abc', NaN)
// which return null so callers can decide whether to fall back.
function parseAmount(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n =
    typeof value === 'number' ? value : Number.parseFloat(String(value));
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

// Single source of truth for the settlement money amounts. The server payload
// wins whenever its values are valid; a missing/invalid comision is derived as
// COMISION_RASSA × monto_ventas (the backend does not send tasa_comision), and
// a missing/invalid monto_liquidar is derived as monto_ventas − comision. Any
// derivation flips isEstimated so callers can surface "estimated" in the UI.
export function resolveSettlementAmounts(payload: {
  monto_ventas: string | number | null | undefined;
  comision: string | number | null | undefined;
  monto_liquidar: string | number | null | undefined;
}): SettlementAmounts {
  const ventas = parseAmount(payload.monto_ventas);
  const serverComision = parseAmount(payload.comision);
  const serverLiquidar = parseAmount(payload.monto_liquidar);

  const montoVentas = ventas ?? 0;
  const comision = serverComision ?? montoVentas * COMISION_RASSA;
  const montoLiquidar =
    serverLiquidar !== null ? serverLiquidar : montoVentas - comision;
  const isEstimated =
    ventas === null || serverComision === null || serverLiquidar === null;

  return { montoVentas, comision, montoLiquidar, isEstimated };
}

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
