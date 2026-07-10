/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, sonarjs/no-duplicate-string -- Test files are less strict */
import * as SecureStore from 'expo-secure-store';

import axios from 'axios';

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
  mockAxios.interceptors = {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  };
  return {
    __esModule: true,
    default: mockAxios,
  };
});

// Since api exports the mocked instance, we can extract the response interceptor
const responseInterceptor = (api.interceptors.response.use as jest.Mock).mock
  .calls[0][1];

describe('API Interceptors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería reintentar la petición original si hay un refresh_token válido al recibir un 401', async () => {
    const originalRequest = {
      headers: {} as Record<string, string>,
      url: '/some-endpoint',
    };

    const axiosError = new Error('Request failed with status code 401') as any;
    axiosError.isAxiosError = true;
    axiosError.response = { status: 401 };
    axiosError.config = originalRequest;

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(
      'old_refresh_token',
    );

    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: { access: 'new_access', refresh: 'new_refresh' },
    });

    // Simulamos la llamada reintentada
    (api as unknown as jest.Mock).mockResolvedValueOnce({ data: 'success' });

    // Ejecutamos el interceptor de error
    const result = await responseInterceptor(axiosError);

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('refresh_token');
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/token/refresh/'),
      { refresh: 'old_refresh_token' },
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

    // Debería retornar el resultado del reintento
    expect(result).toEqual({ data: 'success' });
  });

  it('debería borrar los tokens si falla la solicitud de refresh tras un 401', async () => {
    const originalRequest = {
      headers: {} as Record<string, string>,
      url: '/some-endpoint',
    };

    const axiosError = new Error('Request failed with status code 401') as any;
    axiosError.isAxiosError = true;
    axiosError.response = { status: 401 };
    axiosError.config = originalRequest;

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(
      'old_refresh_token',
    );
    (axios.post as jest.Mock).mockRejectedValueOnce(
      new Error('Refresh failed'),
    );

    await expect(responseInterceptor(axiosError)).rejects.toThrow(
      'Request failed with status code 401',
    );

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
  });
});
