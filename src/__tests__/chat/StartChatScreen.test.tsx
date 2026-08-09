import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import StartChatScreen from '@/features/chat/screens/StartChatScreen';
import api from '@/services/api';

const mockNavigate = jest.fn();
const mockCreatePrivate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/store/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 42, nombre: 'Admin User', role: 'admin' },
  }),
}));

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({ colorScheme: 'light' }),
}));

jest.mock('@/features/chat/hooks/useCreatePrivateConversation', () => ({
  useCreatePrivateConversation: () => ({
    mutate: mockCreatePrivate,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

jest.mock('@/services/api');

const mockApiGet = api.get as jest.Mock;

describe('StartChatScreen', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  const renderScreen = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <StartChatScreen />
      </QueryClientProvider>,
    );

  it('renders two option cards on mount', () => {
    const { getByText } = renderScreen();
    expect(getByText('Chat privado')).toBeTruthy();
    expect(getByText('Nuevo grupo')).toBeTruthy();
  });

  it('navigates to CreateGroup when Nuevo grupo is tapped', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Nuevo grupo'));
    expect(mockNavigate).toHaveBeenCalledWith('CreateGroup');
  });

  it('shows search input when Chat privado is tapped', () => {
    const { getByText, getByLabelText } = renderScreen();
    fireEvent.press(getByText('Chat privado'));
    expect(getByLabelText('Buscar usuario')).toBeTruthy();
  });

  it('disables button when no user is selected', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Chat privado'));
    const button = getByText('Iniciar chat');
    expect(button).toBeDisabled();
  });

  it('creates private chat with selected user', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        ok: true,
        data: [
          {
            id_usuario: 99,
            nombre_completo: 'Jane Doe',
            correo: 'jane@test.com',
            rol: 'Agricultor',
          },
        ],
      },
    });

    const { getByText, getByLabelText } = renderScreen();
    fireEvent.press(getByText('Chat privado'));
    fireEvent.changeText(getByLabelText('Buscar usuario'), 'jane');

    await waitFor(() => {
      expect(getByLabelText('Seleccionar Jane Doe')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('Seleccionar Jane Doe'));
    fireEvent.press(getByText('Iniciar chat'));

    expect(mockCreatePrivate).toHaveBeenCalledWith({ fk_usuario: 99 });
  });
});
