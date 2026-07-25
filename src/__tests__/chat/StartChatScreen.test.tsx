import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import StartChatScreen from '@/features/chat/screens/StartChatScreen';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/store/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 42, nombre: 'Admin User', role: 'admin' },
  }),
}));

jest.mock('@/features/chat/hooks/useCreatePrivateConversation', () => ({
  useCreatePrivateConversation: () => ({
    mutate: jest.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

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

  it('shows ID input when Chat privado is tapped', () => {
    const { getByText, getByLabelText } = renderScreen();
    fireEvent.press(getByText('Chat privado'));
    expect(getByLabelText('ID de usuario')).toBeTruthy();
  });

  it('disables button when input is empty', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Chat privado'));
    const button = getByText('Iniciar chat');
    expect(button).toBeDisabled();
  });

  it('disables button when input is non-numeric', () => {
    const { getByText, getByLabelText } = renderScreen();
    fireEvent.press(getByText('Chat privado'));
    fireEvent.changeText(getByLabelText('ID de usuario'), 'abc');
    const button = getByText('Iniciar chat');
    expect(button).toBeDisabled();
  });

  it('shows self-chat error when input matches user own ID', () => {
    const { getByText, getByLabelText } = renderScreen();
    fireEvent.press(getByText('Chat privado'));
    fireEvent.changeText(getByLabelText('ID de usuario'), '42');
    expect(getByText('No puedes iniciar un chat contigo mismo')).toBeTruthy();
  });

  it('enables button for valid numeric ID different from self', () => {
    const { getByText, getByLabelText } = renderScreen();
    fireEvent.press(getByText('Chat privado'));
    fireEvent.changeText(getByLabelText('ID de usuario'), '99');
    const button = getByText('Iniciar chat');
    expect(button).not.toBeDisabled();
  });
});
