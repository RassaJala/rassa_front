import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockNavigate = jest.fn();

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({ colorScheme: 'light' }),
}));

jest.mock('@/hooks/useFormattedDate', () => ({
  useFormattedDate: () => ({ today: 'Test date' }),
}));

jest.mock('@/services/mock/dashboard', () => ({
  getAdminStats: () => ({ totalProducts: 10, totalUsers: 20, totalOrders: 30 }),
}));

jest.mock('@/components/ProfileDrawer', () => ({
  ProfileDrawerProvider: ({ children }: any) => children,
  ProfileDrawerTrigger: () => null,
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

import AdminPanelScreen from '../AdminPanelScreen';

describe('AdminPanelScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows lookup form when order card is pressed', () => {
    const { getByText, queryByText } = render(
      <AdminPanelScreen navigation={{ navigate: mockNavigate } as any} />,
    );
    expect(queryByText('Buscar historial de pedido')).toBeNull();
    fireEvent.press(getByText('Pedidos'));
    expect(getByText('Buscar historial de pedido')).toBeTruthy();
  });
});
