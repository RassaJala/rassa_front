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
  count: number;
  results: AdminUser[];
  next: string | null;
}

// Result of walking the DRF pagination links: the accumulated items, the server
// total reported on the first page, and a flag that says the walk did not reach
// the end (either the page cap was hit or a mid-chain page failed).
export interface PaginatedFetchResult<T> {
  items: T[];
  count: number;
  truncated: boolean;
}

// A `next` link is only safe to follow when it stays on the SAME origin as
// the api instance. DRF's PageNumberPagination emits `next` as an ABSOLUTE
// URL ("http://<host>/api/liquidaciones/?page=2"), so a plain relative-path
// check would truncate the walk after page 1 in any real deployment. The
// guard accepts: relative paths ("/liquidaciones/?page=2") and absolute URLs
// whose origin equals api.defaults.baseURL's origin. It rejects:
// protocol-relative URLs ("//evil.example/..."), cross-origin absolute URLs
// ("https://evil.example/...") and anything that fails to parse — following
// those would make axios resolve the request against an external origin and,
// since the api instance attaches the JWT to every request, leak the token
// (R1-1).
function isSafeNextUrl(next: string): boolean {
  if (next.startsWith('/')) return !next.startsWith('//');
  try {
    const base = new URL(api.defaults.baseURL ?? '');
    const candidate = new URL(next);
    return candidate.origin === base.origin;
  } catch {
    return false;
  }
}

// Follow the DRF pagination `next` links up to a hard cap. All pages share the
// {ok, data} envelope; each page is unwrapped individually so a malformed page
// throws instead of silently truncating the list. A failure on the FIRST page
// rethrows (business errors like HTTP 400 must still reject); a failure on a
// SUBSEQUENT page stops the walk and returns the partial items with
// truncated: true — the flag carries the signal, nothing is swallowed.
async function fetchAllPages<T>(
  firstUrl: string,
  unwrapPage: (envelope: SettlementEnvelope<unknown>) => {
    results: T[];
    next: string | null;
    count: number;
  },
  signal?: AbortSignal,
): Promise<PaginatedFetchResult<T>> {
  const items: T[] = [];
  let url: string | null = firstUrl;
  let depth = 0;
  let count = 0;
  let truncated = false;

  while (url !== null && depth < SETTLEMENTS_MAX_PAGES) {
    let page: { results: T[]; next: string | null; count: number };
    try {
      // exactOptionalPropertyTypes: only set `signal` when actually provided.
      const config = signal ? { signal } : {};
      const { data } = await api.get<SettlementEnvelope<unknown>>(url, config);
      page = unwrapPage(data);
    } catch (err) {
      if (depth === 0) throw err;
      truncated = true;
      break;
    }
    if (depth === 0) count = page.count;
    items.push(...page.results);

    // R1-1: never follow an unsafe `next` link. The api instance attaches the
    // JWT to every request, so a protocol-relative ("//evil/...") or absolute
    // ("https://evil/...") next URL would resolve against an external origin
    // and leak the token. Treat an unsafe link as an unsafe stop: keep the
    // items collected so far, mark the walk truncated and do NOT request it.
    const nextUrl = page.next;
    if (nextUrl !== null && !isSafeNextUrl(nextUrl)) {
      truncated = true;
      break;
    }
    url = nextUrl;
    depth += 1;
  }

  // The loop also exits when the cap is reached with more pages still pending.
  if (url !== null) truncated = true;

  return { items, count, truncated };
}

function unwrapSettlementPage(envelope: SettlementEnvelope<unknown>): {
  results: Settlement[];
  next: string | null;
  count: number;
} {
  const page = unwrapLiquidacionesEnvelope<SettlementListResponse>(envelope);
  return { results: page.results, next: page.next, count: page.count };
}

function unwrapAdminUserPage(envelope: SettlementEnvelope<unknown>): {
  results: AdminUser[];
  next: string | null;
  count: number;
} {
  const page = unwrapLiquidacionesEnvelope<AdminUserPage>(envelope);
  return { results: page.results, next: page.next, count: page.count };
}

// Server-filtered multi-page fetch-all: GET /liquidaciones/ with optional
// agricultor / estado / periodo_inicio / periodo_fin params (S2). Returns the
// accumulated items plus the server total (count) and whether the walk was
// truncated by the page cap or a mid-chain failure.
export async function fetchSettlements(
  params: SettlementListParams = {},
  signal?: AbortSignal,
): Promise<PaginatedFetchResult<Settlement>> {
  return fetchAllPages(
    buildLiquidacionesUrl(params),
    unwrapSettlementPage,
    signal,
  );
}

export async function fetchSettlement(
  id: number,
  signal?: AbortSignal,
): Promise<SettlementDetail> {
  const config = signal ? { signal } : {};
  const { data } = await api.get<SettlementEnvelope<SettlementDetail>>(
    `/liquidaciones/${id}/`,
    config,
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

// Minimal shape for the filter dropdowns: id + display name only. Deliberately
// NOT the full AdminUser — the farmers fetch must not pull PII (email, address,
// localidad) into the settlements screens when the UI only renders the name
// (R1-3).
export interface FarmerOption {
  id_usuario: number;
  nombre: string;
}

function farmerFullName(user: AdminUser): string {
  return [user.nombre, user.apellido_paterno, user.apellido_materno]
    .filter(Boolean)
    .join(' ');
}

// Active agricultores for the filter dropdown (S2). Kept all-or-nothing: the
// farmers list is small, so partial/truncated semantics are not applied here —
// a mid-chain page failure rejects instead of returning a partial dropdown, so
// the caller's error/retry UI fires. Each page is reduced to FarmerOption so
// the screens never hold more PII than they render (R1-3).
export async function fetchFarmers(): Promise<FarmerOption[]> {
  const result = await fetchAllPages(
    '/admin/usuarios/?rol=Agricultor&estado=true',
    unwrapAdminUserPage,
  );
  if (result.truncated) {
    throw new Error('No se pudieron cargar todos los agricultores');
  }
  return result.items.map((user) => ({
    id_usuario: user.id_usuario,
    nombre: farmerFullName(user),
  }));
}
