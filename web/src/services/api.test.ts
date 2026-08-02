import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockAxiosPost = vi.fn();
const mockInstancePost = vi.fn();
const mockInstanceGet = vi.fn();
const requestFns: Array<
  (config: Record<string, unknown>) => Record<string, unknown>
> = [];
const responseFns: Array<{
  onFulfilled: (response: unknown) => unknown;
  onRejected: (error: unknown) => unknown;
}> = [];

vi.mock('axios', () => {
  const handler = {
    apply(_target: unknown, _thisArg: unknown, args: unknown[]) {
      const config = args[0] as Record<string, unknown>;
      const method = (config.method as string) ?? 'get';
      if (method === 'post') return mockInstancePost(config);
      return mockInstanceGet(config);
    },
  };

  const instanceFn = new Proxy(function () {}, handler);

  const instance = Object.assign(instanceFn, {
    get: mockInstanceGet,
    post: mockInstancePost,
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn(
          (
            fn: (config: Record<string, unknown>) => Record<string, unknown>,
          ) => {
            requestFns.push(fn);
          },
        ),
      },
      response: {
        use: vi.fn(
          (
            onFulfilled: (response: unknown) => unknown,
            onRejected: (error: unknown) => unknown,
          ) => {
            responseFns.push({ onFulfilled, onRejected });
          },
        ),
      },
    },
  });

  return {
    default: {
      create: vi.fn(() => instance),
      post: mockAxiosPost,
    },
  };
});

const mockAxiosRetry = vi.fn();
const mockIsNetworkOrIdempotentRequestError = vi.fn(() => false);
vi.mock('axios-retry', () => {
  Object.assign(mockAxiosRetry, {
    isNetworkOrIdempotentRequestError: mockIsNetworkOrIdempotentRequestError,
    exponentialDelay: vi.fn(() => 1000),
  });
  return { default: mockAxiosRetry };
});

const mockRedirect = vi.fn();
vi.mock('./navigate', () => ({
  redirect: mockRedirect,
}));

