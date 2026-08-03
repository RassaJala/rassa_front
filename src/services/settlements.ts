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
import type { AdminUser } from '@/types/userManagement';

import api from './api';

interface AdminUserPage {
  results: AdminUser[];
  next: string | null;
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

function unwrapAdminUserPage(envelope: SettlementEnvelope<unknown>): {
  results: AdminUser[];
  next: string | null;
} {
  const page = unwrapLiquidacionesEnvelope<AdminUserPage>(envelope);
  return { results: page.results, next: page.next };
}

// Server-filtered multi-page fetch-all: GET /liquidaciones/ with optional
// agricultor / estado / periodo_inicio / periodo_fin params (S2).
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
// those, so callers branch on HTTP status, never on envelope.ok (S3/S5).
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

// Active agricultores for the filter dropdown (S2).
export async function fetchFarmers(): Promise<AdminUser[]> {
  return fetchAllPages(
    '/admin/usuarios/?rol=Agricultor&estado=true',
    unwrapAdminUserPage,
  );
}
