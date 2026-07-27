/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useSubmitNewUser } from '@/hooks/useSubmitNewUser';
import api from '@/services/api';

jest.mock('@/services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('useSubmitNewUser hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  function renderSubmitHook(options?: any) {
    return renderHook(() => useSubmitNewUser(options), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });
  }

  function mockForm(overrides = {}): any {
    return {
      email: 'test@example.com',
      password: 'password123',
      telefono: '5551234567',
      role: 'buyer',
      nombre: 'Juan',
      apellidoPaterno: 'Perez',
      apellidoMaterno: 'Lopez',
      fechaNacimiento: '1990-01-01',
      sexo: 'M',
      domicilio: 'Calle Falsa 123',
      catalog: { localidadId: 10 },
      ...overrides,
    };
  }

  it('validates form before submitting and sets errorMessage if invalid', async () => {
    const { result } = renderSubmitHook();

    const invalidForm = mockForm({ email: '' });

    await act(async () => {
      await result.current.submit(invalidForm);
    });

    expect(result.current.errorMessage).toBeTruthy();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('calls API and triggers onSuccess callback', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { id: 1 } });
    const onSuccess = jest.fn();

    const { result } = renderSubmitHook({ onSuccess });

    const validForm = mockForm();

    await act(async () => {
      await result.current.submit(validForm);
    });

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/auth/register/',
        expect.objectContaining({
          email: 'test@example.com',
          role: 'buyer',
        }),
        { timeout: 10000 },
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('handles API error safely using parseApiError', async () => {
    mockedApi.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409, data: { detail: 'El correo ya existe' } },
    });

    const { result } = renderSubmitHook();

    const validForm = mockForm();

    await act(async () => {
      await result.current.submit(validForm);
    });

    await waitFor(() => {
      expect(result.current.serverError).toBe('El correo ya existe');
    });
  });
});
