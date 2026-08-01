import { logError } from './logger';
import { safeNextUrl } from './safeUrl';

export interface FetchAllPagesPage<T> {
  readonly results?: readonly T[];
  readonly next?: string | null;
}

export interface FetchAllPagesResult<T> {
  readonly data: readonly T[];
  readonly truncated: boolean;
  readonly errores: number;
}

export interface FetchAllPagesOptions<T> {
  readonly url: string;
  readonly params?: Record<string, unknown>;
  readonly maxPages?: number;
  readonly maxDurationMs?: number;
  readonly signal?: AbortSignal;
  readonly fetchPage: (
    url: string,
    params?: Record<string, unknown>,
    signal?: AbortSignal,
  ) => Promise<unknown>;
  readonly unwrap: (body: unknown) => FetchAllPagesPage<T>;
}

/**
 * Recorre todas las páginas de un endpoint paginado (DRF: `next` + `results`),
 * acotado a `maxPages` (20 por defecto) y opcionalmente a `maxDurationMs`
 * (deadline total) para evitar bucles infinitos o recorridos que cuelguen
 * minutos con red degradada. Devuelve el acumulado, si quedaron páginas sin
 * leer (`truncated`) y cuántas páginas fallaron (`errores`). Un fallo detiene
 * el recorrido sin lanzar, dejando que el llamador decida cómo informar la
 * truncación silenciosa. Una cancelación (señal abortada) se detiene sin
 * contar como error.
 */
export async function fetchAllPages<T>(
  options: FetchAllPagesOptions<T>,
): Promise<FetchAllPagesResult<T>> {
  const maxPages = options.maxPages ?? 20;
  const deadline =
    options.maxDurationMs !== undefined
      ? Date.now() + options.maxDurationMs
      : Infinity;
  const data: T[] = [];
  let url: string | null = options.url;
  let depth = 0;
  let errores = 0;

  while (url !== null && depth < maxPages) {
    if (options.signal?.aborted) break;
    if (Date.now() > deadline) break;
    try {
      const body = await options.fetchPage(
        url,
        depth === 0 ? options.params : undefined,
        options.signal,
      );
      const page = options.unwrap(body);
      data.push(...(page.results ?? []));
      const next = safeNextUrl(page.next);
      if (page.next != null && next === null) {
        // El servidor devolvió un `next` no seguro: no podemos seguir el
        // recorrido de forma fiable y no debe pasar desapercibido.
        logError('fetchAllPages', new Error('next URL no segura'), {
          url,
          next: String(page.next),
        });
        errores += 1;
        break;
      }
      url = next;
    } catch (error) {
      if (options.signal?.aborted) break;
      errores += 1;
      logError('fetchAllPages', error, { url, depth });
      break;
    }
    depth += 1;
  }

  return { data, truncated: url !== null, errores };
}
