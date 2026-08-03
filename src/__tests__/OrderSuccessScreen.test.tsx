import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';

import OrderSuccessScreen from '@/screens/common/OrderSuccessScreen';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: {
      orderId: 45,
      total: '174.00',
      estado: 'pendiente',
    },
  }),
}));

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({
    colorScheme: 'light',
    toggleColorScheme: jest.fn(),
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('OrderSuccessScreen', () => {
  it('renderiza número de pedido, total y estado', () => {
    const { getByText } = render(<OrderSuccessScreen />);

    expect(getByText('¡Pedido confirmado!')).toBeTruthy();
    expect(getByText('Pedido N° 45')).toBeTruthy();
    expect(getByText('$174.00')).toBeTruthy();
    expect(getByText('pendiente')).toBeTruthy();
  });

  it('navega al inicio al presionar Volver al inicio', () => {
    const { getByTestId } = render(<OrderSuccessScreen />);

    fireEvent.press(getByTestId('back-home-btn'));

    expect(mockNavigate).toHaveBeenCalledWith('BuyerTabs', {
      screen: 'Home',
    });
  });
});
