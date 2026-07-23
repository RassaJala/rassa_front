/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';

import { RoleErrorScreen } from '../navigation/RoleErrorScreen';

describe('RoleErrorScreen', () => {
  it('renderiza mensaje de error y botón de cerrar sesión', () => {
    const onLogout = jest.fn();

    const { getByText } = render(<RoleErrorScreen onLogout={onLogout} />);

    expect(getByText('Sesión inválida')).toBeTruthy();
    expect(
      getByText(
        'Tu cuenta tiene un rol no reconocido. Cerrá sesión e intentá de nuevo.',
      ),
    ).toBeTruthy();
  });

  it('ejecuta onLogout al presionar cerrar sesión', () => {
    const onLogout = jest.fn();

    const { getByText } = render(<RoleErrorScreen onLogout={onLogout} />);

    fireEvent.press(getByText('Cerrar sesión'));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
