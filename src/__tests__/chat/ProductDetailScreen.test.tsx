/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  render,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import ProductDetailScreen from '@/screens/buyer/ProductDetailScreen';
import api from '@/services/api';

jest.mock('@/services/api');
jest.mock('@/store/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, nombre: 'Buyer' } }),
}));
jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({ colorScheme: 'light' }),
}));
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useRoute: () => ({
      params: { productId: 10, farmerId: 5 },
    }),
    useNavigation: () => ({ navigate: jest.fn() }),
    useIsFocused: () => true,
  };
});

const mockApiPost = api.post as jest.Mock;

describe('ProductDetailScreen — Contact Farmer', () => {
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

  const renderScreen = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ProductDetailScreen />
      </QueryClientProvider>,
    );

  it('renders the contact button', () => {
    const { getByText } = renderScreen();

    expect(getByText('Contactar agricultor')).toBeTruthy();
  });

  it('calls createPrivateConversation with farmerId on press', async () => {
    mockApiPost.mockResolvedValue({
      data: {
        ok: true,
        mensaje: 'Conversación creada correctamente.',
        data: { id_conversacion: 30 },
      },
    });

    const { getByText } = renderScreen();

    fireEvent.press(getByText('Contactar agricultor'));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        '/chat/conversaciones/crear-privada/',
        { fk_usuario: 5 },
      );
    });
  });

  it('shows inline error message when backend fails (envelope)', async () => {
    mockApiPost.mockResolvedValue({
      data: { ok: false, mensaje: 'Error del servidor.', data: null },
    });

    const { getByText } = renderScreen();

    fireEvent.press(getByText('Contactar agricultor'));

    expect(await screen.findByText('Error del servidor.')).toBeTruthy();
  });

  it('shows a friendly inline error on a real HTTP 500 (rejection path)', async () => {
    // MAJOR #3 (#82): the rejection path (real HTTP 500) behaves completely
    // differently from the envelope path and was previously untested. The
    // interceptor exposes a sanitized `safeMessage`; the screen renders it.
    const axiosErr = Object.assign(
      new Error('Request failed with status code 500'),
      {
        isAxiosError: true,
        response: { status: 500, data: undefined },
        safeMessage: 'Error del servidor. Intenta de nuevo.',
      },
    );
    mockApiPost.mockRejectedValue(axiosErr);

    const { getByText } = renderScreen();

    fireEvent.press(getByText('Contactar agricultor'));

    expect(
      await screen.findByText('Error del servidor. Intenta de nuevo.'),
    ).toBeTruthy();
  });
});
