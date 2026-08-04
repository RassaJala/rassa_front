/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useFarmers } from '@/hooks/useFarmers';
import { fetchFarmers } from '@/services/settlements';

jest.mock('@/services/settlements', () => ({
  fetchFarmers: jest.fn(),
}));

const mockFetchFarmers = fetchFarmers as jest.Mock;

const farmers = [
  {
    id_usuario: 4,
    nombre: 'Ana Ramírez',
  },
];

function wrapper({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useFarmers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the fetched active agricultores', async () => {
    mockFetchFarmers.mockResolvedValue(farmers);

    const { result } = renderHook(() => useFarmers(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.farmers).toHaveLength(1);
    expect(result.current.farmers[0]?.id_usuario).toBe(4);
    expect(result.current.farmers[0]?.nombre).toBe('Ana Ramírez');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('reports error and keeps an empty list when the fetch fails', async () => {
    mockFetchFarmers.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useFarmers(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.farmers).toEqual([]);
  });
});
