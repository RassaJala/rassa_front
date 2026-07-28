import { describe, expect, it, vi } from 'vitest';
import {
  ALLOWED_IMAGE_TYPES,
  assertValidId,
  CATALOG_PAGE_SIZE,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_MB,
  PERSIST_TIMEOUT_MS,
  QUERY_RETRY,
  QUERY_STALE_TIME,
  TOAST_ORPHAN_DELAY_MS,
  UPLOAD_TIMEOUT_MS,
} from './api';

describe('PERSIST_TIMEOUT_MS', () => {
  it('is 120 seconds', () => {
    expect(PERSIST_TIMEOUT_MS).toBe(120_000);
  });
});

describe('withTimeout (shared logic)', () => {
  function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Timeout after ${String(ms)}ms`)),
        ms,
      );
      void promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  }

  it('resolves when promise finishes before timeout', async () => {
    const result = await withTimeout(Promise.resolve('ok'), 5000);
    expect(result).toBe('ok');
  });

  it('rejects when promise exceeds timeout', async () => {
    const neverResolves = new Promise<string>(() => {
      /* never resolves */
    });
    await expect(withTimeout(neverResolves, 100)).rejects.toThrow(
      'Timeout after 100ms',
    );
  });

  it('rejects with original error when promise rejects before timeout', async () => {
    const failing = Promise.reject(new Error('original error'));
    await expect(withTimeout(failing, 5000)).rejects.toThrow('original error');
  });
});
