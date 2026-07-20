/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';
import { Text, View } from 'react-native';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import { useChatMessages } from '@/features/chat/hooks/useChatMessages';
import api from '@/services/api';

jest.mock('@/services/api');

const mockApiGet = api.get as jest.Mock;

describe('useChatMessages', () => {
  const page1 = {
    data: {
      data: {
        count: 3,
        next: 'http://api/chat/conversaciones/1/mensajes/?page=2',
        previous: null,
        results: [
          {
            id_mensaje: 1,
            emisor: { id_usuario: 1, nombre_completo: 'A' },
            contenido: 'Msg 1',
            leido: true,
            editado: false,
            creado_en: '2026-01-01T00:00:00Z',
          },
        ],
      },
    },
  };

  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
    mockApiGet.mockResolvedValue(page1);
  });

  const TestComponent = ({
    conversationId = 1,
  }: {
    conversationId?: number;
  }) => {
    const { data, isLoading, hasNextPage } = useChatMessages(conversationId);
    const messages = data?.pages.flatMap((p) => p.results) ?? [];
    return (
      <View>
        <Text testID="loading">{String(isLoading)}</Text>
        <Text testID="count">{String(messages.length)}</Text>
        <Text testID="hasNextPage">{String(hasNextPage)}</Text>
      </View>
    );
  };

  const renderHook = (conversationId = 1) =>
    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent conversationId={conversationId} />
      </QueryClientProvider>,
    );

  it('fetches first page of messages on mount', async () => {
    renderHook();

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith(
        '/chat/conversaciones/1/mensajes/?page=1',
      );
    });
  });

  it('returns messages from first page', async () => {
    const { getByTestId } = renderHook();

    await waitFor(() => {
      expect(getByTestId('count').props.children).toBe('1');
    });
  });

  it('has next page when API returns a next URL', async () => {
    const { getByTestId } = renderHook();

    await waitFor(() => {
      expect(getByTestId('hasNextPage').props.children).toBe('true');
    });
  });

  it('shows loading state initially', () => {
    const { getByTestId } = renderHook();

    expect(getByTestId('loading').props.children).toBe('true');
  });
});
