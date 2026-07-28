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
});
