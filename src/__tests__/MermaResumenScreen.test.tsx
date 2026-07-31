/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { fireEvent, render, waitFor } from '@testing-library/react-native';

import MermaResumenScreen from '@/screens/admin/MermaResumenScreen';
import { fetchMermaResumen } from '@/services/waste';

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({
    colorScheme: 'light',
    toggleColorScheme: jest.fn(),
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@/services/waste', () => ({
  fetchMermaResumen: jest.fn(),
}));

const mockFetch = fetchMermaResumen as jest.Mock;

const navigation = { goBack: jest.fn() } as never;

const mockResumen = {
  agrupacion: 'mes',
  total_general: 12,
  producto_mas_afectado: { nombre: 'Manzana', total: 8 },
  detalle: [
    {
      periodo: '2026-07-01T00:00:00-03:00',
      producto_nombre: 'Manzana',
      producto_id: 1,
      decision_nombre: 'tirar',
      decision_id: 1,
      total_cantidad: 5,
      total_mermas: 3,
    },
    {
      periodo: '2026-07-01T00:00:00-03:00',
      producto_nombre: 'Pera',
      producto_id: 2,
      decision_nombre: 'donar',
      decision_id: 2,
      total_cantidad: 3,
      total_mermas: 2,
    },
  ],
};

const emptyResumen = {
  agrupacion: 'mes',
  total_general: 0,
  producto_mas_afectado: null,
  detalle: [],
};

describe('MermaResumenScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra spinner mientras carga (sin datos previos)', () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves

    const { getByText } = render(
      <MermaResumenScreen navigation={navigation} />,
    );

    expect(getByText('Cargando...')).toBeTruthy();
  });

  it('muestra error de conexion y boton de reintentar cuando falla', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { getByText } = render(
      <MermaResumenScreen navigation={navigation} />,
    );

    await waitFor(() => {
      expect(
        getByText(
          'Error de conexión. Verificá tu conexión e intentá de nuevo.',
        ),
      ).toBeTruthy();
    });
    expect(getByText('Reintentar')).toBeTruthy();
  });

  it('reintenta al presionar el boton', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { getByText } = render(
      <MermaResumenScreen navigation={navigation} />,
    );

    await waitFor(() => {
      expect(getByText('Reintentar')).toBeTruthy();
    });
    fireEvent.press(getByText('Reintentar'));
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('muestra empty state cuando no hay mermas', async () => {
    mockFetch.mockResolvedValue(emptyResumen);

    const { findByText } = render(
      <MermaResumenScreen navigation={navigation} />,
    );

    expect(await findByText('Sin resultados')).toBeTruthy();
    expect(
      await findByText(
        'No se encontraron mermas con los filtros seleccionados.',
      ),
    ).toBeTruthy();
  });

  it('renderiza el dashboard completo con datos', async () => {
    mockFetch.mockResolvedValue(mockResumen);

    const { findByText, getByText } = render(
      <MermaResumenScreen navigation={navigation} />,
    );

    expect(await findByText('Dashboard de Mermas')).toBeTruthy();
    expect(getByText('Unidades mermadas')).toBeTruthy();
    expect(getByText('12')).toBeTruthy();
    expect(getByText('Ranking de productos más mermados')).toBeTruthy();
    expect(getByText('Detalle de mermas')).toBeTruthy();
    expect(getByText(/tirar/)).toBeTruthy();
    expect(getByText(/donar/)).toBeTruthy();
  });
});
