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
jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({ colorScheme: 'light' }),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
  useIsFocused: () => true,
}));

let mockRefetch: jest.Mock;
let mockError: Error | null;
let mockIsFetching: boolean;
let mockData: {
  results: {
    id: number;
    nombre: string;
    participante_nombre?: string;
    tipo: string;
  }[];
} | null;

jest.mock('@/features/chat/hooks/useConversations', () => ({
  useConversations: () => ({
    data: mockData,
    isLoading: false,
    error: mockError,
    refetch: mockRefetch,
    isFetching: mockIsFetching,
  }),
}));

describe('ChatListScreen — error feedback', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRefetch = jest.fn().mockResolvedValue(undefined);
    mockError = new Error('Error del servidor.');
    mockIsFetching = false;
    mockData = null;
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

  it('shows cached conversations plus a non-blocking banner when refetch fails', () => {
    // MAJOR #5 (R3-002): with cached data + error, the list stays visible and
    // an error banner is shown instead of replacing the whole screen.
    mockData = {
      results: [
        {
          id: 1,
          nombre: 'Conexión',
          participante_nombre: 'Conexión',
          tipo: 'privada',
        },
      ],
    };
    mockError = new Error('Error de red');

    const { getByText, queryByText } = renderScreen();

    expect(getByText('Error al cargar conversaciones')).toBeTruthy();
    expect(getByText('Reintentar')).toBeTruthy();
    expect(queryByText('Conexión')).not.toBeNull();
  });

  it('disables retry and shows "Reintentando…" while refetching with cached data', () => {
    mockData = { results: [{ id: 2, nombre: 'Grupo', tipo: 'grupal' }] };
    mockError = new Error('Error transitorio');
    mockIsFetching = true;

    const { getByText, getByLabelText } = renderScreen();

    expect(getByText('Reintentando…')).toBeTruthy();
    const retry = getByLabelText('Reintentar cargar conversaciones');
    expect(retry.props.accessibilityState?.disabled).toBe(true);
  });

  it('hides the banner when a retry succeeds', () => {
    mockData = {
      results: [
        { id: 3, nombre: 'Fam', participante_nombre: 'Fam', tipo: 'privada' },
      ],
    };
    mockError = new Error('Error');

    const { queryByText } = renderScreen();
    expect(queryByText('Error al cargar conversaciones')).not.toBeNull();

    // Simulate a successful refetch: clear the error on the next render.
    mockError = null;
    const { queryByText: afterRetry } = renderScreen();

    expect(afterRetry('Error al cargar conversaciones')).toBeNull();
  });
});
