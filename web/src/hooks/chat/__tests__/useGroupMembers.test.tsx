import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { useGroupMembers } from '../useGroupMembers';
import { chatApi } from '~/services/chat';

vi.mock('~/services/chat', () => ({
  chatApi: { getGroupMembers: vi.fn() },
}));

const mockGetGroupMembers = chatApi.getGroupMembers as ReturnType<typeof vi.fn>;

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useGroupMembers', () => {
  let queryClient: QueryClient;

  const mockMembers = [
    { id: 1, nombre: 'Alice', rol: '', avatar: null },
    { id: 2, nombre: 'Bob', rol: '', avatar: null },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
      },
    });
  });

  it('calls chatApi.getGroupMembers on mount', async () => {
    mockGetGroupMembers.mockResolvedValue(mockMembers);

    function TestComponent() {
      const { data } = useGroupMembers(1);
      return <span data-testid="count">{data?.length ?? 0}</span>;
    }

    const { getByTestId } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(mockGetGroupMembers).toHaveBeenCalledWith(1);
      expect(getByTestId('count').textContent).toBe('2');
    });
  });

  it('handles API errors', async () => {
    mockGetGroupMembers.mockRejectedValueOnce(new Error('Failed'));

    function TestComponent() {
      const { error } = useGroupMembers(1);
      return <span data-testid="error">{error?.message ?? ''}</span>;
    }

    const { getByTestId } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(getByTestId('error').textContent).toBe('Failed');
    });
  });

  it('returns empty array when no members', async () => {
    mockGetGroupMembers.mockResolvedValue([]);

    function TestComponent() {
      const { data } = useGroupMembers(1);
      return <span data-testid="count">{data?.length ?? 0}</span>;
    }

    const { getByTestId } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('0');
    });
  });
});
