import React from 'react';
import { Text, View } from 'react-native';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import { useCreateGroup } from '@/features/chat/hooks/useCreateGroup';
import api from '@/services/api';

jest.mock('@/services/api');
jest.mock('@/store/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, nombre: 'Test User', role: 'admin' },
  }),
}));
jest.mock('@react-navigation/native', () => {
  const mockNav = { navigate: jest.fn() };
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => mockNav,
  };
});

const mockApiPost = api.post as jest.Mock;

describe('useCreateGroup', () => {
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
    const mutation = useCreateGroup();
    return (
      <View>
        <Text testID="pending">{String(mutation.isPending)}</Text>
        <Text
          testID="create"
          onPress={() =>
            mutation.mutate({ nombre: 'Test Group', fk_usuarios: [1, 2] })
          }
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

  it('calls API with correct payload', async () => {
    mockApiPost.mockResolvedValue({
      data: {
        ok: true,
        data: { id_conversacion: 1 },
      },
    });

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('create').props.onPress();
    });

    expect(mockApiPost).toHaveBeenCalledWith(
      '/chat/conversaciones/crear-grupal/',
      { nombre: 'Test Group', fk_usuarios: [1, 2] },
    );
  });

  it('invalidates conversations on success', async () => {
    mockApiPost.mockResolvedValue({
      data: {
        ok: true,
        data: { id_conversacion: 1 },
      },
    });

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('create').props.onPress();
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['conversations'],
      });
    });
  });
});
