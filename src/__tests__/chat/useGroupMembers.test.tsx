import React from 'react';
import { Text, View } from 'react-native';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import { useGroupMembers } from '@/features/chat/hooks/useGroupMembers';
import api from '@/services/api';

jest.mock('@/services/api');

const mockApiGet = api.get as jest.Mock;

describe('useGroupMembers', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  const TestComponent = ({ conversationId }: { conversationId: number }) => {
    const { data, isLoading, error } = useGroupMembers(conversationId);
    return (
      <View>
        <Text testID="loading">{String(isLoading)}</Text>
        <Text testID="error">{error?.message ?? 'null'}</Text>
        <Text testID="count">{String(data?.length ?? 0)}</Text>
        {data?.map((m) => (
          <Text key={m.id} testID={`member-${m.id}`}>
            {m.nombre}
          </Text>
        ))}
      </View>
    );
  };

  const renderComponent = (conversationId = 1) =>
    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent conversationId={conversationId} />
      </QueryClientProvider>,
    );

  it('fetches group members successfully', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        data: [
          {
            id_miembro: 1,
            id_usuario: 10,
            nombre_completo: 'Alice',
            correo: 'alice@test.com',
            creado_en: '2026-01-01T00:00:00Z',
          },
          {
            id_miembro: 2,
            id_usuario: 11,
            nombre_completo: 'Bob',
            correo: 'bob@test.com',
            creado_en: '2026-01-01T00:00:00Z',
          },
        ],
      },
    });

    const { getByTestId } = renderComponent();

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
    });

    expect(getByTestId('count').props.children).toBe('2');
    expect(getByTestId('member-1').props.children).toBe('Alice');
    expect(getByTestId('member-2').props.children).toBe('Bob');
  });

  it('calls the correct API endpoint', async () => {
    mockApiGet.mockResolvedValue({ data: { data: [] } });

    renderComponent(42);

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith(
        '/chat/conversaciones/42/integrantes/',
      );
    });
  });

  it('handles error state', async () => {
    mockApiGet.mockRejectedValue(new Error('Network error'));

    const { getByTestId } = renderComponent();

    await waitFor(() => {
      expect(getByTestId('error').props.children).toBe('Network error');
    });
  });
});
