export type SettledResult<T> =
  | { readonly status: 'fulfilled'; readonly value: T }
  | { readonly status: 'rejected'; readonly reason: unknown };

/** Error usado para los items que quedan sin procesar tras un abort. */
export function abortError(): Error {
  return new DOMException('Aborted', 'AbortError');
}

/**
 * Error usado para los items que quedan sin procesar al vencer el deadline
 * total (`maxDurationMs`). No es un abort (nombre distinto), así que el
 * llamador puede distinguir un límite de tiempo de una cancelación real.
 */
export function deadlineError(): Error {
  return new DOMException('Deadline exceeded', 'DeadlineExceededError');
}

export function isAbortError(reason: unknown): boolean {
  if (reason instanceof DOMException && reason.name === 'AbortError') {
    return true;
  }
  if (
    reason &&
    typeof reason === 'object' &&
    'code' in reason &&
    (reason as { code?: unknown }).code === 'ERR_CANCELED'
  ) {
    return true;
  }
  return false;
}

/**
 * Aplica `mapper` a cada item limitando a `limit` peticiones en vuelo al mismo
 * tiempo, y devuelve resultados en el orden de los items (mismo shape que
 * `Promise.allSettled`). Evita abrir N requests simultáneas sobre un mismo
 * endpoint cuando N es grande. Si `signal` se aborta, los items pendientes se
 * resuelven como rechazados con `abortError()` sin despachar. Si `maxDurationMs`
 * se vence, los items pendientes se resuelven con `deadlineError()`. Un
 * `limit` <= 0 no despacha nada y rechaza todo con `abortError()`.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
  signal?: AbortSignal,
  maxDurationMs?: number,
): Promise<SettledResult<R>[]> {
  const workerCount = Math.max(0, Math.min(Math.floor(limit), items.length));
  if (workerCount === 0) {
    return items.map(() => ({ status: 'rejected', reason: abortError() }));
  }

  const results: SettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;
  const deadline =
    maxDurationMs !== undefined ? Date.now() + maxDurationMs : Infinity;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      if (index >= items.length) return;
      if (Date.now() > deadline) {
        results[index] = { status: 'rejected', reason: deadlineError() };
        nextIndex += 1;
        continue;
      }
      nextIndex += 1;
      if (signal?.aborted) {
        results[index] = { status: 'rejected', reason: abortError() };
        continue;
      }
      try {
        const value = await mapper(items[index] as T);
        results[index] = { status: 'fulfilled', value };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}
