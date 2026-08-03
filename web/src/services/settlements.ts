import {
  buildLiquidacionesUrl,
  SETTLEMENTS_MAX_PAGES,
  unwrapLiquidacionesEnvelope,
} from '@/common/settlements';
import type {
  MarcarPagadaParams,
  Settlement,
  SettlementDetail,
  SettlementEnvelope,
  SettlementListParams,
  SettlementListResponse,
} from '@/common/settlements';
import type { User, UserRole } from '@/components/admin-users/types';

import api from './api';

interface RawUserPage {
  results: Record<string, unknown>[];
  next: string | null;
}

// The backend user payload uses id_usuario; the web User type uses id.
function mapFarmer(raw: Record<string, unknown>): User {
  return {
    id: raw.id_usuario as number,
    nombre: raw.nombre as string,
    apellido_paterno: (raw.apellido_paterno as string) ?? '',
    apellido_materno: (raw.apellido_materno as string | null) ?? null,
    email: raw.email as string,
    role: raw.role as UserRole,
    estado: raw.estado as boolean,
    creado_en: raw.creado_en as string,
  };
}

// Follow the DRF pagination `next` links up to a hard cap. All pages share the
// {ok, data} envelope; each page is unwrapped individually so a malformed page
// throws instead of silently truncating the list.
async function fetchAllPages<T>(
  firstUrl: string,
  unwrapPage: (envelope: SettlementEnvelope<unknown>) => {
    results: T[];
    next: string | null;
  },
): Promise<T[]> {
  const all: T[] = [];
  let url: string | null = firstUrl;
  let depth = 0;

  while (url !== null && depth < SETTLEMENTS_MAX_PAGES) {
    const { data } = await api.get<SettlementEnvelope<unknown>>(url);
    const page = unwrapPage(data);
    all.push(...page.results);
    url = page.next;
    depth += 1;
  }

  return all;
}

function unwrapSettlementPage(envelope: SettlementEnvelope<unknown>): {
  results: Settlement[];
  next: string | null;
} {
  const page = unwrapLiquidacionesEnvelope<SettlementListResponse>(envelope);
  return { results: page.results, next: page.next };
}

function unwrapUserPage(envelope: SettlementEnvelope<unknown>): {
  results: User[];
  next: string | null;
} {
  const page = unwrapLiquidacionesEnvelope<RawUserPage>(envelope);
  return { results: page.results.map(mapFarmer), next: page.next };
}

// Server-filtered multi-page fetch-all: GET /liquidaciones/ with optional
// agricultor / estado / periodo_inicio / periodo_fin params (R2).
export async function fetchSettlements(
  params: SettlementListParams = {},
): Promise<Settlement[]> {
  return fetchAllPages(buildLiquidacionesUrl(params), unwrapSettlementPage);
}

export async function fetchSettlement(id: number): Promise<SettlementDetail> {
  const { data } = await api.get<SettlementEnvelope<SettlementDetail>>(
    `/liquidaciones/${id}/`,
  );
  return unwrapLiquidacionesEnvelope(data);
}

// POST /liquidaciones/{id}/marcar-pagada/ with {tipo_pago, referencia?}.
// The endpoint is idempotent: an already-paid settlement returns 200 with a
// message. Business errors arrive as ok:true on HTTP 400/409 — axios rejects
// those, so callers branch on HTTP status, never on envelope.ok (R4/R5).
export async function marcarSettlementPagada(
  id: number,
  params: MarcarPagadaParams,
): Promise<{ detail: SettlementDetail; message: string }> {
  const { data } = await api.post<SettlementEnvelope<SettlementDetail>>(
    `/liquidaciones/${id}/marcar-pagada/`,
    params,
  );
  return {
    detail: unwrapLiquidacionesEnvelope(data),
    message: data.message ?? '',
  };
}

// Active agricultores for the filter dropdown (R2).
export async function fetchFarmers(): Promise<User[]> {
  return fetchAllPages(
    '/admin/usuarios/?rol=Agricultor&estado=true',
    unwrapUserPage,
  );
}
