/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';
import { Text, View } from 'react-native';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import { useCreatePrivateConversation } from '@/features/chat/hooks/useCreatePrivateConversation';
import api from '@/services/api';

jest.mock('@/services/api');

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockApiPost = api.post as jest.Mock;
const mockApiGet = api.get as jest.Mock;

describe('useCreatePrivateConversation', () => {
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
    const mutation = useCreatePrivateConversation();
    return (
      <View>
        <Text
          testID="create"
          onPress={() => mutation.mutate({ fk_usuario: 5 })}
        >
          Create
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

  it('navigates to Chat with tipo and isFamily on success', async () => {
    mockApiPost.mockResolvedValue({
      data: { ok: true, data: { id_conversacion: 7 } },
    });
    mockApiGet.mockResolvedValue({
      data: {
        ok: true,
        data: [
          {
            id_conversacion: 7,
            tipo: false,
            nombre: 'Juan',
            ultimo_mensaje: null,
            ultimo_mensaje_creado_en: null,
            no_leidos: 0,
            es_familia: false,
          },
        ],
      },
    });

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('create').props.onPress();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Chat', {
        conversationId: 7,
        title: 'Juan',
        tipo: 'privada',
        isFamily: false,
      });
    });
  });

  it('falls back to "Chat" title when participant name is empty', async () => {
    mockApiPost.mockResolvedValue({
      data: { ok: true, data: { id_conversacion: 9 } },
    });
    mockApiGet.mockResolvedValue({
      data: { ok: true, data: [] },
    });

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('create').props.onPress();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Chat', {
        conversationId: 9,
        title: 'Chat',
        tipo: 'privada',
        isFamily: false,
      });
    });
  });
});
