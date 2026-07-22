/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';
import { Text, View } from 'react-native';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import { useSendMessage } from '@/features/chat/hooks/useSendMessage';
import api from '@/services/api';

jest.mock('@/services/api');
jest.mock('@/store/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, nombre: 'Test User' },
  }),
}));

const mockApiPost = api.post as jest.Mock;

// Helper: backend _ok wrapper for sendMessage response
const backendMessage = (id: number, contenido: string) => ({
  data: {
    ok: true,
    data: {
      id_mensaje: id,
      emisor: { id_usuario: 1, nombre_completo: 'Test User' },
      contenido,
      leido: false,
      editado: false,
      creado_en: '',
    },
  },
});

describe('useSendMessage', () => {
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
            remitente: 2,
            remitente_nombre: 'Other',
            contenido: 'Existing',
            creado_en: '2026-01-01T00:00:00Z',
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
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(['messages', 1], existingMessages);
  });

  const TestComponent = () => {
    const mutation = useSendMessage(1);
    return (
      <View>
        <Text testID="pending">{String(mutation.isPending)}</Text>
        <Text
          testID="send"
          onPress={() =>
            mutation.mutate({ conversacion: 1, contenido: 'Hello!' })
          }
        >
          Send
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

  it('adds optimistic message immediately on mutate', async () => {
    mockApiPost.mockResolvedValue(backendMessage(100, 'Hello!'));

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('send').props.onPress();
    });

    const cached = queryClient.getQueryData<{
      pages: { results: { id: number; contenido: string }[] }[];
    }>(['messages', 1]);

    const allMessages = cached?.pages.flatMap((p) => p.results) ?? [];
    expect(allMessages.some((m) => m.contenido === 'Hello!')).toBe(true);
  });

  it('calls API with correct payload', async () => {
    mockApiPost.mockResolvedValue(backendMessage(100, 'Hello!'));

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('send').props.onPress();
    });

    expect(mockApiPost).toHaveBeenCalledWith('/chat/mensajes/enviar/', {
      fk_conversacion: 1,
      contenido: 'Hello!',
    });
  });

  it('replaces optimistic id with server id on success', async () => {
    mockApiPost.mockResolvedValue(backendMessage(100, 'Hello!'));

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('send').props.onPress();
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<{
        pages: { results: { id: number; contenido: string }[] }[];
      }>(['messages', 1]);
      const allMessages = cached?.pages.flatMap((p) => p.results) ?? [];
      const hello = allMessages.find((m) => m.contenido === 'Hello!');
      expect(hello).toBeDefined();
      expect(hello?.id).toBe(100);
    });
  });

  it('rolls back on error', async () => {
    mockApiPost.mockRejectedValue(new Error('Send failed'));

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('send').props.onPress();
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<{
        pages: { results: { id: number; contenido: string }[] }[];
      }>(['messages', 1]);
      const allMessages = cached?.pages.flatMap((p) => p.results) ?? [];
      expect(allMessages.some((m) => m.contenido === 'Hello!')).toBe(false);
    });
  });
});
