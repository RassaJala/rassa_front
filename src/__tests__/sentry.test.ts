import { sanitizeSentryError, sentryBeforeSend } from '@/services/sentry';

// An axios-shaped error as it reaches the sanitizer: config.headers carries
// the JWT Authorization header, request.headers carries it plus cookies, and
// response.config.headers holds the same shared config reference. On React
// Native the request also carries the XHR polyfill shape: the outgoing
// headers in the own enumerable `_headers` property (axios writes every
// config header there via setRequestHeader) and the received ones in
// `_lowerCaseResponseHeaders` and `responseHeaders`.
function makeAxiosError(): Record<string, unknown> {
  return {
    isAxiosError: true,
    message: 'Network Error',
    code: 'ERR_NETWORK',
    config: {
      headers: {
        Authorization: 'Bearer secret-token',
        'Content-Type': 'application/json',
      },
      url: '/pedidos/',
    },
    request: {
      headers: {
        Authorization: 'Bearer secret-token',
        cookie: 'session=abc123',
      },
      _headers: {
        authorization: 'Bearer secret-token',
        'set-cookie': 'session=abc123',
        'content-type': 'application/json',
      },
      _lowerCaseResponseHeaders: {
        'set-cookie': 'sid=xyz',
        'content-type': 'application/json',
      },
      responseHeaders: {
        'set-cookie': 'csrftoken=csrf-secret',
        'content-type': 'application/json',
      },
    },
    response: {
      status: 500,
      headers: {
        'Set-Cookie': 'sid=xyz',
        'Content-Type': 'application/json',
      },
      config: { headers: { Authorization: 'Bearer secret-token' } },
      data: { detail: 'boom' },
    },
  };
}