describe('api.ts token interceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestFns.length = 0;
    responseFns.length = 0;
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  async function loadApi() {
    vi.resetModules();
    await import('./api');
    await new Promise((r) => setTimeout(r, 0));
  }

  it('attaches Bearer token to requests', async () => {
    localStorage.setItem('token', 'test-access-token');
    await loadApi();

    expect(requestFns.length).toBeGreaterThan(0);
    const config = requestFns[0]!({
      url: '/publicaciones/',
      headers: {} as Record<string, string>,
    });
    expect((config.headers as Record<string, string>).Authorization).toBe(
      'Bearer test-access-token',
    );
  });

  it('does not attach token to public endpoints', async () => {
    localStorage.setItem('token', 'test-access-token');
    await loadApi();

    const config = requestFns[0]!({
      url: '/token/',
      headers: {} as Record<string, string>,
    });
    expect(
      (config.headers as Record<string, string>).Authorization,
    ).toBeUndefined();
  });

  it('calls refresh endpoint on 401 and stores new tokens', async () => {
    sessionStorage.setItem('refresh_token', 'refresh-123');
    localStorage.setItem('token', 'old-token');
    await loadApi();

    expect(responseFns.length).toBeGreaterThan(0);
    const interceptor = responseFns[0]!;

    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: { Authorization: 'Bearer old-token' } as Record<
          string,
          string
        >,
        method: 'get',
      },
      response: { status: 401 },
    };

    mockAxiosPost.mockResolvedValueOnce({
      data: { access: 'new-token', refresh: 'new-refresh' },
    });
    mockInstanceGet.mockResolvedValueOnce({ data: { id: 1 } });

    await expect(interceptor.onRejected(error401)).resolves.toBeDefined();

    expect(mockAxiosPost).toHaveBeenCalledWith(
      expect.stringContaining('/token/refresh/'),
      { refresh: 'refresh-123' },
      { timeout: 10_000 },
    );
    expect(localStorage.getItem('token')).toBe('new-token');
    expect(sessionStorage.getItem('refresh_token')).toBe('new-refresh');
  });

  it('clears tokens and redirects to /login when refresh returns 4xx', async () => {
    localStorage.setItem('token', 'old-token');
    localStorage.setItem('user', 'some-user');
    sessionStorage.setItem('refresh_token', 'bad-refresh');
    await loadApi();

    const interceptor = responseFns[0]!;

    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: { Authorization: 'Bearer old-token' } as Record<
          string,
          string
        >,
        method: 'get',
      },
      response: { status: 401 },
    };

    const refreshError = Object.assign(new Error('refresh rejected'), {
      response: { status: 401, data: { detail: 'Token invalid' } },
    });
    mockAxiosPost.mockRejectedValueOnce(refreshError);

    await expect(interceptor.onRejected(error401)).rejects.toThrow();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(sessionStorage.getItem('refresh_token')).toBeNull();
    expect(mockRedirect).toHaveBeenCalledWith('/login', {
      from: expect.any(String),
    });
  });

  it('keeps tokens when refresh fails by network error (no logout)', async () => {
    localStorage.setItem('token', 'old-token');
    localStorage.setItem('user', 'some-user');
    sessionStorage.setItem('refresh_token', 'bad-refresh');
    await loadApi();

    const interceptor = responseFns[0]!;

    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: { Authorization: 'Bearer old-token' } as Record<
          string,
          string
        >,
        method: 'get',
      },
      response: { status: 401 },
    };

    mockAxiosPost.mockRejectedValueOnce(new Error('refresh failed'));

    await expect(interceptor.onRejected(error401)).rejects.toThrow();

    expect(localStorage.getItem('token')).toBe('old-token');
    expect(localStorage.getItem('user')).toBe('some-user');
    expect(sessionStorage.getItem('refresh_token')).toBe('bad-refresh');
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('passes through non-401 errors', async () => {
    await loadApi();
    const interceptor = responseFns[0]!;

    const error500 = {
      config: { url: '/publicaciones/' },
      response: { status: 500 },
    };

    await expect(interceptor.onRejected(error500)).rejects.toBe(error500);
  });

  it('does not redirect for /token/refresh/ 401s', async () => {
    localStorage.setItem('token', 'old-token');
    sessionStorage.setItem('refresh_token', 'bad-refresh');
    await loadApi();

    const interceptor = responseFns[0]!;

    const error401Refresh = {
      config: {
        url: '/token/refresh/',
        headers: { Authorization: 'Bearer old-token' } as Record<
          string,
          string
        >,
        method: 'post',
      },
      response: { status: 401 },
    };

    await expect(interceptor.onRejected(error401Refresh)).rejects.toThrow();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  // ── Security: token handling ──────────────────────────────

  it('SECURITY: does not store empty token', async () => {
    localStorage.setItem('token', '');
    await loadApi();

    const config = requestFns[0]!({
      url: '/publicaciones/',
      headers: {} as Record<string, string>,
    });
    expect(
      (config.headers as Record<string, string>).Authorization,
    ).toBeUndefined();
  });

  it('SECURITY: does not attach token to /auth/register/ endpoint', async () => {
    localStorage.setItem('token', 'test-token');
    await loadApi();

    const config = requestFns[0]!({
      url: '/auth/register/',
      headers: {} as Record<string, string>,
    });
    expect(
      (config.headers as Record<string, string>).Authorization,
    ).toBeUndefined();
  });

  it('SECURITY: clears ALL auth data when refresh rejects with 4xx', async () => {
    localStorage.setItem('token', 'old-token');
    localStorage.setItem('user', JSON.stringify({ id: 1 }));
    sessionStorage.setItem('refresh_token', 'bad-refresh');
    await loadApi();

    const interceptor = responseFns[0]!;
    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: { Authorization: 'Bearer old-token' } as Record<
          string,
          string
        >,
        method: 'get',
      },
      response: { status: 401 },
    };

    const refreshError = Object.assign(new Error('refresh rejected'), {
      response: { status: 401 },
    });
    mockAxiosPost.mockRejectedValueOnce(refreshError);

    await expect(interceptor.onRejected(error401)).rejects.toThrow();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(sessionStorage.getItem('refresh_token')).toBeNull();
  });

  it('SECURITY: stores new refresh token when backend rotates', async () => {
    sessionStorage.setItem('refresh_token', 'old-refresh');
    localStorage.setItem('token', 'old-token');
    await loadApi();

    const interceptor = responseFns[0]!;
    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: { Authorization: 'Bearer old-token' } as Record<
          string,
          string
        >,
        method: 'get',
      },
      response: { status: 401 },
    };

    mockAxiosPost.mockResolvedValueOnce({
      data: { access: 'new-access', refresh: 'new-refresh-token' },
    });
    mockInstanceGet.mockResolvedValueOnce({ data: { id: 1 } });

    await expect(interceptor.onRejected(error401)).resolves.toBeDefined();

    expect(sessionStorage.getItem('refresh_token')).toBe('new-refresh-token');
  });

  it('SECURITY: keeps old refresh token when backend does not rotate', async () => {
    sessionStorage.setItem('refresh_token', 'keep-this');
    localStorage.setItem('token', 'old-token');
    await loadApi();

    const interceptor = responseFns[0]!;
    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: { Authorization: 'Bearer old-token' } as Record<
          string,
          string
        >,
        method: 'get',
      },
      response: { status: 401 },
    };

    mockAxiosPost.mockResolvedValueOnce({
      data: { access: 'new-access' },
    });
    mockInstanceGet.mockResolvedValueOnce({ data: { id: 1 } });

    await expect(interceptor.onRejected(error401)).resolves.toBeDefined();

    expect(sessionStorage.getItem('refresh_token')).toBe('keep-this');
  });

  it('SECURITY: redirects to login when refresh fails with 4xx', async () => {
    localStorage.setItem('token', 'old-token');
    sessionStorage.setItem('refresh_token', 'bad-refresh');
    await loadApi();

    const interceptor = responseFns[0]!;
    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: { Authorization: 'Bearer old-token' } as Record<
          string,
          string
        >,
        method: 'get',
      },
      response: { status: 401 },
    };

    const refreshError = Object.assign(new Error('refresh rejected'), {
      response: { status: 401 },
    });
    mockAxiosPost.mockRejectedValueOnce(refreshError);

    await expect(interceptor.onRejected(error401)).rejects.toThrow();

    expect(mockRedirect).toHaveBeenCalledWith('/login', {
      from: expect.any(String),
    });
  });

  it('SECURITY: refresh timeout keeps the session (transient failure)', async () => {
    localStorage.setItem('token', 'old-token');
    sessionStorage.setItem('refresh_token', 'slow-refresh');
    await loadApi();

    const interceptor = responseFns[0]!;
    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: { Authorization: 'Bearer old-token' } as Record<
          string,
          string
        >,
        method: 'get',
      },
      response: { status: 401 },
    };

    mockAxiosPost.mockImplementation(
      () =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 100),
        ),
    );

    await expect(interceptor.onRejected(error401)).rejects.toThrow();

    expect(localStorage.getItem('token')).toBe('old-token');
    expect(sessionStorage.getItem('refresh_token')).toBe('slow-refresh');
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('SECURITY: handles missing refresh_token gracefully', async () => {
    localStorage.setItem('token', 'old-token');
    await loadApi();

    const interceptor = responseFns[0]!;
    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: { Authorization: 'Bearer old-token' } as Record<
          string,
          string
        >,
        method: 'get',
      },
      response: { status: 401 },
    };

    await expect(interceptor.onRejected(error401)).rejects.toThrow();

    expect(mockRedirect).toHaveBeenCalledWith('/login', {
      from: expect.any(String),
    });
  });

  // ── Error path: token refresh ────────────────────────────

  it('does not attempt refresh on 500 server error', async () => {
    localStorage.setItem('token', 'old-token');
    await loadApi();

    const interceptor = responseFns[0]!;
    const error500 = {
      config: {
        url: '/publicaciones/',
        headers: {} as Record<string, string>,
        method: 'get',
      },
      response: { status: 500, data: { detail: 'Server error' } },
    };

    await expect(interceptor.onRejected(error500)).rejects.toBe(error500);
    expect(mockAxiosPost).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('refresh fails with malformed response (no access field) — clears tokens and redirects', async () => {
    localStorage.setItem('token', 'old-token');
    localStorage.setItem('user', 'some-user');
    sessionStorage.setItem('refresh_token', 'refresh-123');
    await loadApi();

    const interceptor = responseFns[0]!;
    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: {} as Record<string, string>,
        method: 'get',
      },
      response: { status: 401 },
    };

    mockAxiosPost.mockResolvedValueOnce({ data: { refresh: 'new-refresh' } });
    mockInstanceGet.mockResolvedValue({ data: { id: 1 } });

    await expect(interceptor.onRejected(error401)).rejects.toThrow();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(sessionStorage.getItem('refresh_token')).toBeNull();
    expect(mockRedirect).toHaveBeenCalledWith('/login', {
      from: expect.any(String),
    });
  });

  it('multiple simultaneous 401 requests coalesce into one refresh', async () => {
    localStorage.setItem('token', 'old-token');
    sessionStorage.setItem('refresh_token', 'refresh-123');
    await loadApi();

    const interceptor = responseFns[0]!;
    let resolveRefresh!: (value: { data: { access: string } }) => void;
    mockAxiosPost.mockImplementationOnce(
      () =>
        new Promise<{ data: { access: string } }>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: {} as Record<string, string>,
        method: 'get',
      },
      response: { status: 401 },
    };

    const result1 = interceptor.onRejected({
      ...error401,
      config: { ...error401.config, url: '/publicaciones/1/' },
    });
    const result2 = interceptor.onRejected({
      ...error401,
      config: { ...error401.config, url: '/publicaciones/2/' },
    });

    expect(mockAxiosPost).toHaveBeenCalledTimes(1);

    mockInstanceGet.mockResolvedValue({ data: { id: 1 } });
    resolveRefresh({ data: { access: 'new-token' } });

    await expect(result1).resolves.toBeDefined();
    await expect(result2).resolves.toBeDefined();
    expect(localStorage.getItem('token')).toBe('new-token');
  });

  it('network error during token refresh (no response) keeps the session', async () => {
    localStorage.setItem('token', 'old-token');
    sessionStorage.setItem('refresh_token', 'refresh-123');
    await loadApi();

    const interceptor = responseFns[0]!;
    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: {} as Record<string, string>,
        method: 'get',
      },
      response: { status: 401 },
    };

    mockAxiosPost.mockRejectedValueOnce(new Error('Network Error'));

    await expect(interceptor.onRejected(error401)).rejects.toThrow();
    expect(localStorage.getItem('token')).toBe('old-token');
    expect(sessionStorage.getItem('refresh_token')).toBe('refresh-123');
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('clears tokens and redirects when refresh returns 400 (invalid request)', async () => {
    localStorage.setItem('token', 'old-token');
    localStorage.setItem('user', 'some-user');
    sessionStorage.setItem('refresh_token', 'bad-refresh');
    await loadApi();

    const interceptor = responseFns[0]!;
    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: {} as Record<string, string>,
        method: 'get',
      },
      response: { status: 401 },
    };

    mockAxiosPost.mockRejectedValueOnce(
      Object.assign(new Error('refresh rejected'), {
        response: { status: 400, data: { detail: 'Bad request' } },
      }),
    );

    await expect(interceptor.onRejected(error401)).rejects.toThrow();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(sessionStorage.getItem('refresh_token')).toBeNull();
    expect(mockRedirect).toHaveBeenCalledWith('/login', {
      from: expect.any(String),
    });
  });

  it('keeps the session when refresh returns 429 (throttled)', async () => {
    localStorage.setItem('token', 'old-token');
    localStorage.setItem('user', 'some-user');
    sessionStorage.setItem('refresh_token', 'refresh-123');
    await loadApi();

    const interceptor = responseFns[0]!;
    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: {} as Record<string, string>,
        method: 'get',
      },
      response: { status: 401 },
    };

    mockAxiosPost.mockRejectedValueOnce(
      Object.assign(new Error('Too Many Requests'), {
        response: { status: 429 },
      }),
    );

    await expect(interceptor.onRejected(error401)).rejects.toThrow();

    expect(localStorage.getItem('token')).toBe('old-token');
    expect(localStorage.getItem('user')).toBe('some-user');
    expect(sessionStorage.getItem('refresh_token')).toBe('refresh-123');
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('keeps the session when refresh returns 408 (proxy timeout)', async () => {
    localStorage.setItem('token', 'old-token');
    localStorage.setItem('user', 'some-user');
    sessionStorage.setItem('refresh_token', 'refresh-123');
    await loadApi();

    const interceptor = responseFns[0]!;
    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: {} as Record<string, string>,
        method: 'get',
      },
      response: { status: 401 },
    };

    mockAxiosPost.mockRejectedValueOnce(
      Object.assign(new Error('Request Timeout'), {
        response: { status: 408 },
      }),
    );

    await expect(interceptor.onRejected(error401)).rejects.toThrow();

    expect(localStorage.getItem('token')).toBe('old-token');
    expect(sessionStorage.getItem('refresh_token')).toBe('refresh-123');
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('rejects the triggering request with the transient refresh error, not the raw 401', async () => {
    localStorage.setItem('token', 'old-token');
    sessionStorage.setItem('refresh_token', 'refresh-123');
    await loadApi();

    const interceptor = responseFns[0]!;
    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: {} as Record<string, string>,
        method: 'get',
      },
      response: { status: 401 },
    };

    const refreshError = new Error('Network Error');
    mockAxiosPost.mockRejectedValueOnce(refreshError);

    await expect(interceptor.onRejected(error401)).rejects.toBe(refreshError);
    expect(localStorage.getItem('token')).toBe('old-token');
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('refresh endpoint returns 401 — redirects to login', async () => {
    localStorage.setItem('token', 'old-token');
    localStorage.setItem('user', 'some-user');
    sessionStorage.setItem('refresh_token', 'bad-refresh');
    await loadApi();

    const interceptor = responseFns[0]!;
    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: {} as Record<string, string>,
        method: 'get',
      },
      response: { status: 401 },
    };

    const refreshError = new Error('Unauthorized');
    Object.defineProperty(refreshError, 'response', {
      value: { status: 401, data: { detail: 'Token invalid' } },
    });
    mockAxiosPost.mockRejectedValueOnce(refreshError);

    await expect(interceptor.onRejected(error401)).rejects.toThrow();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(sessionStorage.getItem('refresh_token')).toBeNull();
    expect(mockRedirect).toHaveBeenCalledWith('/login', {
      from: expect.any(String),
    });
  });

  it('request queued before refresh completes retries with new token', async () => {
    localStorage.setItem('token', 'old-token');
    sessionStorage.setItem('refresh_token', 'refresh-123');
    await loadApi();

    const interceptor = responseFns[0]!;
    let resolveRefresh!: (value: { data: { access: string } }) => void;
    mockAxiosPost.mockImplementationOnce(
      () =>
        new Promise<{ data: { access: string } }>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: {} as Record<string, string>,
        method: 'get',
      },
      response: { status: 401 },
    };
    const queuedError = {
      config: {
        url: '/productos/',
        headers: {} as Record<string, string>,
        method: 'get',
      },
      response: { status: 401 },
    };

    const refreshResult = interceptor.onRejected(error401);
    const queuedResult = interceptor.onRejected(queuedError);

    expect(mockAxiosPost).toHaveBeenCalledTimes(1);

    mockInstanceGet.mockResolvedValue({ data: { ok: true } });
    resolveRefresh({ data: { access: 'new-token' } });

    await expect(refreshResult).resolves.toBeDefined();
    await expect(queuedResult).resolves.toBeDefined();
    expect(localStorage.getItem('token')).toBe('new-token');
  });

  it('concurrent refresh with one success and one queue failure', async () => {
    localStorage.setItem('token', 'old-token');
    sessionStorage.setItem('refresh_token', 'refresh-123');
    await loadApi();

    const interceptor = responseFns[0]!;
    let resolveRefresh!: (value: { data: { access: string } }) => void;
    mockAxiosPost.mockImplementationOnce(
      () =>
        new Promise<{ data: { access: string } }>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: {} as Record<string, string>,
        method: 'get',
      },
      response: { status: 401 },
    };

    const result1 = interceptor.onRejected(error401);
    const result2 = interceptor.onRejected({
      ...error401,
      config: { ...error401.config, url: '/productos/' },
    });

    mockInstanceGet.mockRejectedValueOnce(new Error('Server error'));
    mockInstanceGet.mockResolvedValueOnce({ data: { id: 1 } });
    resolveRefresh({ data: { access: 'new-token' } });

    await expect(result1).resolves.toBeDefined();
    await expect(result2).rejects.toThrow('Server error');
  });

  it('retry after refresh handles retry failure gracefully', async () => {
    localStorage.setItem('token', 'old-token');
    sessionStorage.setItem('refresh_token', 'refresh-123');
    await loadApi();

    const interceptor = responseFns[0]!;
    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: {} as Record<string, string>,
        method: 'get',
      },
      response: { status: 401 },
    };

    mockAxiosPost.mockResolvedValueOnce({ data: { access: 'new-token' } });
    const retry401 = Object.assign(new Error('Retry 401'), {
      response: { status: 401 },
      config: { url: '/publicaciones/', method: 'get', headers: {} },
    });
    mockInstanceGet.mockRejectedValueOnce(retry401);

    await expect(interceptor.onRejected(error401)).rejects.toThrow();
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith('/login', {
      from: expect.any(String),
    });
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('keeps the session when a post-refresh retry fails with 5xx and clears the marker', async () => {
    localStorage.setItem('token', 'old-token');
    sessionStorage.setItem('refresh_token', 'refresh-123');
    await loadApi();

    const interceptor = responseFns[0]!;
    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: { Authorization: 'Bearer old-token' } as Record<
          string,
          string
        >,
        method: 'get',
      },
      response: { status: 401 },
    };

    mockAxiosPost.mockResolvedValueOnce({ data: { access: 'new-token' } });

    let retriedConfig: Record<string, unknown> | undefined;
    mockInstanceGet.mockImplementationOnce((config) => {
      retriedConfig = config;
      const retry500 = Object.assign(new Error('Server error'), {
        response: { status: 500 },
        config,
      });
      return Promise.reject(retry500);
    });

    // Primer ciclo: refresh OK pero el reintento falla con 5xx (no-401). La
    // sesión se conserva: los tokens frescos no se borran ni hay redirect.
    await expect(interceptor.onRejected(error401)).rejects.toThrow(
      'Server error',
    );
    expect(localStorage.getItem('token')).toBe('new-token');
    expect(sessionStorage.getItem('refresh_token')).toBe('refresh-123');
    expect(mockRedirect).not.toHaveBeenCalled();

    // En el flujo real el fallo del reintento pasa por el interceptor, que
    // limpia el marcador de "ya reintentado"; un fallo no-401 no cierra sesión.
    await expect(
      interceptor.onRejected(
        Object.assign(new Error('Server error'), {
          config: retriedConfig,
          response: { status: 500 },
        }),
      ),
    ).rejects.toThrow('Server error');
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBe('new-token');

    // El marcador quedó limpio: un 401 posterior vuelve a refrescar.
    mockAxiosPost.mockResolvedValueOnce({ data: { access: 'token-2' } });
    mockInstanceGet.mockResolvedValueOnce({ data: { id: 2 } });
    await expect(interceptor.onRejected(error401)).resolves.toBeDefined();

    expect(mockAxiosPost).toHaveBeenCalledTimes(2);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('does not re-refresh when the retried request gets 401 again (breaks the loop)', async () => {
    localStorage.setItem('token', 'old-token');
    sessionStorage.setItem('refresh_token', 'refresh-123');
    await loadApi();

    const interceptor = responseFns[0]!;
    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: {} as Record<string, string>,
        method: 'get',
      },
      response: { status: 401 },
    };

    mockAxiosPost.mockResolvedValueOnce({ data: { access: 'new-token' } });

    let retriedConfig: Record<string, unknown> | undefined;
    mockInstanceGet.mockImplementationOnce((config) => {
      retriedConfig = config;
      const retry401 = {
        config,
        headers: { Authorization: 'Bearer new-token' } as Record<
          string,
          string
        >,
        method: 'get',
        response: { status: 401 },
      };
      return Promise.reject(retry401);
    });

    // Primer ciclo: refresh OK pero el reintento devuelve 401 otra vez.
    await expect(interceptor.onRejected(error401)).rejects.toThrow();

    // Simulamos que el 401 del reintento pasa de nuevo por el interceptor:
    // debe cerrar sesión y NO lanzar un segundo refresh.
    await expect(
      interceptor.onRejected({
        config: retriedConfig,
        response: { status: 401 },
      }),
    ).rejects.toThrow();

    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('refresh_token')).toBeNull();
    expect(mockRedirect).toHaveBeenCalledWith('/login', {
      from: expect.any(String),
    });
  });

  it('clears the refresh-retry marker after a successful retry so later 401s refresh again', async () => {
    localStorage.setItem('token', 'old-token');
    sessionStorage.setItem('refresh_token', 'refresh-123');
    await loadApi();

    const interceptor = responseFns[0]!;
    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: {} as Record<string, string>,
        method: 'get',
      },
      response: { status: 401 },
    };

    mockAxiosPost.mockResolvedValueOnce({ data: { access: 'new-token' } });
    mockInstanceGet.mockResolvedValueOnce({ data: { id: 1 } });

    await expect(interceptor.onRejected(error401)).resolves.toBeDefined();

    // El reintento con token fresco termina OK: el interceptor de éxito debe
    // limpiar el marcador, o un 401 futuro cerraría sesión en vez de refrescar.
    await responseFns[0]!.onFulfilled({
      config: error401.config,
      data: { id: 1 },
    });

    mockAxiosPost.mockResolvedValueOnce({ data: { access: 'token-2' } });
    mockInstanceGet.mockResolvedValueOnce({ data: { id: 2 } });

    await expect(interceptor.onRejected(error401)).resolves.toBeDefined();

    expect(mockAxiosPost).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('token')).toBe('token-2');
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('attaches token with special characters', async () => {
    localStorage.setItem('token', 'token-with-$pecial_chars!@#');
    await loadApi();

    const config = requestFns[0]!({
      url: '/publicaciones/',
      headers: {} as Record<string, string>,
    });
    expect((config.headers as Record<string, string>).Authorization).toBe(
      'Bearer token-with-$pecial_chars!@#',
    );
  });

  it('attaches very long token (>1000 chars)', async () => {
    const longToken = 'a'.repeat(1500);
    localStorage.setItem('token', longToken);
    await loadApi();

    const config = requestFns[0]!({
      url: '/publicaciones/',
      headers: {} as Record<string, string>,
    });
    expect((config.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${longToken}`,
    );
  });

  it('does not crash on malformed request URL', async () => {
    localStorage.setItem('token', 'test-token');
    await loadApi();

    const config = requestFns[0]!({
      url: undefined,
      headers: {} as Record<string, string>,
    });
    expect(config).toBeDefined();
    expect((config.headers as Record<string, string>).Authorization).toBe(
      'Bearer test-token',
    );
  });

  it('SECURITY: does not redirect when already on /login', async () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'location',
    );
    Object.defineProperty(window, 'location', {
      value: { pathname: '/login' },
      writable: true,
      configurable: true,
    });

    try {
      localStorage.setItem('token', 'old-token');
      // Sin refresh token: si el guard de /login fallara, el refresh lanzaría
      // un fallo fatal de autenticación y redirigiría; el test lo detectaría.
      sessionStorage.clear();
      await loadApi();

      const interceptor = responseFns[0]!;
      const error401 = {
        config: {
          url: '/publicaciones/',
          headers: { Authorization: 'Bearer old-token' } as Record<
            string,
            string
          >,
          method: 'get',
        },
        response: { status: 401 },
      };

      // En /login el 401 no dispara refresh ni redirección.
      await expect(interceptor.onRejected(error401)).rejects.toThrow();
      expect(mockAxiosPost).not.toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(window, 'location', originalDescriptor);
      }
    }
  });
});

describe('api.ts axios-retry retryCondition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function getRetryCondition() {
    vi.resetModules();
    await import('./api');
    await new Promise((r) => setTimeout(r, 0));
    const config = mockAxiosRetry.mock.calls[0]?.[1] as {
      retryCondition: (error: {
        config?: { method?: string; url?: string };
        response?: { status?: number };
        code?: string;
        name?: string;
      }) => boolean;
    };
    if (!config) throw new Error('axiosRetry not configured');
    return config.retryCondition;
  }

  it('does not retry POST on network error even when retry helper says yes', async () => {
    mockIsNetworkOrIdempotentRequestError.mockReturnValue(true);
    const retryCondition = await getRetryCondition();

    expect(retryCondition({ config: { method: 'post' } })).toBe(false);
  });

  it('does not retry PATCH on network error', async () => {
    mockIsNetworkOrIdempotentRequestError.mockReturnValue(true);
    const retryCondition = await getRetryCondition();

    expect(retryCondition({ config: { method: 'patch' } })).toBe(false);
  });

  it('retries GET on network error', async () => {
    mockIsNetworkOrIdempotentRequestError.mockReturnValue(true);
    const retryCondition = await getRetryCondition();

    expect(retryCondition({ config: { method: 'get' } })).toBe(true);
  });

  it('retries GET on 5xx server error', async () => {
    mockIsNetworkOrIdempotentRequestError.mockReturnValue(false);
    const retryCondition = await getRetryCondition();

    expect(
      retryCondition({ config: { method: 'get' }, response: { status: 503 } }),
    ).toBe(true);
  });

  it('does not retry POST on 5xx server error', async () => {
    mockIsNetworkOrIdempotentRequestError.mockReturnValue(false);
    const retryCondition = await getRetryCondition();

    expect(
      retryCondition({ config: { method: 'post' }, response: { status: 503 } }),
    ).toBe(false);
  });

  it('does not retry GET on 429 (throttled endpoint)', async () => {
    mockIsNetworkOrIdempotentRequestError.mockReturnValue(true);
    const retryCondition = await getRetryCondition();

    expect(
      retryCondition({
        config: { method: 'get', url: '/recolecciones/' },
        response: { status: 429 },
      }),
    ).toBe(false);
  });

  it('does not retry aborted requests (ERR_CANCELED / CanceledError)', async () => {
    mockIsNetworkOrIdempotentRequestError.mockReturnValue(true);
    const retryCondition = await getRetryCondition();

    expect(
      retryCondition({ config: { method: 'get' }, code: 'ERR_CANCELED' }),
    ).toBe(false);
    expect(
      retryCondition({ config: { method: 'get' }, name: 'CanceledError' }),
    ).toBe(false);
  });

  it('keeps retries available by renewing a stale window', async () => {
    const nowSpy = vi.spyOn(Date, 'now');
    mockIsNetworkOrIdempotentRequestError.mockReturnValue(true);
    const retryCondition = await getRetryCondition();
    const config = { method: 'get', url: '/recolecciones/' };

    nowSpy.mockReturnValue(1_000_000);
    expect(retryCondition({ config })).toBe(true); // arranca la ventana

    // Dentro de la ventana: reintenta normal.
    nowSpy.mockReturnValue(1_000_000 + 5_000);
    expect(retryCondition({ config })).toBe(true);

    // Ventana vencida: se renueva y la retryability se evalúa de inmediato
    // (el presupuesto real por dispatch lo acota `retries: 2` de axios-retry).
    nowSpy.mockReturnValue(1_000_000 + 11_000);
    expect(retryCondition({ config })).toBe(true);

    // La ventana renovada vuelve a contar desde el último fallo.
    nowSpy.mockReturnValue(1_000_000 + 16_000);
    expect(retryCondition({ config })).toBe(true);
  });

  it('keeps independent retry budgets per query params on the same URL', async () => {
    const nowSpy = vi.spyOn(Date, 'now');
    mockIsNetworkOrIdempotentRequestError.mockReturnValue(true);
    const retryCondition = await getRetryCondition();
    const pendientes = {
      method: 'get',
      url: '/recolecciones/',
      params: { estado: 'pendiente' },
    };
    const enRuta = {
      method: 'get',
      url: '/recolecciones/',
      params: { estado: 'en_ruta' },
    };

    nowSpy.mockReturnValue(1_000_000);
    // pendientes agota su propio tope (6 admitidos, corte en el 7º).
    for (let i = 0; i < 6; i += 1) {
      expect(retryCondition({ config: pendientes })).toBe(true);
    }
    expect(retryCondition({ config: pendientes })).toBe(false);

    // enRuta conserva un presupuesto independiente: con una clave compartida
    // (params fuera de retryKey) también estaría cortado en este punto.
    expect(retryCondition({ config: enRuta })).toBe(true);
  });

  it('clears the window entry after a successful response', async () => {
    const nowSpy = vi.spyOn(Date, 'now');
    mockIsNetworkOrIdempotentRequestError.mockReturnValue(true);
    const retryCondition = await getRetryCondition();
    const config = { method: 'get', url: '/recolecciones/' };

    nowSpy.mockReturnValue(1_000_000);
    expect(retryCondition({ config })).toBe(true);

    const onFulfilled = responseFns[responseFns.length - 1]!.onFulfilled;
    await onFulfilled({ config, data: {} });

    // Sin entrada, un error posterior arranca una ventana nueva.
    nowSpy.mockReturnValue(1_000_000 + 20_000);
    expect(retryCondition({ config })).toBe(true);
  });

  it('stops retrying the same request within a window and reopens on expiry', async () => {
    const nowSpy = vi.spyOn(Date, 'now');
    mockIsNetworkOrIdempotentRequestError.mockReturnValue(true);
    const retryCondition = await getRetryCondition();
    const config = { method: 'get', url: '/recolecciones/' };

    nowSpy.mockReturnValue(1_000_000);
    // Dentro de la ventana, el tope (RETRY_MAX_PER_WINDOW=6) admite el reintento.
    for (let i = 0; i < 6; i += 1) {
      expect(retryCondition({ config })).toBe(true);
    }
    // Sobre el tope, el mismo request deja de reintentarse hasta que venza.
    expect(retryCondition({ config })).toBe(false);

    // Exactamente en el límite (now - start === RETRY_WINDOW_MS) la ventana
    // sigue abierta — la comparación es estricta (`>`), así el tope se mantiene.
    nowSpy.mockReturnValue(1_000_000 + 10_000);
    expect(retryCondition({ config })).toBe(false);

    // Un ms después la ventana vence, se reabre y la retryability se evalúa.
    nowSpy.mockReturnValue(1_000_000 + 10_001);
    expect(retryCondition({ config })).toBe(true);
  });

  it('does not consume retry slots for failures that will not be retried', async () => {
    const nowSpy = vi.spyOn(Date, 'now');
    mockIsNetworkOrIdempotentRequestError.mockReturnValue(false);
    const retryCondition = await getRetryCondition();
    const config = { method: 'get', url: '/recolecciones/' };

    // Un 404 (no retryable) no debe abrir una ventana ni gastar slots: si lo
    // hiciera, un puñado de 404s acabaría cortando los reintentos del 5xx.
    nowSpy.mockReturnValue(1_000_000);
    for (let i = 0; i < 3; i += 1) {
      expect(retryCondition({ config, response: { status: 404 } })).toBe(false);
    }

    // El 5xx posterior arranca una ventana nueva con el tope completo.
    for (let i = 0; i < 6; i += 1) {
      expect(retryCondition({ config, response: { status: 503 } })).toBe(true);
    }
    expect(retryCondition({ config, response: { status: 503 } })).toBe(false);
  });

  it('does not consume retry slots for non-retryable failures inside an open window', async () => {
    const nowSpy = vi.spyOn(Date, 'now');
    mockIsNetworkOrIdempotentRequestError.mockReturnValue(false);
    const retryCondition = await getRetryCondition();
    const config = { method: 'get', url: '/recolecciones/' };

    // Un 503 abre la ventana (consume el primer slot).
    nowSpy.mockReturnValue(1_000_000);
    expect(retryCondition({ config, response: { status: 503 } })).toBe(true);

    // 404s no retryables DENTRO de la ventana no deben gastar slots: si lo
    // hicieran, los 503s posteriores cortarían antes de tiempo.
    nowSpy.mockReturnValue(1_000_000 + 1_000);
    for (let i = 0; i < 3; i += 1) {
      expect(retryCondition({ config, response: { status: 404 } })).toBe(false);
    }

    // El presupuesto sigue intacto: los 503s agotan el tope igual que si los
    // 404s no hubieran existido (5 trues tras el slot inicial, corte en el 6º).
    nowSpy.mockReturnValue(1_000_000 + 2_000);
    for (let i = 0; i < 5; i += 1) {
      expect(retryCondition({ config, response: { status: 503 } })).toBe(true);
    }
    expect(retryCondition({ config, response: { status: 503 } })).toBe(false);
  });
});
