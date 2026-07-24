import React, { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

const mockGet = jest.fn();
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

jest.mock('axios', () => ({
  isAxiosError: (error: unknown) => (error as Record<string, unknown>)?.isAxiosError === true,
}));

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({ colorScheme: 'light' }),
}));

import { useOrderTimeline } from '../useOrderTimeline';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

describe('useOrderTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns loading state initially', () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useOrderTimeline(1), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.entries).toEqual([]);
  });

  it('returns entries from a flat array response', async () => {
    const data = [{ id_historial: 1, estado_nuevo: 'pendiente', creado_en: '2025-01-01T00:00:00Z', estado_anterior: null, cambiado_por_nombre: null }];
    mockGet.mockResolvedValue({ data });

    const { result } = renderHook(() => useOrderTimeline(1), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.entries).toEqual(data);
  });

  it('returns entries from wrapped { data: [...] } response', async () => {
    const entries = [{ id_historial: 1, estado_nuevo: 'pendiente', creado_en: '2025-01-01T00:00:00Z', estado_anterior: null, cambiado_por_nombre: null }];
    mockGet.mockResolvedValue({ data: { data: entries } });

    const { result } = renderHook(() => useOrderTimeline(1), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.entries).toEqual(entries);
  });

  it('returns empty array for null data', async () => {
    mockGet.mockResolvedValue({ data: { data: null } });

    const { result } = renderHook(() => useOrderTimeline(1), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.entries).toEqual([]);
  });

  it('does not fetch for invalid orderId', () => {
    const { result } = renderHook(() => useOrderTimeline(0), {
      wrapper: createWrapper(),
    });
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.entries).toEqual([]);
  });

  it('returns error state when API fails', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useOrderTimeline(1), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    expect(result.current.entries).toEqual([]);
  }, 10000);
});
