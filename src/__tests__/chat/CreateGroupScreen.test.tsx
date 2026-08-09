import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import CreateGroupScreen from '@/features/chat/screens/CreateGroupScreen';
import api from '@/services/api';

jest.mock('@/services/api');

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({ colorScheme: 'light' }),
}));

const mockCreateGroup = jest.fn();

jest.mock('@/features/chat/hooks/useCreateGroup', () => ({
  useCreateGroup: () => ({ mutate: mockCreateGroup, isPending: false }),
}));

const mockApiGet = api.get as jest.Mock;

describe('CreateGroupScreen', () => {
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
        <CreateGroupScreen />
      </QueryClientProvider>,
    );

  const mockSearchResults = () => {
    mockApiGet.mockResolvedValue({
      data: {
        ok: true,
        data: [
          {
            id_usuario: 2,
            nombre_completo: 'Jane Doe',
            correo: 'jane@test.com',
            rol: 'Agricultor',
          },
          {
            id_usuario: 3,
            nombre_completo: 'John Smith',
            correo: 'john@test.com',
            rol: 'Vendedor',
          },
        ],
      },
    });
  };

  it('disables create button without name or members', () => {
    const { getByTestId } = renderScreen();
    const button = getByTestId('crear-grupo-button');
    expect(button).toBeDisabled();
  });

  it('creates group with selected members', async () => {
    mockSearchResults();

    const { getByTestId, getByLabelText } = renderScreen();
    fireEvent.changeText(getByLabelText('Nombre del grupo'), 'Mi grupo');

    fireEvent.changeText(getByLabelText('Buscar usuario'), 'jane');
    await waitFor(() => {
      expect(getByLabelText('Seleccionar Jane Doe')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('Seleccionar Jane Doe'));

    fireEvent.changeText(getByLabelText('Buscar usuario'), 'john');
    await waitFor(() => {
      expect(getByLabelText('Seleccionar John Smith')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('Seleccionar John Smith'));

    fireEvent.press(getByTestId('crear-grupo-button'));

    expect(mockCreateGroup).toHaveBeenCalledWith({
      nombre: 'Mi grupo',
      fk_usuarios: [2, 3],
    });
  });

  it('removes a member chip when toggled again', async () => {
    mockSearchResults();

    const { getByLabelText, queryByLabelText } = renderScreen();
    fireEvent.changeText(getByLabelText('Buscar usuario'), 'jane');
    await waitFor(() => {
      expect(getByLabelText('Seleccionar Jane Doe')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('Seleccionar Jane Doe'));

    expect(getByLabelText('Quitar Jane Doe')).toBeTruthy();
    fireEvent.press(getByLabelText('Quitar Jane Doe'));
    expect(queryByLabelText('Quitar Jane Doe')).toBeNull();
  });
});
