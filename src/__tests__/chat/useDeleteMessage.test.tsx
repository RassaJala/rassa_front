/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';
import { Text, View } from 'react-native';

import { messagesKey } from '@rassa/chat';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import { useDeleteMessage } from '@/features/chat/hooks/useDeleteMessage';
import api from '@/services/api';

jest.mock('@/services/api');

const mockApiPatch = api.patch as jest.Mock;

describe('useDeleteMessage', () => {
  const existingMessages = {
    pages: [
      {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            conversacion: 1,
            remitente: 1,
            remitente_nombre: 'Test User',
            contenido: 'Hello',
            creado_en: new Date().toISOString(),
            leido: true,
            activo: true,
          },
        ],
      },
    ],
    pageParams: [1],
  };

  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(messagesKey(1), existingMessages);
  });

  const TestComponent = () => {
    const mutation = useDeleteMessage(1);
    return (
      <View>
        <Text testID="pending">{String(mutation.isPending)}</Text>
        <Text testID="error">{String(mutation.isError)}</Text>
        <Text testID="delete" onPress={() => mutation.mutate(1)}>
          Delete
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

  it('optimistically sets activo to false', async () => {
    mockApiPatch.mockResolvedValue({
      data: { ok: true, mensaje: 'Mensaje eliminado correctamente.' },
    });

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('delete').props.onPress();
    });

    const cached = queryClient.getQueryData<{
      pages: { results: { id: number; activo: boolean }[] }[];
    }>(messagesKey(1));

    const allMessages = cached?.pages.flatMap((p) => p.results) ?? [];
    const msg = allMessages.find((m) => m.id === 1);
    expect(msg?.activo).toBe(false);
  });

  it('calls PATCH /chat/mensajes/{id}/inactivar/', async () => {
    mockApiPatch.mockResolvedValue({
      data: { ok: true, mensaje: 'Mensaje eliminado correctamente.' },
    });

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('delete').props.onPress();
    });

    expect(mockApiPatch).toHaveBeenCalledWith('/chat/mensajes/1/inactivar/');
  });

  it('sets error state on failure', async () => {
    mockApiPatch.mockRejectedValue(new Error('Delete failed'));

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('delete').props.onPress();
    });

    await waitFor(() => {
      expect(getByTestId('error').props.children).toBe('true');
    });
  });
});
