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
  count: number;
}

// Result of walking the DRF pagination links: the accumulated items, the server
// total reported on the first page, and a flag that says the walk did not reach
// the end (either the page cap was hit, an unsafe `next` link was found or a
// mid-chain page failed — the partial items are kept either way).
export interface SettlementsResult<T = unknown> {
  items: T[];
  count: number;
  truncated: boolean;
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

// A `next` link is only safe to follow when it cannot leave the api instance's
// origin. DRF's PageNumberPagination emits `next` as an ABSOLUTE URL
// ("http://<host>/api/liquidaciones/?page=2"), so a plain relative-path check
// would truncate the walk after page 1 in any real deployment. The guard:
// - accepts relative references (leading "/", bare "liquidaciones/?page=2", …)
//   — axios resolves those against the api baseURL, so they stay on the
//   configured origin by construction;
// - accepts absolute URLs whose origin equals the api baseURL's origin;
// - rejects protocol-relative ("//evil.example/…"), cross-origin absolute
//   ("https://evil.example/…") and anything that fails to parse. Following
//   those would make axios resolve the request against an external origin and,
//   since the api instance attaches the JWT to every request, leak the token
//   (CONV-2).
function apiBaseOrigin(): string | null {
  try {
    const rawBase = api.defaults.baseURL ?? '';
    const baseUrl = rawBase
      ? new URL(
          rawBase,
          typeof window === 'undefined' ? undefined : window.location.origin,
        )
      : new URL(
          typeof window === 'undefined'
            ? 'http://localhost'
            : window.location.href,
        );
    return baseUrl.origin;
  } catch {
    return null;
  }
}

function isSafeNextUrl(next: string): boolean {
  if (next.startsWith('//')) return false;
  // No scheme → relative reference, resolved against the api baseURL.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(next)) return true;
  const baseOrigin = apiBaseOrigin();
  if (baseOrigin === null) return false;
  try {
    return new URL(next).origin === baseOrigin;
  } catch {
    return false;
  }
}

// Follow the DRF pagination `next` links up to a hard cap. All pages share the
// {ok, data} envelope; each page is unwrapped individually so a malformed page
// throws instead of silently truncating the list. The server count is kept from
// the FIRST page (DRF reports the full filtered total there). A failure on the
// FIRST page rethrows (business errors like HTTP 400 must still reject); a
// failure on a SUBSEQUENT page stops the walk and returns the partial items with
// truncated: true — the flag carries the signal, nothing is swallowed.
async function fetchAllPages<T>(
  firstUrl: string,
  unwrapPage: (envelope: SettlementEnvelope<unknown>) => {
    results: T[];
    next: string | null;
    count: number;
  },
): Promise<SettlementsResult<T>> {
  const all: T[] = [];
  let url: string | null = firstUrl;
  let depth = 0;
  let count = 0;
  let truncated = false;

  while (url !== null && depth < SETTLEMENTS_MAX_PAGES) {
    let page: { results: T[]; next: string | null; count: number };
    try {
      const { data } = await api.get<SettlementEnvelope<unknown>>(url);
      page = unwrapPage(data);
    } catch (err) {
      if (depth === 0) throw err;
      truncated = true;
      break;
    }
    if (depth === 0) count = page.count;
    all.push(...page.results);

    // CONV-2: never follow an unsafe `next` link. Treat an unsafe link as an
    // unsafe stop: keep the items collected so far, mark the walk truncated
    // and do NOT request it.
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

  return { items: all, count, truncated };
}

function unwrapSettlementPage(envelope: SettlementEnvelope<unknown>): {
  results: Settlement[];
  next: string | null;
  count: number;
} {
  const page = unwrapLiquidacionesEnvelope<SettlementListResponse>(envelope);
  return { results: page.results, next: page.next, count: page.count };
}

function unwrapUserPage(envelope: SettlementEnvelope<unknown>): {
  results: User[];
  next: string | null;
  count: number;
} {
  const page = unwrapLiquidacionesEnvelope<RawUserPage>(envelope);
  return {
    results: page.results.map(mapFarmer),
    next: page.next,
    count: page.count,
  };
}

// Server-filtered multi-page fetch-all: GET /liquidaciones/ with optional
// agricultor / estado / periodo_inicio / periodo_fin params (R2).
export async function fetchSettlements(
  params: SettlementListParams = {},
): Promise<SettlementsResult<Settlement>> {
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

// Active agricultores for the filter dropdown (R2). Kept all-or-nothing: the
// farmers list is small, so a mid-chain page failure (truncated) rejects
// instead of returning a partial dropdown.
export async function fetchFarmers(): Promise<User[]> {
  const result = await fetchAllPages(
    '/admin/usuarios/?rol=Agricultor&estado=true',
    unwrapUserPage,
  );
  if (result.truncated) {
    throw new Error('No se pudieron cargar todos los agricultores');
  }
  return result.items;
}
