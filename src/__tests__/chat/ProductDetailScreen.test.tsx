/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
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
jest.mock('@/store/CartContext', () => ({
  useCart: () => ({
    items: [],
    addItem: jest.fn(),
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
    hasItem: () => false,
    totalItems: 0,
    subtotal: 0,
    iva: 0,
    total: 0,
  }),
}));
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useRoute: () => ({
      params: {
        productoSemanalId: 10,
        farmerId: 5,
        farmerName: 'Juan Pérez',
        nombreProducto: 'Tomate',
        precio: '25.00',
        stock: 100,
        unidad: 'kg',
        foto: null,
      },
    }),
    useNavigation: () => ({ navigate: jest.fn() }),
    useIsFocused: () => true,
  };
});

const mockApiPost = api.post as jest.Mock;
const mockApiGet = api.get as jest.Mock;

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

    expect(getByText('Contactar a Juan Pérez')).toBeTruthy();
  });

  it('calls createPrivateConversation with farmerId on press', async () => {
    mockApiPost.mockResolvedValue({
      data: {
        ok: true,
        mensaje: 'Conversación creada correctamente.',
        data: { id_conversacion: 30 },
      },
    });
    mockApiGet.mockResolvedValue({
      data: {
        ok: true,
        data: [{ id: 30, nombre: '', tipo: 'privada', es_familia: false }],
      },
    });

    const { getByText } = renderScreen();

    fireEvent.press(getByText('Contactar a Juan Pérez'));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        '/chat/conversaciones/crear-privada/',
        { fk_usuario: 5 },
      );
    });
  });
});
