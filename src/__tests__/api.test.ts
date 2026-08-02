/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, sonarjs/no-duplicate-string -- Test files are less strict */
import * as SecureStore from 'expo-secure-store';

import api from '../services/api';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('axios-retry', () => jest.fn());

jest.mock('axios', () => {
  const mockAxios = jest.fn() as any;
  mockAxios.create = jest.fn(() => mockAxios);
  mockAxios.post = jest.fn();
  mockAxios.isAxiosError = jest.fn((err: any) => err?.isAxiosError === true);
  mockAxios.interceptors = {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  };
  return {
    __esModule: true,
    default: mockAxios,
  };
});

// Extract the response error interceptor from the mock calls
const responseInterceptor = (api.interceptors.response.use as jest.Mock).mock
  .calls[0][1];
// Extract the request interceptor too
const requestInterceptor = (api.interceptors.request.use as jest.Mock).mock
  .calls[0][0];

function makeAxiosError(status: number | undefined, config: any): any {
  const err = new Error(
    status ? `Request failed with status code ${status}` : 'Network Error',
  ) as any;
  err.isAxiosError = true;
  err.response = status ? { status, data: {} } : undefined;
  err.config = config;
  return err;
}

describe('API Interceptors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reintenta la petición original si hay refresh_token válido al recibir un 401', async () => {
    const originalRequest = {
      headers: {} as Record<string, string>,
      url: '/some-endpoint',
    };

    const axiosError = makeAxiosError(401, originalRequest);

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(
      'old_refresh_token',
    );
    (api.post as jest.Mock).mockResolvedValueOnce({
      data: { access: 'new_access', refresh: 'new_refresh' },
    });
    // Mock the retried request
    (api as unknown as jest.Mock).mockResolvedValueOnce({ data: 'success' });

    const result = await responseInterceptor(axiosError);

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('refresh_token');
    expect(api.post).toHaveBeenCalledWith(
      '/token/refresh/',
      expect.objectContaining({ refresh: 'old_refresh_token' }),
      expect.anything(),
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'access_token',
      'new_access',
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'refresh_token',
      'new_refresh',
    );
    expect(originalRequest.headers.Authorization).toBe('Bearer new_access');
    expect(result).toEqual({ data: 'success' });
  });

  it('borra los tokens si falla la solicitud de refresh tras un 401', async () => {
    const originalRequest = {
      headers: {} as Record<string, string>,
      url: '/some-endpoint',
    };
    const axiosError = makeAxiosError(401, originalRequest);

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(
      'old_refresh_token',
    );
    (api.post as jest.Mock).mockRejectedValueOnce(new Error('Refresh failed'));

    await expect(responseInterceptor(axiosError)).rejects.toThrow(
      'Request failed with status code 401',
    );

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
  });

  it('pasa errores no-401 sin cambios', async () => {
    const originalRequest = { headers: {}, url: '/some-endpoint' };
    const axiosError = makeAxiosError(403, originalRequest);

    await expect(responseInterceptor(axiosError)).rejects.toThrow(
      'Request failed with status code 403',
    );

    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('limpia tokens en 401 en /token/ (login) sin reintentar', async () => {
    const originalRequest = { headers: {}, url: '/token/' };
    const axiosError = makeAxiosError(401, originalRequest);

    await expect(responseInterceptor(axiosError)).rejects.toThrow(
      'Request failed with status code 401',
    );

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
  });

  it('limpia tokens en 401 si no hay refresh_token', async () => {
    const originalRequest = { headers: {}, url: '/some-endpoint' };
    const axiosError = makeAxiosError(401, originalRequest);

    // getItemAsync returns null for refresh_token
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

    await expect(responseInterceptor(axiosError)).rejects.toThrow(
      'Request failed with status code 401',
    );

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
  });

  it('adjunta token en el request interceptor si existe', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('valid_token');

    const config = { headers: {} } as any;
    const result = await requestInterceptor(config);

    expect(result.headers.Authorization).toBe('Bearer valid_token');
    expect(result).toBe(config);
  });

  it('no adjunta token si getItemAsync falla', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(
      new Error('Storage error'),
    );

    const config = { headers: {} } as any;
    const result = await requestInterceptor(config);

    expect(result.headers.Authorization).toBeUndefined();
    expect(result).toBe(config);
  });

  it('coalesce 401s concurrentes en un solo refresh (single-flight, B2)', async () => {
    const req1 = { headers: {} as Record<string, string>, url: '/endpoint-1' };
    const req2 = { headers: {} as Record<string, string>, url: '/endpoint-2' };
    const err1 = makeAxiosError(401, req1);
    const err2 = makeAxiosError(401, req2);

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('refresh_token');
    (api.post as jest.Mock).mockResolvedValueOnce({
      data: { access: 'new_token', refresh: 'new_refresh' },
    });
    (api as unknown as jest.Mock).mockResolvedValue({ data: 'ok' });

    await Promise.all([responseInterceptor(err1), responseInterceptor(err2)]);

    // Single flight: refreshTokens called exactly once
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith(
      '/token/refresh/',
      expect.objectContaining({ refresh: 'refresh_token' }),
      expect.anything(),
    );

    // Both original requests retried with the new token
    expect(api).toHaveBeenCalledTimes(2);
    expect(req1.headers.Authorization).toBe('Bearer new_token');
    expect(req2.headers.Authorization).toBe('Bearer new_token');
  });

  it('no limpia tokens si el refresh funciona pero la repetición falla (B10)', async () => {
    const originalRequest = { headers: {}, url: '/some-endpoint' };
    const axiosError = makeAxiosError(401, originalRequest);

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(
      'old_refresh_token',
    );
    (api.post as jest.Mock).mockResolvedValueOnce({
      data: { access: 'new_access', refresh: 'new_refresh' },
    });
    const retryError = makeAxiosError(403, originalRequest);
    (api as unknown as jest.Mock).mockRejectedValueOnce(retryError);

    await expect(responseInterceptor(axiosError)).rejects.toThrow(
      'Request failed with status code 403',
    );

    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});
