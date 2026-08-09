import * as Sentry from '@sentry/react-native';

import api, { isApiUrl } from './api';
import { sanitizeSentryError } from './sentry';

export interface PaginatedFetchResult<T> {
  readonly data: T[];
  readonly truncated: boolean;
  readonly errores: number;
}

const DEFAULT_MAX_PAGES = 20;

export function unwrapOk<T>(body: unknown): T {
  if (
    body &&
    typeof body === 'object' &&
    'data' in (body as Record<string, unknown>)
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
}

interface PagePayload<T> {
  readonly results: T[];
  readonly next: string | null;
}

function toPage<T>(body: unknown): PagePayload<T> {
  const payload = unwrapOk<PagePayload<T> | T[]>(body);
  if (Array.isArray(payload)) {
    return { results: payload, next: null };
  }
  if (!payload || typeof payload !== 'object') {
    console.warn('[fetchAllPages] unexpected payload type:', typeof payload);
    Sentry.captureMessage(
      `[fetchAllPages] se recibió un payload inesperado de tipo ${typeof payload}`,
    );
    return { results: [], next: null };
  }
  const results = Array.isArray(payload.results) ? payload.results : [];
  const next = typeof payload.next === 'string' ? payload.next : null;
  return { results, next };
}

export interface FetchAllPagesOptions<T> {
  readonly maxPages?: number;
  readonly source?: string;
  readonly keyOf?: (item: T) => string | number;
  readonly signal?: AbortSignal;
  readonly maxDurationMs?: number;
}

async function fetchPage<T>(
  url: string,
  signal?: AbortSignal,
): Promise<PagePayload<T>> {
  const { data } = await api.get<unknown>(
    url,
    signal !== undefined ? { signal } : {},
  );
  return toPage<T>(data);
}

function dedupePage<T>(
  accumulated: T[],
  seen: Set<string | number>,
  page: PagePayload<T>,
  keyOf?: (item: T) => string | number,
): number {
  if (!keyOf) {
    accumulated.push(...page.results);
    return 0;
  }
  let duplicados = 0;
  for (const item of page.results) {
    const key = keyOf(item);
    if (seen.has(key)) {
      duplicados += 1;
      continue;
    }
    seen.add(key);
    accumulated.push(item);
  }
  return duplicados;
}

function resolveNext(source: string, next: string | null): string | null {
  if (next === null || isApiUrl(next)) {
    return next;
  }
  console.warn(`[${source}] unsafe next URL ignored:`, next);
  Sentry.captureMessage(
    `[${source}] se ignoró un next fuera del origen de la API`,
  );
  return null;
}

/**
 * Recorre todas las páginas de un endpoint paginado tolerando fallos parciales.
 * `truncated` indica si se alcanzó el límite de páginas; `errores` cuántas
 * páginas fallaron y fueron omitidas con los datos acumulados hasta ese punto.
 */
export async function fetchAllPages<T>(
  url: string,
  options?: FetchAllPagesOptions<T>,
): Promise<PaginatedFetchResult<T>> {
  const maxPages = options?.maxPages ?? DEFAULT_MAX_PAGES;
  const source = options?.source ?? 'fetchAllPages';
  const keyOf = options?.keyOf;
  const signal = options?.signal;
  const deadline =
    options?.maxDurationMs !== undefined
      ? Date.now() + options.maxDurationMs
      : Infinity;
  const accumulated: T[] = [];
  const seen = new Set<string | number>();
  let errores = 0;
  let truncated = false;
  let duplicados = 0;
  let depth = 0;
  let nextUrl: string | null = url;

  while (nextUrl !== null) {
    if (depth >= maxPages) {
      truncated = true;
      console.warn(
        `[${source}] max pages (${maxPages}) reached, stopping fetch`,
      );
      Sentry.captureMessage(
        `[${source}] se alcanzó el límite de ${maxPages} páginas al obtener ${url}`,
      );
      break;
    }
    if (Date.now() >= deadline) {
      truncated = true;
      console.warn(`[${source}] deadline reached, stopping fetch`);
      Sentry.captureMessage(
        `[${source}] se alcanzó el deadline al obtener ${url}`,
      );
      break;
    }
    try {
      const page = await fetchPage<T>(nextUrl, signal);
      duplicados += dedupePage(accumulated, seen, page, keyOf);
      nextUrl = resolveNext(source, page.next);
    } catch (error) {
      errores += 1;
      console.warn(`[${source}] error fetching page at depth ${depth}:`, error);
      Sentry.captureException(sanitizeSentryError(error));
      if (accumulated.length === 0) throw error;
      nextUrl = null;
    }
    depth += 1;
  }

  if (duplicados > 0) {
    console.warn(`[${source}] ${duplicados} elementos duplicados detectados`);
    Sentry.captureMessage(
      `[${source}] ${duplicados} elementos duplicados al recorrer ${url}`,
    );
  }

  return { data: accumulated, truncated, errores };
}
