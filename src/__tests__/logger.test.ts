import { logError } from '@/utils/logger';

describe('logError (mobile)', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('describes axios errors so the JWT never reaches the console', () => {
    const axiosError = new Error('Request failed');
    Object.assign(axiosError, {
      isAxiosError: true,
      config: {
        url: '/mermas/',
        method: 'post',
        headers: { Authorization: 'Bearer SUPER-SECRET-TOKEN' },
      },
      response: {
        status: 400,
        config: { url: '/mermas/', method: 'post' },
      },
    });

    logError('WasteRegister', axiosError);

    const serialized = JSON.stringify(consoleErrorSpy.mock.calls);
    expect(serialized).not.toContain('SUPER-SECRET-TOKEN');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[WasteRegister]',
      {
        message: 'Request failed',
        status: 400,
        method: 'post',
        url: '/mermas/',
      },
      {},
    );
  });

  it('passes non-axios errors through unchanged', () => {
    const error = new Error('boom');
    logError('ctx', error);
    expect(consoleErrorSpy).toHaveBeenCalledWith('[ctx]', error, {});
  });

  it('handles string, null and undefined errors', () => {
    logError('ctx', 'something broke');
    logError('ctx', null);
    logError('ctx', undefined);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
  });

  it('redacts sensitive keys from the extra context', () => {
    logError('ctx', new Error('boom'), {
      userId: 42,
      token: 'JWT-SECRET',
      Authorization: 'Bearer secret',
      refresh: 'refresh-rotado',
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('[ctx]', expect.any(Error), {
      userId: 42,
      token: '[redacted]',
      Authorization: '[redacted]',
      refresh: '[redacted]',
    });
    const serialized = JSON.stringify(consoleErrorSpy.mock.calls);
    expect(serialized).not.toContain('JWT-SECRET');
    expect(serialized).not.toContain('refresh-rotado');
  });

  it('redacts sensitive keys nested inside the extra context', () => {
    logError('ctx', new Error('boom'), {
      params: { token: 'NESTED-SECRET', page: 2 },
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('[ctx]', expect.any(Error), {
      params: { token: '[redacted]', page: 2 },
    });
    const serialized = JSON.stringify(consoleErrorSpy.mock.calls);
    expect(serialized).not.toContain('NESTED-SECRET');
  });
});
