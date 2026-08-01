import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import GroupDetailScreen from '@/features/chat/screens/GroupDetailScreen';
import api from '@/services/api';
import { useAuth } from '@/store/AuthContext';

const mockCreateChat = jest.fn();

jest.mock('@/services/api');
jest.mock('@/store/AuthContext', () => ({
  useAuth: jest.fn(),
}));
jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({ colorScheme: 'light' }),
}));
jest.mock('@/features/chat/hooks/useCreatePrivateConversation', () => ({
  useCreatePrivateConversation: () => ({
    mutate: mockCreateChat,
    isPending: false,
  }),
}));
jest.mock('@react-navigation/native', () => {
  const mockRoute = {
    params: {
      conversationId: 1,
      title: 'Test Group',
      isFamily: false,
    },
  };
  return {
    ...jest.requireActual('@react-navigation/native'),
    useRoute: () => mockRoute,
    useNavigation: () => ({ navigate: jest.fn() }),
  };
});

const mockApiGet = api.get as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;

describe('GroupDetailScreen', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 1, nombre: 'Admin User', role: 'admin' },
    });
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  const renderScreen = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <GroupDetailScreen />
      </QueryClientProvider>,
    );

  it('renders member list', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        data: [
          {
            id_miembro: 1,
            id_usuario: 10,
            nombre_completo: 'Alice',
            correo: 'alice@test.com',
            creado_en: '2026-01-01T00:00:00Z',
          },
          {
            id_miembro: 2,
            id_usuario: 11,
            nombre_completo: 'Bob',
            correo: 'bob@test.com',
            creado_en: '2026-01-01T00:00:00Z',
          },
        ],
      },
    });

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('Alice')).toBeTruthy();
      expect(getByText('Bob')).toBeTruthy();
    });
  });

  it('shows edit buttons for admin on non-family groups', async () => {
    mockApiGet.mockResolvedValue({ data: { data: [] } });

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('Renombrar')).toBeTruthy();
      expect(getByText('Agregar integrante')).toBeTruthy();
    });
  });

  it('hides edit buttons for buyer role', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 2, nombre: 'Buyer User', role: 'buyer' },
    });
    mockApiGet.mockResolvedValue({ data: { data: [] } });

    const { queryByText } = renderScreen();

    await waitFor(() => {
      expect(queryByText('Renombrar')).toBeNull();
      expect(queryByText('Agregar integrante')).toBeNull();
    });
  });

  it('calls the correct API endpoint', async () => {
    mockApiGet.mockResolvedValue({ data: { data: [] } });

    renderScreen();

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith(
        '/chat/conversaciones/1/integrantes/',
      );
    });
  });

  it('shows a chat button and creates a private conversation for other members', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        data: [
          {
            id_miembro: 1,
            id_usuario: 10,
            nombre_completo: 'Alice',
            correo: 'alice@test.com',
            creado_en: '2026-01-01T00:00:00Z',
          },
        ],
      },
    });

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('Chatear')).toBeTruthy();
    });

    fireEvent.press(getByText('Chatear'));

    expect(mockCreateChat).toHaveBeenCalledWith({ fk_usuario: 10 });
  });

  it('hides the chat button for the current user', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 10, nombre: 'Alice', role: 'admin' },
    });
    mockApiGet.mockResolvedValue({
      data: {
        data: [
          {
            id_miembro: 1,
            id_usuario: 10,
            nombre_completo: 'Alice',
            correo: 'alice@test.com',
            creado_en: '2026-01-01T00:00:00Z',
          },
        ],
      },
    });

    const { queryByText } = renderScreen();

    await waitFor(() => {
      expect(queryByText('Alice')).toBeTruthy();
    });

    expect(queryByText('Chatear')).toBeNull();
  });
});