describe('sanitizeSentryError', () => {
  it('pasa errores no-axios sin modificar (misma referencia)', () => {
    const err = new Error('boom');

    expect(sanitizeSentryError(err)).toBe(err);
  });

  it('pasa valores no-objeto sin modificar', () => {
    expect(sanitizeSentryError('boom')).toBe('boom');
    expect(sanitizeSentryError(42)).toBe(42);
    expect(sanitizeSentryError(null)).toBe(null);
  });

  it('elimina Authorization del config del clon y conserva los headers seguros', () => {
    const error = makeAxiosError();

    const sanitized = sanitizeSentryError(error) as Record<string, unknown>;
    const config = sanitized.config as Record<string, unknown>;
    const configHeaders = config.headers as Record<string, unknown>;

    expect(configHeaders.Authorization).toBeUndefined();
    expect(configHeaders['Content-Type']).toBe('application/json');
    // The sanitized config is a fresh object, not the original reference.
    expect(sanitized.config).not.toBe(error.config);
    // The original error keeps its token for local handling.
    expect(
      (
        (error.config as Record<string, unknown>).headers as Record<
          string,
          unknown
        >
      ).Authorization,
    ).toBe('Bearer secret-token');
  });

  it('elimina Authorization de response.config.headers y Set-Cookie de response.headers', () => {
    const error = makeAxiosError();

    const sanitized = sanitizeSentryError(error) as Record<string, unknown>;
    const response = sanitized.response as Record<string, unknown>;
    const responseConfigHeaders = (response.config as Record<string, unknown>)
      .headers as Record<string, unknown>;
    const responseHeaders = response.headers as Record<string, unknown>;

    expect(responseConfigHeaders.Authorization).toBeUndefined();
    expect(responseHeaders['Set-Cookie']).toBeUndefined();
    expect(responseHeaders['Content-Type']).toBe('application/json');
    // The sanitized response is a fresh object, not the original reference.
    expect(sanitized.response).not.toBe(error.response);
  });

  it('elimina cookie y Authorization de request.headers', () => {
    const sanitized = sanitizeSentryError(makeAxiosError()) as Record<
      string,
      unknown
    >;
    const request = sanitized.request as Record<string, unknown>;
    const requestHeaders = request.headers as Record<string, unknown>;

    expect(requestHeaders.cookie).toBeUndefined();
    expect(requestHeaders.Authorization).toBeUndefined();
  });

  it('elimina el JWT y set-cookie de _headers y _lowerCaseResponseHeaders (forma real del XHR de RN)', () => {
    const sanitized = sanitizeSentryError(makeAxiosError()) as Record<
      string,
      unknown
    >;
    const request = sanitized.request as Record<string, unknown>;
    const xhrHeaders = request._headers as Record<string, unknown>;
    const lowerCaseResponseHeaders =
      request._lowerCaseResponseHeaders as Record<string, unknown>;

    expect(xhrHeaders.authorization).toBeUndefined();
    expect(xhrHeaders['set-cookie']).toBeUndefined();
    expect(xhrHeaders['content-type']).toBe('application/json');
    expect(lowerCaseResponseHeaders['set-cookie']).toBeUndefined();
    expect(lowerCaseResponseHeaders['content-type']).toBe('application/json');
  });

  it('elimina Set-Cookie de responseHeaders (XHR) y conserva los headers seguros sin mutar el original', () => {
    const error = makeAxiosError();

    const sanitized = sanitizeSentryError(error) as Record<string, unknown>;
    const request = sanitized.request as Record<string, unknown>;
    const responseHeaders = request.responseHeaders as Record<string, unknown>;

    expect(responseHeaders['set-cookie']).toBeUndefined();
    expect(responseHeaders['Set-Cookie']).toBeUndefined();
    expect(responseHeaders['content-type']).toBe('application/json');
    // The sanitized request is a fresh object, not the original reference.
    expect(sanitized.request).not.toBe(error.request);
    // The original error keeps its response headers for local handling.
    const originalResponseHeaders = (error.request as Record<string, unknown>)
      .responseHeaders as Record<string, unknown>;
    expect(originalResponseHeaders['set-cookie']).toBe('csrftoken=csrf-secret');
  });

  it('compara claves sensibles sin distinguir mayúsculas/minúsculas', () => {
    const error = {
      isAxiosError: true,
      config: {
        headers: {
          authorization: 'Bearer lower',
          COOKIE: 'a=b',
          'Set-Cookie': 'sid=x',
          'Proxy-Authorization': 'Basic abc',
          'X-Api-Key': 'keep-me',
        },
      },
    };

    const sanitized = sanitizeSentryError(error) as Record<string, unknown>;
    const headers = (sanitized.config as Record<string, unknown>)
      .headers as Record<string, unknown>;

    expect(headers.authorization).toBeUndefined();
    expect(headers.COOKIE).toBeUndefined();
    expect(headers['Set-Cookie']).toBeUndefined();
    expect(headers['Proxy-Authorization']).toBeUndefined();
    expect(headers['X-Api-Key']).toBe('keep-me');
  });

  it('no muta el error original (config, request y response quedan intactos)', () => {
    const error = makeAxiosError();

    sanitizeSentryError(error);

    const originalConfigHeaders = (error.config as Record<string, unknown>)
      .headers as Record<string, unknown>;
    expect(originalConfigHeaders.Authorization).toBe('Bearer secret-token');
    const originalRequestHeaders = (error.request as Record<string, unknown>)
      .headers as Record<string, unknown>;
    expect(originalRequestHeaders.cookie).toBe('session=abc123');
    const originalRequestXhrHeaders = (error.request as Record<string, unknown>)
      ._headers as Record<string, unknown>;
    expect(originalRequestXhrHeaders.authorization).toBe('Bearer secret-token');
    const originalResponse = error.response as Record<string, unknown>;
    expect(
      (
        (originalResponse.config as Record<string, unknown>).headers as Record<
          string,
          unknown
        >
      ).Authorization,
    ).toBe('Bearer secret-token');
    expect(
      (originalResponse.headers as Record<string, unknown>)['Set-Cookie'],
    ).toBe('sid=xyz');
  });
});

describe('sentryBeforeSend', () => {
  it('elimina headers sensibles del evento con comparación case-insensitive', () => {
    const event = {
      request: {
        headers: {
          Authorization: 'Bearer x',
          cookie: 'a=b',
          Accept: 'application/json',
        },
      },
    };

    const result = sentryBeforeSend(event, {});

    expect(result).toBe(event);
    expect(event.request.headers.Authorization).toBeUndefined();
    expect(event.request.headers.cookie).toBeUndefined();
    expect(event.request.headers.Accept).toBe('application/json');
  });

  it('devuelve el evento sin cambios cuando no trae request.headers', () => {
    const event = { extra: { a: 1 } };

    expect(sentryBeforeSend(event, {})).toBe(event);
  });
});
