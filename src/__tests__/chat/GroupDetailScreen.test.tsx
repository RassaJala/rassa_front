import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import GroupDetailScreen from '@/features/chat/screens/GroupDetailScreen';
import api from '@/services/api';

jest.mock('@/services/api');
jest.mock('@/store/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 10, nombre: 'Admin User', role: 'buyer' },
  }),
}));
jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({ colorScheme: 'light' }),
}));
jest.mock('@/features/chat/hooks/useConversations', () => ({
  useConversations: () => ({
    data: {
      results: [{ id: 1, es_familia: false, nombre_override: false }],
    },
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

describe('GroupDetailScreen', () => {
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

  it('shows edit buttons for chat admin on non-family groups', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        data: [
          {
            id_miembro: 1,
            id_usuario: 10,
            nombre_completo: 'Admin User',
            correo: 'admin@test.com',
            creado_en: '2026-01-01T00:00:00Z',
            rol: 'admin',
          },
        ],
      },
    });

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('Renombrar')).toBeTruthy();
      expect(getByText('Agregar integrante')).toBeTruthy();
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
});
