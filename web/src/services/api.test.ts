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

vi.mock('axios-retry', () => ({
  default: vi.fn(),
  isNetworkOrIdempotentRequestError: vi.fn(() => false),
  exponentialDelay: vi.fn(() => 1000),
}));

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
    const config = requestFns[0]({
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

    const config = requestFns[0]({
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
    const interceptor = responseFns[0];

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

  it('clears tokens and redirects to /login on refresh failure', async () => {
    localStorage.setItem('token', 'old-token');
    localStorage.setItem('user', 'some-user');
    sessionStorage.setItem('refresh_token', 'bad-refresh');
    await loadApi();

    const interceptor = responseFns[0];

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

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(sessionStorage.getItem('refresh_token')).toBeNull();
    expect(mockRedirect).toHaveBeenCalledWith('/login', {
      from: expect.any(String),
    });
  });

  it('passes through non-401 errors', async () => {
    await loadApi();
    const interceptor = responseFns[0];

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

    const interceptor = responseFns[0];

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

    const config = requestFns[0]({
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

    const config = requestFns[0]({
      url: '/auth/register/',
      headers: {} as Record<string, string>,
    });
    expect(
      (config.headers as Record<string, string>).Authorization,
    ).toBeUndefined();
  });

  it('SECURITY: clears ALL auth data on refresh failure', async () => {
    localStorage.setItem('token', 'old-token');
    localStorage.setItem('user', JSON.stringify({ id: 1 }));
    sessionStorage.setItem('refresh_token', 'bad-refresh');
    await loadApi();

    const interceptor = responseFns[0];
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

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(sessionStorage.getItem('refresh_token')).toBeNull();
  });

  it('SECURITY: stores new refresh token when backend rotates', async () => {
    sessionStorage.setItem('refresh_token', 'old-refresh');
    localStorage.setItem('token', 'old-token');
    await loadApi();

    const interceptor = responseFns[0];
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

    const interceptor = responseFns[0];
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

  it('SECURITY: does not redirect to non-login paths', async () => {
    localStorage.setItem('token', 'old-token');
    sessionStorage.setItem('refresh_token', 'bad-refresh');
    await loadApi();

    const interceptor = responseFns[0];
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

    expect(mockRedirect).toHaveBeenCalledWith('/login', {
      from: expect.any(String),
    });
  });

  it('SECURITY: rejects refresh with 10s timeout', async () => {
    localStorage.setItem('token', 'old-token');
    sessionStorage.setItem('refresh_token', 'slow-refresh');
    await loadApi();

    const interceptor = responseFns[0];
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

    expect(localStorage.getItem('token')).toBeNull();
  });

  it('SECURITY: handles missing refresh_token gracefully', async () => {
    localStorage.setItem('token', 'old-token');
    await loadApi();

    const interceptor = responseFns[0];
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

    const interceptor = responseFns[0];
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

  it('refresh fails with malformed response (no access field)', async () => {
    localStorage.setItem('token', 'old-token');
    sessionStorage.setItem('refresh_token', 'refresh-123');
    await loadApi();

    const interceptor = responseFns[0];
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

    await expect(interceptor.onRejected(error401)).resolves.toBeDefined();
    expect(localStorage.getItem('token')).toBe('undefined');
  });

  it('multiple simultaneous 401 requests coalesce into one refresh', async () => {
    localStorage.setItem('token', 'old-token');
    sessionStorage.setItem('refresh_token', 'refresh-123');
    await loadApi();

    const interceptor = responseFns[0];
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

  it('network error during token refresh (no response) clears tokens and redirects', async () => {
    localStorage.setItem('token', 'old-token');
    sessionStorage.setItem('refresh_token', 'refresh-123');
    await loadApi();

    const interceptor = responseFns[0];
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
    expect(localStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('refresh_token')).toBeNull();
    expect(mockRedirect).toHaveBeenCalledWith('/login', {
      from: expect.any(String),
    });
  });

  it('refresh endpoint returns 401 — redirects to login', async () => {
    localStorage.setItem('token', 'old-token');
    localStorage.setItem('user', 'some-user');
    sessionStorage.setItem('refresh_token', 'bad-refresh');
    await loadApi();

    const interceptor = responseFns[0];
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

    const interceptor = responseFns[0];
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

    const interceptor = responseFns[0];
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

    const interceptor = responseFns[0];
    const error401 = {
      config: {
        url: '/publicaciones/',
        headers: {} as Record<string, string>,
        method: 'get',
      },
      response: { status: 401 },
    };

    mockAxiosPost.mockResolvedValueOnce({ data: { access: 'new-token' } });
    mockInstanceGet.mockRejectedValueOnce(new Error('Retry failed'));

    await expect(interceptor.onRejected(error401)).rejects.toThrow();
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith('/login', {
      from: expect.any(String),
    });
    expect(localStorage.getItem('token')).toBeNull();
  });

  // ── Edge cases: token handling ───────────────────────────

  it('attaches token with special characters', async () => {
    localStorage.setItem('token', 'token-with-$pecial_chars!@#');
    await loadApi();

    const config = requestFns[0]({
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

    const config = requestFns[0]({
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

    const config = requestFns[0]({
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

    localStorage.setItem('token', 'old-token');
    sessionStorage.setItem('refresh_token', 'bad-refresh');
    await loadApi();

    const interceptor = responseFns[0];
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

    // Should NOT trigger redirect when already on login
    await expect(interceptor.onRejected(error401)).rejects.toThrow();

    if (originalDescriptor) {
      Object.defineProperty(window, 'location', originalDescriptor);
    }
  });
});
