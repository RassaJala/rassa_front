/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useSubmitNewUser } from '@/hooks/useSubmitNewUser';
import api from '@/services/api';

jest.mock('@/services/api');
const mockedApi = api as jest.Mocked<typeof api>;

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return {
    ...actual,
    isAxiosError: (err: any) =>
      !!(err && (err.isAxiosError || actual.isAxiosError(err))),
  };
});

describe('useSubmitNewUser hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
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

  // ── Validation ────────────────────────────────────────────────────────────

  it('validates form before submitting and sets errorMessage if invalid', async () => {
    const { result } = renderSubmitHook();

    const invalidForm = mockForm({ email: '' });

    await act(async () => {
      await result.current.submit(invalidForm);
    });

    expect(result.current.errorMessage).toBeTruthy();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('sets errorMessage when apellidoPaterno is empty', async () => {
    const { result } = renderSubmitHook();

    await act(async () => {
      await result.current.submit(mockForm({ apellidoPaterno: '' }));
    });

    expect(result.current.errorMessage).toBe(
      'Por favor, completa todos los campos obligatorios.',
    );
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('sets errorMessage when telefono is empty', async () => {
    const { result } = renderSubmitHook();

    await act(async () => {
      await result.current.submit(mockForm({ telefono: '' }));
    });

    expect(result.current.errorMessage).toBe(
      'Por favor, completa todos los campos obligatorios.',
    );
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('sets errorMessage when localidadId is null', async () => {
    const { result } = renderSubmitHook();

    await act(async () => {
      await result.current.submit(mockForm({ catalog: { localidadId: null } }));
    });

    expect(result.current.errorMessage).toBe(
      'Por favor, completa todos los campos obligatorios.',
    );
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('clears previous errors before a new submit attempt', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { id: 1 } });
    const { result } = renderSubmitHook();

    // First submit sets an error
    await act(async () => {
      await result.current.submit(mockForm({ email: '' }));
    });
    expect(result.current.errorMessage).toBeTruthy();

    // Second submit with valid data must clear the error
    await act(async () => {
      await result.current.submit(mockForm());
    });
    await waitFor(() => {
      expect(result.current.errorMessage).toBeNull();
    });
  });

  // ── Double-submit guard ───────────────────────────────────────────────────

  it('blocks double-submit: API is only called once when submit is triggered twice simultaneously', async () => {
    let resolvePost!: () => void;
    mockedApi.post.mockReturnValueOnce(
      new Promise<any>((res) => {
        resolvePost = () => res({ data: { id: 1 } });
      }),
    );

    const { result } = renderSubmitHook();
    const validForm = mockForm();

    // Fire two submits without awaiting the first
    await act(async () => {
      void result.current.submit(validForm);
      void result.current.submit(validForm);
    });

    resolvePost();

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledTimes(1);
    });
  });

  // ── Success path ─────────────────────────────────────────────────────────

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

  it('calls /auth/create-farmer/ endpoint when role is farmer', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { id: 2 } });
    const onSuccess = jest.fn();

    const { result } = renderSubmitHook({ onSuccess });

    await act(async () => {
      await result.current.submit(mockForm({ role: 'farmer' }));
    });

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/auth/create-farmer/',
        expect.objectContaining({ role: 'farmer' }),
        { timeout: 10000 },
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('invalidates admin-users query on success', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { id: 1 } });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderSubmitHook();

    await act(async () => {
      await result.current.submit(mockForm());
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['admin-users'] }),
      );
    });
  });

  it('uses custom submitFn when provided instead of api.post', async () => {
    const customSubmitFn = jest.fn().mockResolvedValueOnce({ id: 99 });
    const onSuccess = jest.fn();

    const { result } = renderSubmitHook({
      onSuccess,
      submitFn: customSubmitFn,
    });

    await act(async () => {
      await result.current.submit(mockForm());
    });

    await waitFor(() => {
      expect(customSubmitFn).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' }),
      );
      expect(mockedApi.post).not.toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  // ── Error path ────────────────────────────────────────────────────────────

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

  it('calls onError callback with the parsed error message', async () => {
    mockedApi.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 400,
        data: { detail: 'Datos de registro inválidos' },
      },
    });
    const onError = jest.fn();

    const { result } = renderSubmitHook({ onError });

    await act(async () => {
      await result.current.submit(mockForm());
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Datos de registro inválidos');
      expect(result.current.serverError).toBe('Datos de registro inválidos');
    });
  });

  it('falls back to generic error message when API response has no detail', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('Network Error'));

    const { result } = renderSubmitHook();

    await act(async () => {
      await result.current.submit(mockForm());
    });

    await waitFor(() => {
      expect(result.current.serverError).toBeTruthy();
    });
  });
});
