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

function setupDeadline(
  maxDurationMs?: number,
): {
  deadline: number;
  budget: AbortController;
  isDeadline: () => boolean;
} {
  const budget = new AbortController();
  let deadlineAlcanzado = false;
  if (maxDurationMs !== undefined) {
    setTimeout(() => {
      deadlineAlcanzado = true;
      budget.abort();
    }, maxDurationMs);
  }
  return {
    deadline:
      maxDurationMs !== undefined ? Date.now() + maxDurationMs : Infinity,
    budget,
    isDeadline: () => deadlineAlcanzado,
  };
}

function wireSignal(signal: AbortSignal | undefined, budget: AbortController) {
  if (signal) {
    const abortBudget = () => budget.abort();
    if (signal.aborted) budget.abort();
    else signal.addEventListener('abort', abortBudget, { once: true });
    return abortBudget;
  }
  return () => {};
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T, signal: AbortSignal) => Promise<R>,
  signal?: AbortSignal,
  maxDurationMs?: number,
): Promise<PromiseSettledResult<R>[]> {
  const workerCount = Math.min(Math.floor(limit), items.length);
  if (workerCount <= 0) {
    return items.map(() => ({ status: 'rejected', reason: abortError() }));
  }

  const { deadline, budget, isDeadline } = setupDeadline(maxDurationMs);
  const removeListener = wireSignal(signal, budget);

  const results = new Array<PromiseSettledResult<R>>(items.length);
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
          reason: isDeadline() ? deadlineError() : abortError(),
        };
        continue;
      }
      results[index] = await dispatchItem(index);
    }
  }

  async function dispatchItem(
    index: number,
  ): Promise<PromiseSettledResult<R>> {
    try {
      const value = await mapper(items[index] as T, budget.signal);
      return { status: 'fulfilled', value };
    } catch (reason) {
      return {
        status: 'rejected',
        reason: deadline !== Infinity && budget.signal.aborted
          ? deadlineError()
          : reason,
      };
    }
  }

  try {
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
  } finally {
    removeListener();
  }
  return results;
}
