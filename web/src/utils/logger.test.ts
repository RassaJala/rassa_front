import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  vi.stubEnv('DEV', true);
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
    expect(console.error).toHaveBeenCalledWith('[test]', expect.any(Error), {
      userId: 42,
      role: 'admin',
    });
  });

  it('handles string error', () => {
    logError('ctx', 'something broke');
    expect(console.error).toHaveBeenCalledWith('[ctx]', 'something broke', '');
  });

  it('handles null error', () => {
    logError('ctx', null);
    expect(console.error).toHaveBeenCalledWith('[ctx]', null, '');
  });

  it('handles undefined error', () => {
    logError('ctx', undefined);
    expect(console.error).toHaveBeenCalledWith('[ctx]', undefined, '');
  });

  it('handles error with extra as empty object', () => {
    logError('ctx', new Error('fail'), {});
    expect(console.error).toHaveBeenCalledWith('[ctx]', expect.any(Error), {});
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

describe('logError production path', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('sanitizes axios errors so the JWT never reaches the console', async () => {
    vi.stubEnv('DEV', false);
    vi.resetModules();
    const { logError: prodLogError } = await import('./logger');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const axiosError = new Error('Request failed');
    Object.defineProperty(axiosError, 'isAxiosError', { value: true });
    Object.defineProperty(axiosError, 'config', {
      value: {
        url: '/recolecciones/',
        method: 'get',
        headers: { Authorization: 'Bearer SUPER-SECRET-TOKEN' },
      },
    });
    Object.defineProperty(axiosError, 'response', {
      value: { status: 500, config: { url: '/recolecciones/', method: 'get' } },
    });

    prodLogError('ctx', axiosError);

    const serialized = JSON.stringify(warnSpy.mock.calls);
    expect(serialized).not.toContain('SUPER-SECRET-TOKEN');
    expect(warnSpy.mock.calls[0]?.[1]).toEqual({
      message: 'Request failed',
      status: 500,
      method: 'get',
      url: '/recolecciones/',
    });
  });

  it('falls back to the raw error for non-axios errors in production', async () => {
    vi.stubEnv('DEV', false);
    vi.resetModules();
    const { logError: prodLogError } = await import('./logger');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    prodLogError('ctx', new Error('boom'));

    expect(warnSpy.mock.calls[0]?.[1]).toBeInstanceOf(Error);
  });

  it('redacts sensitive keys in the extra context in production', async () => {
    vi.stubEnv('DEV', false);
    vi.resetModules();
    const { logError: prodLogError } = await import('./logger');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    prodLogError('ctx', new Error('boom'), {
      userId: 42,
      token: 'JWT-SECRET',
      Authorization: 'Bearer secret',
      refresh: 'refresh-rotado',
      url: '/recolecciones/',
    });

    expect(warnSpy.mock.calls[0]?.[2]).toEqual({
      userId: 42,
      token: '[redacted]',
      Authorization: '[redacted]',
      refresh: '[redacted]',
      url: '/recolecciones/',
    });
    const serialized = JSON.stringify(warnSpy.mock.calls);
    expect(serialized).not.toContain('JWT-SECRET');
    expect(serialized).not.toContain('refresh-rotado');
  });

  it('redacts sensitive keys nested inside the extra context in production', async () => {
    vi.stubEnv('DEV', false);
    vi.resetModules();
    const { logError: prodLogError } = await import('./logger');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    prodLogError('ctx', new Error('boom'), {
      params: { token: 'NESTED-SECRET', page: 2 },
      headers: [{ authorization: 'Bearer anidado' }],
      response: { refresh_token: 'anidado-2' },
    });

    expect(warnSpy.mock.calls[0]?.[2]).toEqual({
      params: { token: '[redacted]', page: 2 },
      headers: [{ authorization: '[redacted]' }],
      response: { refresh_token: '[redacted]' },
    });
    const serialized = JSON.stringify(warnSpy.mock.calls);
    expect(serialized).not.toContain('NESTED-SECRET');
    expect(serialized).not.toContain('anidado-2');
  });
});
