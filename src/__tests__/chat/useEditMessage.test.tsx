/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';
import { Text, View } from 'react-native';

import { messagesKey } from '@rassa/chat';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import { useEditMessage } from '@/features/chat/hooks/useEditMessage';
import api from '@/services/api';

jest.mock('@/services/api');

const mockApiPatch = api.patch as jest.Mock;

describe('useEditMessage', () => {
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
            contenido: 'Original',
            creado_en: new Date().toISOString(),
            leido: true,
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
    const mutation = useEditMessage(1);
    return (
      <View>
        <Text testID="pending">{String(mutation.isPending)}</Text>
        <Text testID="error">{String(mutation.isError)}</Text>
        <Text
          testID="edit"
          onPress={() =>
            mutation.mutate({ messageId: 1, contenido: 'Updated' })
          }
        >
          Edit
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

  it('optimistically updates message content', async () => {
    mockApiPatch.mockResolvedValue({
      data: {
        ok: true,
        data: {
          id_mensaje: 1,
          emisor: { id_usuario: 1, nombre_completo: 'Test User' },
          contenido: 'Updated',
          leido: true,
          editado: true,
          creado_en: '',
        },
      },
    });

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('edit').props.onPress();
    });

    const cached = queryClient.getQueryData<{
      pages: {
        results: { id: number; contenido: string; editado: boolean }[];
      }[];
    }>(messagesKey(1));

    const allMessages = cached?.pages.flatMap((p) => p.results) ?? [];
    const edited = allMessages.find((m) => m.id === 1);
    expect(edited?.contenido).toBe('Updated');
    expect(edited?.editado).toBe(true);
  });

  it('calls PATCH with correct URL and payload', async () => {
    mockApiPatch.mockResolvedValue({
      data: {
        ok: true,
        data: {
          id_mensaje: 1,
          emisor: { id_usuario: 1, nombre_completo: 'Test User' },
          contenido: 'Updated',
          leido: true,
          editado: true,
          creado_en: '',
        },
      },
    });

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('edit').props.onPress();
    });

    expect(mockApiPatch).toHaveBeenCalledWith('/chat/mensajes/1/editar/', {
      contenido: 'Updated',
    });
  });

  it('sets error state on failure', async () => {
    mockApiPatch.mockRejectedValue(new Error('Edit failed'));

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('edit').props.onPress();
    });

    await waitFor(() => {
      expect(getByTestId('error').props.children).toBe('true');
    });
  });
});
