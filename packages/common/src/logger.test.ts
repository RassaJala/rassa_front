import { describeError, redactSensitive, redactUrlQueryParams } from './logger';

describe('describeError', () => {
  it('reduces an axios error to {message, status, method, url} without headers', () => {
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

    expect(describeError(axiosError)).toEqual({
      message: 'Request failed',
      status: 400,
      method: 'post',
      url: '/mermas/',
    });
  });

  it('returns the raw value unchanged when it is not axios-shaped', () => {
    const error = new Error('boom');
    expect(describeError(error)).toBe(error);
    expect(describeError('string error')).toBe('string error');
    expect(describeError(null)).toBeNull();
    expect(describeError(undefined)).toBeUndefined();
  });

  it('redacts sensitive query params from the url', () => {
    const axiosError = new Error('Request failed');
    Object.assign(axiosError, {
      isAxiosError: true,
      config: {
        url: '/mermas/?apikey=SECRET-API-KEY&page=2',
        method: 'get',
        headers: { Authorization: 'Bearer SUPER-SECRET-TOKEN' },
      },
      response: {
        status: 400,
        config: {
          url: '/mermas/?apikey=SECRET-API-KEY&page=2',
          method: 'get',
        },
      },
    });

    expect(describeError(axiosError)).toEqual({
      message: 'Request failed',
      status: 400,
      method: 'get',
      url: '/mermas/?apikey=[redacted]&page=2',
    });
  });
});

describe('redactUrlQueryParams', () => {
  it('leaves URLs without a query unchanged', () => {
    expect(redactUrlQueryParams('/mermas/')).toBe('/mermas/');
  });

  it('redacts sensitive query values and preserves the fragment', () => {
    expect(redactUrlQueryParams('/mermas/?token=abc#section')).toBe(
      '/mermas/?token=[redacted]#section',
    );
  });

  it('matches query keys case-insensitively', () => {
    expect(redactUrlQueryParams('/?APIKey=secret&x=1')).toBe(
      '/?APIKey=[redacted]&x=1',
    );
  });
});

describe('redactSensitive', () => {
  it('redacts credential-looking keys at the top level', () => {
    expect(
      redactSensitive({
        userId: 42,
        token: 'JWT-SECRET',
        Authorization: 'Bearer secret',
        refresh: 'refresh-rotado',
        url: '/mermas/',
      }),
    ).toEqual({
      userId: 42,
      token: '[redacted]',
      Authorization: '[redacted]',
      refresh: '[redacted]',
      url: '/mermas/',
    });
  });

  it('redacts sensitive keys nested inside objects and arrays', () => {
    expect(
      redactSensitive({
        params: { token: 'NESTED-SECRET', page: 2 },
        headers: [{ authorization: 'Bearer anidado' }],
        response: { refresh_token: 'anidado-2' },
      }),
    ).toEqual({
      params: { token: '[redacted]', page: 2 },
      headers: [{ authorization: '[redacted]' }],
      response: { refresh_token: '[redacted]' },
    });
  });

  it('caps recursion depth so cyclic structures cannot hang the logger', () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(redactSensitive({ a: { b: { c: { d: cyclic } } } })).toEqual({
      a: { b: { c: { d: '[objeto]' } } },
    });
  });
});
