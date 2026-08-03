export function abortError(): Error {
  return new DOMException('Aborted', 'AbortError');
}

export function deadlineError(): Error {
  return new DOMException('Deadline exceeded', 'DeadlineExceededError');
}

export function isAbortError(reason: unknown): boolean {
  if (reason instanceof DOMException && reason.name === 'AbortError') {
    return true;
  }
  if (reason instanceof Error && reason.name === 'AbortError') {
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

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T, signal: AbortSignal) => Promise<R>,
  signal?: AbortSignal,
  maxDurationMs?: number,
): Promise<PromiseSettledResult<R>[]> {
  const workerCount = Math.min(Math.floor(limit), items.length);
  if (!(workerCount > 0)) {
    return items.map(() => ({ status: 'rejected', reason: abortError() }));
  }

  const deadline =
    maxDurationMs !== undefined ? Date.now() + maxDurationMs : Infinity;
  const budget = new AbortController();
  const abortBudget = () => budget.abort();
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

  const results: PromiseSettledResult<R>[] = new Array(items.length);
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
        const value = await mapper(items[index] as T, budget.signal);
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
