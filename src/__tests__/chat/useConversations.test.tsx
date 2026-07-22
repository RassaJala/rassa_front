/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';
import { Text, View } from 'react-native';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import { useConversations } from '@/features/chat/hooks/useConversations';
import api from '@/services/api';

jest.mock('@/services/api');
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: () => true,
}));

const mockApiGet = api.get as jest.Mock;

describe('useConversations', () => {
  const mockConversations = {
    data: {
      ok: true,
      data: [
        {
          id_conversacion: 1,
          tipo: false,
          nombre: 'Chat 1',
          ultimo_mensaje: 'Hola',
          ultimo_mensaje_creado_en: '2026-01-01',
          no_leidos: 2,
          es_familia: false,
        },
        {
          id_conversacion: 2,
          tipo: false,
          nombre: 'Chat 2',
          ultimo_mensaje: 'Adios',
          ultimo_mensaje_creado_en: '2026-01-02',
          no_leidos: 0,
          es_familia: false,
        },
      ],
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
    mockApiGet.mockResolvedValue(mockConversations);
  });

  const TestComponent = () => {
    const { data, isLoading, error } = useConversations();
    return (
      <View>
        <Text testID="loading">{String(isLoading)}</Text>
        <Text testID="count">{String(data?.results.length ?? 0)}</Text>
        <Text testID="error">{error?.message ?? ''}</Text>
      </View>
    );
  };

  const renderHook = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>,
    );

  it('fetches conversations on mount', async () => {
    renderHook();

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/chat/usuarios/conversaciones/');
    });
  });

  it('returns mapped conversation data after fetch', async () => {
    const { getByTestId } = renderHook();

    await waitFor(() => {
      expect(getByTestId('count').props.children).toBe('2');
    });
  });

  it('shows loading state initially', () => {
    const { getByTestId } = renderHook();

    expect(getByTestId('loading').props.children).toBe('true');
  });

  it('handles API errors', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('Network error'));

    const { getByTestId } = renderHook();

    await waitFor(() => {
      expect(getByTestId('error').props.children).toBe('Network error');
    });
  });
});
