/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, fireEvent } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import ChatListScreen from '@/features/chat/screens/ChatListScreen';

jest.mock('@/services/api');
jest.mock('@/store/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'buyer' } }),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
  useIsFocused: () => true,
}));

let mockRefetch: jest.Mock;
let mockError: Error | null;

jest.mock('@/features/chat/hooks/useConversations', () => ({
  useConversations: () => ({
    data: null,
    isLoading: false,
    error: mockError,
    refetch: mockRefetch,
  }),
}));

describe('ChatListScreen — error feedback', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRefetch = jest.fn().mockResolvedValue(undefined);
    mockError = new Error('Error del servidor.');
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
  });

  const renderScreen = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ChatListScreen />
      </QueryClientProvider>,
    );

  it('renders a retry button when the load fails', () => {
    const { getByText } = renderScreen();

    expect(getByText('Error al cargar conversaciones')).toBeTruthy();
    expect(getByText('Reintentar')).toBeTruthy();
  });

  it('refetches conversations when retry is pressed', () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText('Reintentar'));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('does not render the retry state when there is no error', () => {
    mockError = null;

    const { queryByText } = renderScreen();

    expect(queryByText('Reintentar')).toBeNull();
  });
});
