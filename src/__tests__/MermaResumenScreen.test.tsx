/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import {
  fireEvent,
  render,
  waitFor,
  within,
} from '@testing-library/react-native';

import { MONTH_NAMES } from '@/constants/dates';
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

function buildManyResumen(count: number) {
  return {
    agrupacion: 'mes' as const,
    total_general: count,
    producto_mas_afectado: { nombre: 'Producto 0', total: 1 },
    detalle: Array.from({ length: count }, (_, i) => ({
      periodo: '2026-07-01T00:00:00-03:00',
      producto_nombre: `Producto ${i}`,
      producto_id: i + 1,
      decision_nombre: 'tirar',
      decision_id: 1,
      total_cantidad: 1,
      total_mermas: 1,
    })),
  };
}

// A past month so the day grid is never filtered by "today"; day 15/20 always exist.
function pastMonthParts(): {
  year: string;
  month: string;
  day15: string;
  day20: string;
} {
  const now = new Date();
  const isJan = now.getMonth() === 0;
  const year = isJan ? now.getFullYear() - 1 : now.getFullYear();
  const month = MONTH_NAMES[isJan ? 11 : now.getMonth() - 1] ?? '';
  return { year: String(year), month, day15: '15', day20: '20' };
}

async function pickDate(
  queries: ReturnType<typeof render>,
  field: string,
  year: string,
  month: string,
  day: string,
) {
  fireEvent.press(queries.getByLabelText(field));
  const modal = queries.getByTestId('date-modal');
  fireEvent.press(within(modal).getByText(year));
  fireEvent.press(within(modal).getByText(month));
  fireEvent.press(within(modal).getByText(day));
}

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

  it('muestra "Sin datos" cuando producto_mas_afectado es null', async () => {
    mockFetch.mockResolvedValue({
      ...mockResumen,
      producto_mas_afectado: null,
    });

    const { findByText } = render(
      <MermaResumenScreen navigation={navigation} />,
    );

    expect(await findByText('Sin datos')).toBeTruthy();
  });

  it('pagina el detalle con los botones anterior y siguiente', async () => {
    mockFetch.mockResolvedValue(buildManyResumen(12));

    const { findByText, getByLabelText } = render(
      <MermaResumenScreen navigation={navigation} />,
    );

    expect(await findByText('Página 1 de 2')).toBeTruthy();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    fireEvent.press(getByLabelText('Página siguiente'));
    expect(await findByText('Página 2 de 2')).toBeTruthy();
    // La paginación del detalle es client-side: no dispara un refetch.
    expect(mockFetch).toHaveBeenCalledTimes(1);

    fireEvent.press(getByLabelText('Página anterior'));
    expect(await findByText('Página 1 de 2')).toBeTruthy();
  });

  it('resetea los filtros de fecha y producto', async () => {
    mockFetch.mockResolvedValue(mockResumen);

    const queries = render(<MermaResumenScreen navigation={navigation} />);
    const {
      findByText,
      getByText,
      getByLabelText,
      getByTestId,
      getAllByText,
      queryByLabelText,
    } = queries;

    await findByText('Dashboard de Mermas');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Fecha desde y hasta en un mes pasado (15 y 20)
    const { year, month, day15, day20 } = pastMonthParts();
    await pickDate(queries, 'Fecha desde', year, month, day15);
    await pickDate(queries, 'Fecha hasta', year, month, day20);

    fireEvent.press(getByText('Buscar'));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

    // Seleccionar un producto
    fireEvent.press(getByLabelText('Selector de producto'));
    const productModal = getByTestId('product-picker-modal');
    fireEvent.press(within(productModal).getByText('Manzana'));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));

    expect(getByLabelText('Limpiar filtros')).toBeTruthy();

    fireEvent.press(getByLabelText('Limpiar filtros'));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(4));

    expect(queryByLabelText('Limpiar filtros')).toBeNull();
    expect(getByText('Todos los productos')).toBeTruthy();
    expect(getAllByText('Seleccionar').length).toBe(2);
  });

  it('no dispara la búsqueda con un rango de fechas inválido', async () => {
    mockFetch.mockResolvedValue(mockResumen);

    const queries = render(<MermaResumenScreen navigation={navigation} />);
    const { findByText, getByText } = queries;

    await findByText('Dashboard de Mermas');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Desde posterior a Hasta → rango inválido
    const { year, month, day15, day20 } = pastMonthParts();
    await pickDate(queries, 'Fecha desde', year, month, day20);
    await pickDate(queries, 'Fecha hasta', year, month, day15);

    fireEvent.press(getByText('Buscar'));
    expect(getByText('«Hasta» debe ser mayor o igual a «Desde»')).toBeTruthy();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  });

  it('muestra el mensaje de contactar al administrador tras agotar los reintentos', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { findByText, getByText, queryByText } = render(
      <MermaResumenScreen navigation={navigation} />,
    );

    await findByText('Reintentar');
    fireEvent.press(getByText('Reintentar'));
    await waitFor(() => expect(getByText('Reintentar')).toBeTruthy());
    fireEvent.press(getByText('Reintentar'));

    await waitFor(() =>
      expect(
        getByText('No pudimos cargar los datos. Contactá al administrador.'),
      ).toBeTruthy(),
    );
    expect(queryByText('Reintentar')).toBeNull();
  });

  it('no hereda el presupuesto de reintentos entre búsquedas con filtros distintos', async () => {
    // Supervisor scenario: first search fails, manual retry fails too, then
    // the user changes the date range (independent search) which fails again.
    // The retry budget must reset per filter set so the third failure never
    // shows "Contactá al administrador" prematurely.
    mockFetch.mockRejectedValue(new Error('Network error'));

    const queries = render(<MermaResumenScreen navigation={navigation} />);
    const { findByText, getByText, queryByText } = queries;

    // Initial search fails; manual retry fails again.
    await findByText('Reintentar');
    fireEvent.press(getByText('Reintentar'));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

    // Change the date range — a new independent search with different filters.
    const { year, month, day15, day20 } = pastMonthParts();
    await pickDate(queries, 'Fecha desde', year, month, day15);
    await pickDate(queries, 'Fecha hasta', year, month, day20);
    fireEvent.press(getByText('Buscar'));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));

    // The new search still offers a retry button instead of telling the user
    // to contact the administrator.
    expect(getByText('Reintentar')).toBeTruthy();
    expect(
      queryByText('No pudimos cargar los datos. Contactá al administrador.'),
    ).toBeNull();
  });

  it('muestra banner de datos desactualizados cuando un refetch falla con datos previos', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResumen)
      .mockRejectedValueOnce(new Error('Network error'));

    const queries = render(<MermaResumenScreen navigation={navigation} />);
    const { findByText, getByText } = queries;

    expect(await findByText('Unidades mermadas')).toBeTruthy();

    // Apply a new filter → refetch fails but previous data stays visible.
    const { year, month, day15, day20 } = pastMonthParts();
    await pickDate(queries, 'Fecha desde', year, month, day15);
    await pickDate(queries, 'Fecha hasta', year, month, day20);
    fireEvent.press(getByText('Buscar'));

    await waitFor(() =>
      expect(
        getByText(
          /No se pudieron cargar los datos para los filtros seleccionados/,
        ),
      ).toBeTruthy(),
    );
    expect(getByText(/Actualizado:/)).toBeTruthy();
    // Previous data remains on screen.
    expect(getByText('Unidades mermadas')).toBeTruthy();
  });
});
