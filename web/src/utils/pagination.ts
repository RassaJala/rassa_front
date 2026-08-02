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
 * minutos con red degradada. El deadline es un tope de pared: al vencer aborta
 * la página en vuelo (no solo deja de despachar la siguiente). Devuelve el
 * acumulado, si quedaron páginas sin leer (`truncated`) y cuántas páginas
 * fallaron (`errores`). Un fallo detiene el recorrido sin lanzar, dejando que
 * el llamador decida cómo informar la truncación silenciosa. Una cancelación
 * (señal abortada o presupuesto vencido) se detiene sin contar como error.
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

  const budget =
    options.maxDurationMs !== undefined ? new AbortController() : undefined;
  const deadlineTimer =
    options.maxDurationMs !== undefined
      ? setTimeout(() => budget?.abort(), options.maxDurationMs)
      : undefined;
  const page = mergedSignal(options.signal, budget?.signal);

  try {
    while (url !== null && depth < maxPages) {
      if (options.signal?.aborted || budget?.signal.aborted) break;
      if (Date.now() > deadline) break;
      try {
        const body = await options.fetchPage(
          url,
          depth === 0 ? options.params : undefined,
          page.signal,
        );
        const current = options.unwrap(body);
        data.push(...(current.results ?? []));
        const next = safeNextUrl(current.next);
        if (current.next != null && next === null) {
          // El servidor devolvió un `next` no seguro: no podemos seguir el
          // recorrido de forma fiable y no debe pasar desapercibido. No se
          // loguea el valor crudo (podría contener query params sensibles).
          logError('fetchAllPages', new Error('next URL no segura'), {
            url,
            depth,
          });
          errores += 1;
          break;
        }
        url = next;
      } catch (error) {
        if (options.signal?.aborted || budget?.signal.aborted) break;
        errores += 1;
        logError('fetchAllPages', error, { url, depth });
        break;
      }
      depth += 1;
    }
  } finally {
    if (deadlineTimer !== undefined) clearTimeout(deadlineTimer);
    // Se remueven los listeners que `mergedSignal` puso sobre la señal del
    // llamador y la del presupuesto; de lo contrario, un `signal` longevo
    // acumularía un listener por cada recorrido paginado.
    page.cleanup();
  }

  return { data, truncated: url !== null, errores };
}

/**
 * Combina la señal del llamador con la presupuesto del deadline en una sola:
 * la página en vuelo se aborta si cualquiera de las dos se aborta. Devuelve
 * junto con la señal una `cleanup` para quitar los listeners cuando el
 * recorrido termina, evitando fugas sobre señales de vida larga.
 */
function mergedSignal(
  signal?: AbortSignal,
  budgetSignal?: AbortSignal,
): { readonly signal: AbortSignal | undefined; readonly cleanup: () => void } {
  if (signal === undefined) {
    return { signal: budgetSignal, cleanup: () => undefined };
  }
  if (budgetSignal === undefined) {
    return { signal, cleanup: () => undefined };
  }
  const merged = new AbortController();
  const abort = () => merged.abort();
  signal.addEventListener('abort', abort, { once: true });
  budgetSignal.addEventListener('abort', abort, { once: true });
  return {
    signal: merged.signal,
    cleanup: () => {
      signal.removeEventListener('abort', abort);
      budgetSignal.removeEventListener('abort', abort);
    },
  };
}
