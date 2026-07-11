/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';

import LogoutButton from '@/components/LogoutButton';

const mockLogout = jest.fn();

jest.mock('@/store/AuthContext', () => ({
  useAuth: () => ({
    logout: mockLogout,
  }),
}));

describe('LogoutButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza con el texto de cierre de sesión', () => {
    const { getByText } = render(<LogoutButton />);

    expect(getByText('Cerrar Sesión')).toBeTruthy();
  });

  it('llama logout al presionar', () => {
    const { getByText } = render(<LogoutButton />);

    fireEvent.press(getByText('Cerrar Sesión'));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('acepta prop mode y style', () => {
    const { getByText } = render(
      <LogoutButton mode="contained" style={{ marginTop: 10 }} />,
    );

    expect(getByText('Cerrar Sesión')).toBeTruthy();
  });

  it('asigna testID cuando se provee', () => {
    const { getByTestId } = render(<LogoutButton testID="logout-btn" />);

    expect(getByTestId('logout-btn')).toBeTruthy();
  });
});
