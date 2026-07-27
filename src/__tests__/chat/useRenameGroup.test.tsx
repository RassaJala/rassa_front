import React from 'react';
import { Text, View } from 'react-native';

import { conversationsKey, groupMembersKey } from '@rassa/chat';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import { useRenameGroup } from '@/features/chat/hooks/useRenameGroup';
import api from '@/services/api';

jest.mock('@/services/api');

const mockApiPatch = api.patch as jest.Mock;

describe('useRenameGroup', () => {
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
    const mutation = useRenameGroup(1);
    return (
      <View>
        <Text testID="pending">{String(mutation.isPending)}</Text>
        <Text
          testID="rename"
          onPress={() => mutation.mutate({ nombre: 'New Name' })}
        >
          Rename
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
    mockApiPatch.mockResolvedValue({
      data: {
        ok: true,
        data: { id_conversacion: 1, nombre: 'New Name' },
      },
    });

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('rename').props.onPress();
    });

    expect(mockApiPatch).toHaveBeenCalledWith(
      '/chat/conversaciones/1/renombrar/',
      { nombre: 'New Name' },
    );
  });

  it('invalidates relevant queries on success', async () => {
    mockApiPatch.mockResolvedValue({
      data: {
        ok: true,
        data: { id_conversacion: 1, nombre: 'New Name' },
      },
    });

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId('rename').props.onPress();
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: conversationsKey(),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: groupMembersKey(1),
      });
    });
  });
});
