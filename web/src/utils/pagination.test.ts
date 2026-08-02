import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchAllPages } from './pagination';

interface DummyPage {
  readonly results: number[];
  readonly next: string | null;
}

function unwrapDummy(body: unknown): DummyPage {
  return body as DummyPage;
}

describe('fetchAllPages', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accumulates results across pages following next', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ results: [1, 2], next: '/a/?page=2' })
      .mockResolvedValueOnce({ results: [3], next: null });

    const result = await fetchAllPages({
      url: '/a/',
      fetchPage,
      unwrap: unwrapDummy,
    });

    expect(result.data).toEqual([1, 2, 3]);
    expect(result.errores).toBe(0);
    expect(result.truncated).toBe(false);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, '/a/', undefined, undefined);
  });

  it('passes params only to the first page', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ results: [1], next: '/a/?page=2' })
      .mockResolvedValueOnce({ results: [2], next: null });

    await fetchAllPages({
      url: '/a/',
      params: { fecha_desde: '2026-08-01' },
      fetchPage,
      unwrap: unwrapDummy,
    });

    expect(fetchPage).toHaveBeenNthCalledWith(
      1,
      '/a/',
      { fecha_desde: '2026-08-01' },
      undefined,
    );
    expect(fetchPage).toHaveBeenNthCalledWith(
      2,
      '/a/?page=2',
      undefined,
      undefined,
    );
  });

  it('stops at maxPages and reports truncated', async () => {
    const fetchPage = vi.fn(async () => ({ results: [1], next: '/a/?page=N' }));

    const result = await fetchAllPages({
      url: '/a/',
      maxPages: 3,
      fetchPage,
      unwrap: unwrapDummy,
    });

    expect(result.data).toEqual([1, 1, 1]);
    expect(result.truncated).toBe(true);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('stops when the total deadline expires and reports truncated', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    let first = true;
    const fetchPage = vi.fn(async () => {
      if (first) {
        first = false;
        nowSpy.mockReturnValue(1_000_000 + 500);
      }
      return { results: [1], next: '/a/?page=2' };
    });

    const result = await fetchAllPages({
      url: '/a/',
      maxDurationMs: 100,
      fetchPage,
      unwrap: unwrapDummy,
    });

    expect(result.data).toEqual([1]);
    expect(result.truncated).toBe(true);
    expect(result.errores).toBe(0);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('aborts the in-flight page when the deadline expires (hard wall)', async () => {
    let gotSignal: AbortSignal | undefined;
    const result = await fetchAllPages({
      url: '/a/',
      maxDurationMs: 40,
      fetchPage: (_url, _params, signal) => {
        gotSignal = signal;
        return new Promise((_resolve, reject) => {
          signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        });
      },
      unwrap: unwrapDummy,
    });

    expect(gotSignal?.aborted).toBe(true);
    expect(result.truncated).toBe(true);
    expect(result.errores).toBe(0);
  });

  it('returns nothing when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchPage = vi.fn();

    const result = await fetchAllPages({
      url: '/a/',
      signal: controller.signal,
      fetchPage,
      unwrap: unwrapDummy,
    });

    expect(fetchPage).not.toHaveBeenCalled();
    expect(result).toEqual({ data: [], truncated: true, errores: 0 });
  });

  it('stops on an abort mid-walk without counting an error', async () => {
    const controller = new AbortController();
    const fetchPage = vi.fn(async () => {
      controller.abort();
      return { results: [1], next: '/a/?page=2' };
    });

    const result = await fetchAllPages({
      url: '/a/',
      signal: controller.signal,
      fetchPage,
      unwrap: unwrapDummy,
    });

    expect(result.data).toEqual([1]);
    expect(result.errores).toBe(0);
    expect(result.truncated).toBe(true);
  });

  it('counts a failed page as an error and stops the walk', async () => {
    const fetchPage = vi.fn().mockRejectedValueOnce(new Error('network down'));

    const result = await fetchAllPages({
      url: '/a/',
      fetchPage,
      unwrap: unwrapDummy,
    });

    expect(result.errores).toBe(1);
    expect(result.data).toEqual([]);
    expect(result.truncated).toBe(true);
  });

  it('flags an unsafe next URL as an error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchPage = vi.fn(async () => ({
      results: [1],
      next: 'https://evil.example.com/a/',
    }));

    const result = await fetchAllPages({
      url: '/a/',
      fetchPage,
      unwrap: unwrapDummy,
    });

    expect(result.errores).toBe(1);
    expect(result.truncated).toBe(true);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('handles an empty first page as complete', async () => {
    const fetchPage = vi.fn(async () => ({ results: [], next: null }));

    const result = await fetchAllPages({
      url: '/a/',
      fetchPage,
      unwrap: unwrapDummy,
    });

    expect(result).toEqual({ data: [], truncated: false, errores: 0 });
  });
});
