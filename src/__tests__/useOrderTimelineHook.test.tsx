import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useOrderTimeline } from '@/hooks/useOrderTimeline';
import api from '@/services/api';

jest.mock('@/services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('useOrderTimeline hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  function renderTimelineHook(orderId: number) {
    return renderHook(() => useOrderTimeline(orderId), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });
  }

  it('returns empty array when orderId <= 0 without fetching', () => {
    const { result } = renderTimelineHook(0);
    expect(result.current.entries).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(mockedApi.get).not.toHaveBeenCalled();
  });

  it('returns array data when API returns direct array', async () => {
    const mockData = [
      {
        id_historial: 1,
        estado_anterior: null,
        estado_nuevo: 'pendiente',
        creado_en: '2025-06-15T10:30:00Z',
        cambiado_por_nombre: 'Admin',
      },
    ];
    mockedApi.get.mockResolvedValueOnce({ data: mockData });

    const { result } = renderTimelineHook(10);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.entries).toEqual(mockData);
  });

  it('handles wrapped data responses gracefully', async () => {
    const mockData = [
      {
        id_historial: 2,
        estado_anterior: 'pendiente',
        estado_nuevo: 'confirmado',
        creado_en: '2025-06-15T11:00:00Z',
        cambiado_por_nombre: null,
      },
    ];
    mockedApi.get.mockResolvedValueOnce({ data: { data: mockData } });

    const { result } = renderTimelineHook(10);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.entries).toEqual(mockData);
  });

  it('returns [] fallback when API returns unexpected object shape', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { unknownKey: 'invalid' } });

    const { result } = renderTimelineHook(10);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.entries).toEqual([]);
  });
});
