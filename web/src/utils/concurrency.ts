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
 * endpoint cuando N es grande.
 *
 * El `mapper` recibe un `AbortSignal` de presupuesto en el segundo argumento,
 * que se aborta si `signal` (del llamador) se aborta o si `maxDurationMs` se
 * vence — así el deadline es un tope de pared, no solo un límite de despachos:
 * los items en vuelo se interrumpen vía su señal y `await` termina a tiempo.
 * Si el `mapper` ignora la señal y nunca resuelve, un watchdog asienta el item
 * al abortarse el presupuesto (el tope de pared no puede quedar colgado).
 *
 * Los items pendientes se resuelven sin despachar: con `abortError()` si fue
 * una cancelación y con `deadlineError()` si venció el presupuesto. Un item en
 * vuelo interrumpido por el vencimiento del presupuesto se reporta también con
 * `deadlineError()` (el tope de tiempo cuenta como fallo, no como cancelación);
 * si la interrupción vino de `signal`, se propaga el error de su operación. Si
 * el abort del llamador coincide con el vencimiento del presupuesto, gana
 * `deadlineError()`: el tope de tiempo se reporta como fallo.
 *
 * Un `limit` <= 0 o no finito (NaN) no despacha nada y rechaza todo con
 * `abortError()`.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T, signal: AbortSignal) => Promise<R>,
  signal?: AbortSignal,
  maxDurationMs?: number,
): Promise<SettledResult<R>[]> {
  const workerCount = Math.min(Math.floor(limit), items.length);
  if (!(workerCount > 0)) {
    return items.map(() => ({ status: 'rejected', reason: abortError() }));
  }

  const deadline =
    maxDurationMs !== undefined ? Date.now() + maxDurationMs : Infinity;
  const budget = new AbortController();
  const abortBudget = () => budget.abort();
  // El vencimiento del presupuesto se marca como estado y no se re-deriva del
  // reloj al clasificar un abort: un paso atrás del reloj de sistema durante
  // el disparo del timer no puede convertir un deadline en una cancelación
  // silenciosa. El reloj de pared solo se consulta como suplemento (un abort
  // del llamador que coincide con el vencimiento real del tope).
  let deadlineAlcanzado = false;
  const deadlineTimer =
    maxDurationMs !== undefined
      ? setTimeout(() => {
          deadlineAlcanzado = true;
          budget.abort();
        }, maxDurationMs)
      : undefined;

  if (signal) {
    if (signal.aborted) budget.abort();
    else signal.addEventListener('abort', abortBudget, { once: true });
  }

  const results: SettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

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
      if (budget.signal.aborted) {
        results[index] = {
          status: 'rejected',
          reason: deadlineAlcanzado ? deadlineError() : abortError(),
        };
        continue;
      }
      try {
        const value = await withBudgetSignal(
          () => mapper(items[index] as T, budget.signal),
          budget.signal,
        );
        results[index] = { status: 'fulfilled', value };
      } catch (reason) {
        const interruptedByDeadline =
          deadline !== Infinity &&
          budget.signal.aborted &&
          (deadlineAlcanzado || Date.now() >= deadline);
        results[index] = {
          status: 'rejected',
          reason: interruptedByDeadline ? deadlineError() : reason,
        };
      }
    }
  }

  try {
    const workers = Array.from({ length: workerCount }, () => worker());
    await Promise.all(workers);
  } finally {
    if (deadlineTimer !== undefined) clearTimeout(deadlineTimer);
    signal?.removeEventListener('abort', abortBudget);
  }
  return results;
}

/**
 * Ejecuta `fn` y la fuerza a asentarse si `signal` se aborta antes de que
 * resuelva: si el `mapper` ignora la señal y nunca termina, el deadline o el
 * abort del llamador no pueden dejar un worker colgado para siempre.
 */
function withBudgetSignal<R>(
  fn: () => Promise<R>,
  signal: AbortSignal,
): Promise<R> {
  return new Promise<R>((resolve, reject) => {
    let settled = false;
    const onAbort = () => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', onAbort);
      reject(abortError());
    };
    signal.addEventListener('abort', onAbort, { once: true });
    fn().then(
      (value) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (reason) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', onAbort);
        reject(reason);
      },
    );
  });
}
