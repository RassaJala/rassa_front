import React from 'react';
import { Text, View } from 'react-native';

import { conversationsKey, groupMembersKey } from '@rassa/chat';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import { useRemoveGroupMember } from '@/features/chat/hooks/useRemoveGroupMember';
import api from '@/services/api';

jest.mock('@/services/api');

const mockApiDelete = api.delete as jest.Mock;

describe('useRemoveGroupMember', () => {
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
    const mutation = useRemoveGroupMember(1);
    return (
      <View>
        <Text testID="remove" onPress={() => mutation.mutate(5)}>
          Remove
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

  it('calls API with correct endpoint', async () => {
    mockApiDelete.mockResolvedValue({
      data: {
        ok: true,
        message: 'Integrante removido',
        data: { id_conversacion: 1 },
      },
    });

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('remove').props.onPress();
    });

    expect(mockApiDelete).toHaveBeenCalledWith(
      '/chat/conversaciones/1/integrantes/5/',
    );
  });

  it('invalidates group members and conversations on success', async () => {
    mockApiDelete.mockResolvedValue({
      data: {
        ok: true,
        message: 'Integrante removido',
        data: { id_conversacion: 1 },
      },
    });

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('remove').props.onPress();
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: groupMembersKey(1),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: conversationsKey(),
      });
    });
  });
});
