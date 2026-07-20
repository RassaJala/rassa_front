import React from 'react';
import { Text, View } from 'react-native';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import { useAddGroupMember } from '@/features/chat/hooks/useAddGroupMember';
import api from '@/services/api';

jest.mock('@/services/api');

const mockApiPost = api.post as jest.Mock;

describe('useAddGroupMember', () => {
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
    const mutation = useAddGroupMember(1);
    return (
      <View>
        <Text testID="pending">{String(mutation.isPending)}</Text>
        <Text testID="add" onPress={() => mutation.mutate({ fk_usuario: 5 })}>
          Add
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

  it('calls API with correct endpoint and payload', async () => {
    mockApiPost.mockResolvedValue({
      data: {
        ok: true,
        mensaje: 'Integrante agregado correctamente.',
        data: { id_conversacion: 1 },
      },
    });

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('add').props.onPress();
    });

    expect(mockApiPost).toHaveBeenCalledWith(
      '/chat/conversaciones/1/agregar-integrante/',
      { fk_usuario: 5 },
    );
  });

  it('invalidates group members and conversations on success', async () => {
    mockApiPost.mockResolvedValue({
      data: {
        ok: true,
        mensaje: 'Integrante agregado correctamente.',
        data: { id_conversacion: 1 },
      },
    });

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('add').props.onPress();
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['groupMembers', 1],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['conversations'],
      });
    });
  });
});
