import { describe, expect, it, vi } from 'vitest';
import { withTimeout } from './withTimeout';

describe('withTimeout', () => {
  it('resolves when promise completes within timeout', async () => {
    const result = await withTimeout(
      Promise.resolve('ok'),
      1000,
      new AbortController(),
    );
    expect(result).toBe('ok');
  });

  it('rejects when promise exceeds timeout', async () => {
    const controller = new AbortController();
    const slow = new Promise<string>(() => {});
    await expect(withTimeout(slow, 10, controller)).rejects.toThrow('timeout');
  });

  it('aborts controller on timeout', async () => {
    const controller = new AbortController();
    const slow = new Promise<string>(() => {});
    await expect(withTimeout(slow, 10, controller)).rejects.toThrow('timeout');
    expect(controller.signal.aborted).toBe(true);
  });

  it('rejects with original error when promise rejects fast', async () => {
    const controller = new AbortController();
    await expect(
      withTimeout(
        Promise.reject(new Error('original error')),
        1000,
        controller,
      ),
    ).rejects.toThrow('original error');
    expect(controller.signal.aborted).toBe(false);
  });

  it('preserves the resolved value', async () => {
    const controller = new AbortController();
    const value = await withTimeout(Promise.resolve(42), 1000, controller);
    expect(value).toBe(42);
  });

  it('keeps controller alive when promise resolves', async () => {
    const controller = new AbortController();
    await withTimeout(Promise.resolve('ok'), 1000, controller);
    expect(controller.signal.aborted).toBe(false);
  });

  it('handles promise that resolves exactly at timeout edge', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fastEnough = new Promise<string>((resolve) => {
      setTimeout(() => resolve('just in time'), 50);
    });
    const resultPromise = withTimeout(fastEnough, 100, controller);
    vi.advanceTimersByTime(60);
    await expect(resultPromise).resolves.toBe('just in time');
    expect(controller.signal.aborted).toBe(false);
    vi.useRealTimers();
  });
});
