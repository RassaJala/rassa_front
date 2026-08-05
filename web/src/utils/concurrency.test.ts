import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  abortError,
  deadlineError,
  isAbortError,
  mapWithConcurrency,
} from './concurrency';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('mapWithConcurrency', () => {
  it('maps all items and preserves input order', async () => {
    const result = await mapWithConcurrency([1, 2, 3], 2, async (n) => n * 2);
    expect(
      result.map((r) => (r.status === 'fulfilled' ? r.value : null)),
    ).toEqual([2, 4, 6]);
  });

  it('never exceeds the concurrency limit', async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    const result = await mapWithConcurrency(
      [1, 2, 3, 4, 5, 6, 7, 8],
      3,
      async (n) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        return n;
      },
    );

    expect(maxInFlight).toBeLessThanOrEqual(3);
    expect(result.every((r) => r.status === 'fulfilled')).toBe(true);
  });

  it('collects rejections in order alongside fulfilled results', async () => {
    const result = await mapWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error('boom');
      return n;
    });

    expect(result[0]).toEqual({ status: 'fulfilled', value: 1 });
    expect(result[1]).toEqual({
      status: 'rejected',
      reason: expect.any(Error),
    });
    expect(result[2]).toEqual({ status: 'fulfilled', value: 3 });
  });

  it('handles empty input', async () => {
    const result = await mapWithConcurrency([], 4, async () => 1);
    expect(result).toEqual([]);
  });

  it('handles limit larger than item count', async () => {
    const result = await mapWithConcurrency([1, 2], 10, async (n) => n);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.status === 'fulfilled')).toBe(true);
  });

  it('does not dispatch anything when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const mapper = vi.fn(async (n: number) => n);

    const result = await mapWithConcurrency(
      [1, 2, 3],
      2,
      mapper,
      controller.signal,
    );

    expect(mapper).not.toHaveBeenCalled();
    expect(result).toHaveLength(3);
    expect(result.every((r) => r.status === 'rejected')).toBe(true);
    expect((result[0] as { reason: Error }).reason.name).toBe('AbortError');
  });

  it('force-settles in-flight items when the signal aborts mid-flight', async () => {
    const controller = new AbortController();
    const mapper = vi.fn(async (n: number) => {
      if (n === 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        controller.abort();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
      return n;
    });

    const result = await mapWithConcurrency(
      [1, 2, 3],
      2,
      mapper,
      controller.signal,
    );

    // En vuelo y pendientes se asientan como abortados: el watchdog fuerza la
    // resolución en cuanto se aborta el presupuesto, aunque el mapper que
    // provocó el abort estuviera a punto de devolver su valor.
    expect(result.every((r) => r.status === 'rejected')).toBe(true);
    expect(
      result.every(
        (r) =>
          r.status === 'rejected' && (r.reason as Error).name === 'AbortError',
      ),
    ).toBe(true);
    expect(mapper).toHaveBeenCalledTimes(2);
  });

  it('isAbortError recognizes DOMException and axios cancel codes', () => {
    expect(isAbortError(abortError())).toBe(true);
    expect(isAbortError({ code: 'ERR_CANCELED' })).toBe(true);
    expect(isAbortError(new Error('Network Error'))).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });

  it('handles a limit of zero without dispatching anything', async () => {
    const mapper = vi.fn(async (n: number) => n);

    const result = await mapWithConcurrency([1, 2, 3], 0, mapper);

    expect(mapper).not.toHaveBeenCalled();
    expect(result).toHaveLength(3);
    expect(result.every((r) => r.status === 'rejected')).toBe(true);
  });

  it('handles a negative limit like zero', async () => {
    const mapper = vi.fn(async (n: number) => n);

    const result = await mapWithConcurrency([1], -1, mapper);

    expect(mapper).not.toHaveBeenCalled();
    expect(result[0]?.status).toBe('rejected');
  });

  it('rejects pending items with deadlineError when the deadline already expired', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const mapper = vi.fn(async (n: number) => n);

    const result = await mapWithConcurrency([1, 2], 2, mapper, undefined, -1);

    expect(mapper).not.toHaveBeenCalled();
    expect(result[0]).toEqual({
      status: 'rejected',
      reason: expect.objectContaining({ name: 'DeadlineExceededError' }),
    });
    expect(result[1]?.status).toBe('rejected');
    expect(isAbortError(deadlineError())).toBe(false);
  });

  it('interrupts in-flight items when the deadline expires', async () => {
    const mapper = vi.fn(
      async (_n: number, signal: AbortSignal): Promise<number> => {
        await new Promise<number>((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(
              Object.assign(new Error('cancelado'), { name: 'AbortError' }),
            );
          });
        });
        return 1;
      },
    );

    const result = await mapWithConcurrency([1], 1, mapper, undefined, 50);

    // El item en vuelo se interrumpe vía su señal; al vencerse el presupuesto,
    // se reporta como deadlineError (fallo de tiempo), no como cancelación.
    expect(result[0]).toEqual({
      status: 'rejected',
      reason: expect.objectContaining({ name: 'DeadlineExceededError' }),
    });
  });

  it('forwards caller aborts to the in-flight mapper signal', async () => {
    const controller = new AbortController();
    let mapperSignal: AbortSignal | undefined;
    const mapper = vi.fn(async (n: number, signal: AbortSignal) => {
      mapperSignal = signal;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return n;
    });

    const pending = mapWithConcurrency([1], 1, mapper, controller.signal);
    await new Promise((resolve) => setTimeout(resolve, 5));
    controller.abort();

    const result = await pending;
    expect(mapperSignal?.aborted).toBe(true);
    expect(result[0]?.status).toBe('rejected');
    expect((result[0] as { reason: Error }).reason.name).toBe('AbortError');
  });

  it('force-settles in-flight items when the deadline expires even if the mapper never resolves', async () => {
    const mapper = vi.fn(
      async (_n: number, _signal: AbortSignal): Promise<number> =>
        new Promise<number>(() => {}),
    );

    const result = await mapWithConcurrency([1], 1, mapper, undefined, 40);

    expect(result[0]).toEqual({
      status: 'rejected',
      reason: expect.objectContaining({ name: 'DeadlineExceededError' }),
    });
  });

  it('treats a NaN limit like zero without dispatching anything', async () => {
    const mapper = vi.fn(async (n: number) => n);

    const result = await mapWithConcurrency([1, 2], Number.NaN, mapper);

    expect(mapper).not.toHaveBeenCalled();
    expect(result.every((r) => r.status === 'rejected')).toBe(true);
  });

  it('completes items that fit before the deadline and rejects the rest', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const mapper = vi.fn(async (n: number) => {
      await Promise.resolve();
      nowSpy.mockReturnValue(1_000_000 + 100);
      return n;
    });

    const result = await mapWithConcurrency(
      [1, 2, 3],
      1,
      mapper,
      undefined,
      50,
    );

    // Con un solo worker, el primer item se despacha antes del deadline y
    // avanza el reloj; los siguientes ya ven el deadline vencido.
    expect(result[0]?.status).toBe('fulfilled');
    expect(result[1]).toEqual({
      status: 'rejected',
      reason: expect.objectContaining({ name: 'DeadlineExceededError' }),
    });
    expect(result[2]?.status).toBe('rejected');
  });
});
