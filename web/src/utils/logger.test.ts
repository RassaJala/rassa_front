import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  vi.stubEnv('DEV', 'true');
});

import { logError } from './logger';

describe('logError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls console.error in dev mode', () => {
    logError('test-context', new Error('fail'));
    expect(console.error).toHaveBeenCalledWith(
      '[test-context]',
      expect.any(Error),
      '',
    );
  });

  it('includes extra context in console.error call', () => {
    logError('test', new Error('fail'), { userId: 42, role: 'admin' });
    expect(console.error).toHaveBeenCalledWith(
      '[test]',
      expect.any(Error),
      { userId: 42, role: 'admin' },
    );
  });

  it('handles string error', () => {
    logError('ctx', 'something broke');
    expect(console.error).toHaveBeenCalledWith(
      '[ctx]',
      'something broke',
      '',
    );
  });

  it('handles null error', () => {
    logError('ctx', null);
    expect(console.error).toHaveBeenCalledWith(
      '[ctx]',
      null,
      '',
    );
  });

  it('handles undefined error', () => {
    logError('ctx', undefined);
    expect(console.error).toHaveBeenCalledWith(
      '[ctx]',
      undefined,
      '',
    );
  });

  it('handles error with extra as empty object', () => {
    logError('ctx', new Error('fail'), {});
    expect(console.error).toHaveBeenCalledWith(
      '[ctx]',
      expect.any(Error),
      {},
    );
  });

  it('works with different context strings', () => {
    logError('persistItems', new Error('err1'));
    logError('upsertItems', new Error('err2'));
    expect(console.error).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalledWith(
      '[persistItems]',
      expect.any(Error),
      '',
    );
    expect(console.error).toHaveBeenCalledWith(
      '[upsertItems]',
      expect.any(Error),
      '',
    );
  });
});
