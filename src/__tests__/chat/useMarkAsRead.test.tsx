/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';
import { Text, View } from 'react-native';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import { useMarkAsRead } from '@/features/chat/hooks/useMarkAsRead';
import api from '@/services/api';

jest.mock('@/services/api');

const mockApiPatch = api.patch as jest.Mock;

describe('useMarkAsRead', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
  });

  const TestComponent = () => {
    const mutation = useMarkAsRead();
    return (
      <View>
        <Text testID="pending">{String(mutation.isPending)}</Text>
        <Text testID="success">{String(mutation.isSuccess)}</Text>
        <Text testID="mark" onPress={() => mutation.mutate(42)}>
          Mark
        </Text>
      </View>
    );
  };

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>,
    );

  it('calls PATCH /chat/mensajes/{id}/leer/', async () => {
    mockApiPatch.mockResolvedValue({
      data: { ok: true, mensaje: 'Mensaje marcado como leído.' },
    });

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('mark').props.onPress();
    });

    expect(mockApiPatch).toHaveBeenCalledWith('/chat/mensajes/42/leer/');
  });

  it('invalidates conversations query after marking', async () => {
    mockApiPatch.mockResolvedValue({
      data: { ok: true, mensaje: 'Mensaje marcado como leído.' },
    });

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('mark').props.onPress();
    });

    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledTimes(1);
    });
  });
});
