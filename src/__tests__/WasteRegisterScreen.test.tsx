/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

jest.mock('react-native/Libraries/Components/Keyboard/Keyboard', () => ({
  addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  dismiss: jest.fn(),
  isVisible: jest.fn().mockReturnValue(false),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({
    colorScheme: 'light',
    toggleColorScheme: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

const mockGoBack = jest.fn();
const mockCreateWasteRecord = jest.fn();

jest.mock('@/services/waste', () => ({
  createWasteRecord: (...args: unknown[]) => mockCreateWasteRecord(...args),
  fetchCurrentPublications: jest.fn().mockResolvedValue([
    {
      id_publicacion: 10,
      agricultor: null,
      fecha_publicacion: '2026-08-03T00:00:00-03:00',
      semana: '2026-W32',
      productos: [
        {
          id_producto_semanal: 100,
          producto: 'Tomate',
          unidad: 'kg',
          stock: 5,
          precio: '120',
          foto: '',
        },
      ],
    },
  ]),
  fetchWasteOrders: jest.fn().mockResolvedValue([
    {
      id_pedido: 1,
      cliente_nombre: 'Juan Pérez',
      total: '120',
      estado_actual: 'pendiente',
      creado_en: '2026-08-03T00:00:00-03:00',
    },
  ]),
}));

// Toast anima con Animated.timing; el mock lo resuelve de forma síncrona.
jest.mock('@/components/Toast', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ message, visible }: { message: string; visible: boolean }) =>
      visible ? (
        <View>
          <Text>{message}</Text>
        </View>
      ) : null,
  };
});

import WasteRegisterScreen from '@/screens/waste/WasteRegisterScreen';

function renderScreen(client?: QueryClient) {
  const qc =
    client ?? new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <WasteRegisterScreen />
    </QueryClientProvider>,
  );
}

type Render = ReturnType<typeof renderScreen>;

/** Espera a que el formulario completo esté montado (header único visible). */
async function waitForForm(getByText: (text: string) => unknown) {
  await waitFor(() => getByText('Descuenta stock del producto publicado.'));
}

/** "Registrar merma" aparece en el header Y en el botón de submit; toma el último. */
function submitButton(render: Render) {
  const matches = render.getAllByText('Registrar merma');
  return matches[matches.length - 1];
}

async function fillValidForm(
  getByText: (text: string | RegExp) => unknown,
  getByPlaceholderText: (text: string) => unknown,
) {
  // Select pedido
  fireEvent.press(getByText('Elige un pedido…'));
  await waitFor(() => getByText(/Pedido #1/));
  fireEvent.press(getByText(/Pedido #1/));

  // Select producto
  fireEvent.press(getByText('Elige un producto publicado…'));
  await waitFor(() => getByText('Tomate'));
  fireEvent.press(getByText('Tomate'));

  // Fill fields
  fireEvent.changeText(getByPlaceholderText('0'), '2');
  fireEvent.changeText(
    getByPlaceholderText('Ej.: se venció la fecha de caducidad'),
    'Se venció',
  );

  // Select decision
  fireEvent.press(getByText('Elige una decisión…'));
  await waitFor(() => getByText('Donar'));
  fireEvent.press(getByText('Donar'));
}

describe('WasteRegisterScreen (mobile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateWasteRecord.mockResolvedValue({ id_merma: 1, cantidad: 2 });
  });

  it('renders the form after loading the initial queries', async () => {
    const { getByText } = renderScreen();

    await waitForForm(getByText);
    expect(getByText('Pedido *')).toBeTruthy();
    expect(getByText('Producto publicado *')).toBeTruthy();
    expect(getByText('Cantidad *')).toBeTruthy();
    expect(getByText('Motivo *')).toBeTruthy();
  });

  it('shows validation errors when required fields are missing', async () => {
    const render = renderScreen();

    await waitForForm(render.getByText);
    fireEvent.press(submitButton(render));

    expect(render.getByText('Selecciona un pedido.')).toBeTruthy();
    expect(render.getByText('Selecciona un producto publicado.')).toBeTruthy();
    expect(
      render.getByText('La cantidad debe ser un número entero mayor a 0.'),
    ).toBeTruthy();
    expect(render.getByText('El motivo es obligatorio.')).toBeTruthy();
    expect(render.getByText('Elige una decisión.')).toBeTruthy();
    expect(mockCreateWasteRecord).not.toHaveBeenCalled();
  });

  it('rejects a quantity above the available stock', async () => {
    const render = renderScreen();

    await waitForForm(render.getByText);
    await fillValidForm(render.getByText, render.getByPlaceholderText);

    fireEvent.changeText(render.getByPlaceholderText('0'), '99');
    fireEvent.press(submitButton(render));

    expect(
      await waitFor(() => render.getByText('Stock disponible: 5.')),
    ).toBeTruthy();
    expect(mockCreateWasteRecord).not.toHaveBeenCalled();
  });

  it('submits the record with the full payload and shows the success toast', async () => {
    const render = renderScreen();

    await waitForForm(render.getByText);
    await fillValidForm(render.getByText, render.getByPlaceholderText);

    fireEvent.press(submitButton(render));

    await waitFor(() => expect(mockCreateWasteRecord).toHaveBeenCalledTimes(1));
    // TanStack v5 invokes mutationFn(variables, context): assert only the payload.
    const firstCall = mockCreateWasteRecord.mock.calls[0]?.[0] as unknown;
    expect(firstCall).toEqual({
      fk_producto_semanal: 100,
      fk_pedido: 1,
      cantidad: 2,
      motivo: 'Se venció',
      fk_decision: 1,
    });
    expect(
      await waitFor(() => render.getByText('Merma registrada correctamente.')),
    ).toBeTruthy();
  });

  it('shows the API error toast when the submit fails', async () => {
    mockCreateWasteRecord.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { detail: 'Stock insuficiente.' } },
    });
    const render = renderScreen();

    await waitForForm(render.getByText);
    await fillValidForm(render.getByText, render.getByPlaceholderText);

    fireEvent.press(submitButton(render));

    expect(
      await waitFor(() => render.getByText('Stock insuficiente.')),
    ).toBeTruthy();
  });

  it('rejects a quantity of 0 at the lower boundary', async () => {
    const render = renderScreen();

    await waitForForm(render.getByText);
    await fillValidForm(render.getByText, render.getByPlaceholderText);

    fireEvent.changeText(render.getByPlaceholderText('0'), '0');
    fireEvent.press(submitButton(render));

    expect(
      render.getByText('La cantidad debe ser un número entero mayor a 0.'),
    ).toBeTruthy();
    expect(mockCreateWasteRecord).not.toHaveBeenCalled();
  });

  it('does not fire a second request while the mutation is pending', async () => {
    let resolveCreate: (() => void) | undefined;
    mockCreateWasteRecord.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCreate = () => resolve({ id_merma: 1, cantidad: 2 });
        }),
    );
    const render = renderScreen();

    await waitForForm(render.getByText);
    await fillValidForm(render.getByText, render.getByPlaceholderText);

    fireEvent.press(submitButton(render));
    await waitFor(() => expect(mockCreateWasteRecord).toHaveBeenCalledTimes(1));

    // While pending the submit Pressable is disabled, so a second press does
    // not dispatch another mutation.
    fireEvent.press(submitButton(render));
    expect(mockCreateWasteRecord).toHaveBeenCalledTimes(1);

    // Resolve so the mutation settles and the test does not leak a pending
    // promise into the next test.
    resolveCreate?.();
  });

  it('shows the error fallback UI and recovers with Reintentar when queries fail', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchCurrentPublications } = jest.requireMock('@/services/waste');
    (fetchCurrentPublications as jest.Mock).mockRejectedValueOnce(
      new Error('Network down'),
    );

    const render = renderScreen();

    expect(
      await waitFor(() => render.getByText('No se pudieron cargar los datos.')),
    ).toBeTruthy();
    expect(render.getByText('Reintentar')).toBeTruthy();
    expect(render.getByText('← Volver')).toBeTruthy();

    // Reintentar refetches; with the mock now resolving, the form appears.
    fireEvent.press(render.getByText('Reintentar'));
    await waitForForm(render.getByText);
  });

  it('never logs the raw mutation error (with the JWT header)', async () => {
    mockCreateWasteRecord.mockRejectedValueOnce({
      isAxiosError: true,
      message: 'Request failed with status code 400',
      config: {
        url: '/mermas/',
        method: 'post',
        headers: { Authorization: 'Bearer TOPSECRETJWT' },
      },
      response: {
        status: 400,
        config: { url: '/mermas/', method: 'post' },
        data: { detail: 'boom' },
      },
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const render = renderScreen();
      await waitForForm(render.getByText);
      await fillValidForm(render.getByText, render.getByPlaceholderText);

      fireEvent.press(submitButton(render));
      await waitFor(() => expect(mockCreateWasteRecord).toHaveBeenCalled());

      const serialized = JSON.stringify([
        ...errorSpy.mock.calls,
        ...warnSpy.mock.calls,
      ]);
      expect(serialized).not.toContain('TOPSECRETJWT');
    } finally {
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('maps a fk_producto_semanal field error to the mismatch message', async () => {
    mockCreateWasteRecord.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          fk_producto_semanal: ['El producto no pertenece al DetallePedido.'],
        },
      },
    });
    const render = renderScreen();

    await waitForForm(render.getByText);
    await fillValidForm(render.getByText, render.getByPlaceholderText);

    fireEvent.press(submitButton(render));

    expect(
      await waitFor(() =>
        render.getByText('El producto no pertenece al pedido seleccionado.'),
      ),
    ).toBeTruthy();
  });

  it('filters the product options to the products of the selected order', async () => {
    const { fetchWasteOrders } = jest.requireMock('@/services/waste');
    (fetchWasteOrders as jest.Mock).mockResolvedValueOnce([
      {
        id_pedido: 1,
        cliente_nombre: 'Juan Pérez',
        total: '120',
        estado_actual: 'pendiente',
        creado_en: '2026-08-03T00:00:00-03:00',
        productos: ['Tomate'],
      },
    ]);
    const { fetchCurrentPublications } = jest.requireMock('@/services/waste');
    (fetchCurrentPublications as jest.Mock).mockResolvedValueOnce([
      {
        id_publicacion: 10,
        agricultor: null,
        fecha_publicacion: '2026-08-03T00:00:00-03:00',
        semana: '2026-W32',
        productos: [
          {
            id_producto_semanal: 100,
            producto: 'Tomate',
            unidad: 'kg',
            stock: 5,
            precio: '120',
            foto: '',
          },
          {
            id_producto_semanal: 101,
            producto: 'Papa',
            unidad: 'kg',
            stock: 3,
            precio: '60',
            foto: '',
          },
        ],
      },
    ]);
    const render = renderScreen();

    await waitForForm(render.getByText);

    // Pick Papa first: with no order selected yet, every product is listed.
    fireEvent.press(render.getByText('Elige un producto publicado…'));
    await waitFor(() => render.getByText('Papa'));
    fireEvent.press(render.getByText('Papa'));

    // Now pick the order that only contains Tomate.
    fireEvent.press(render.getByText('Elige un pedido…'));
    await waitFor(() => render.getByText(/Pedido #1/));
    fireEvent.press(render.getByText(/Pedido #1/));

    // Papa no longer belongs to the order: the selection resets and the modal
    // only lists Tomate.
    expect(render.getByText('Elige un producto publicado…')).toBeTruthy();
    fireEvent.press(render.getByText('Elige un producto publicado…'));
    await waitFor(() => render.getByText('Tomate'));
    expect(render.queryByText('Papa')).toBeNull();
  });

  it('resets the form and shows the success toast even when the stock invalidation fails', async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = jest
      .spyOn(qc, 'invalidateQueries')
      .mockRejectedValue(new Error('invalidate boom'));
    try {
      const render = renderScreen(qc);

      await waitForForm(render.getByText);
      await fillValidForm(render.getByText, render.getByPlaceholderText);

      fireEvent.press(submitButton(render));
      await waitFor(() => expect(mockCreateWasteRecord).toHaveBeenCalledTimes(1));

      // R4: a failed stock refresh must not prevent the reset + success toast.
      expect(
        await waitFor(() => render.getByText('Merma registrada correctamente.')),
      ).toBeTruthy();
      expect(render.getByText('Elige un pedido…')).toBeTruthy();
      expect(render.getByText('Elige un producto publicado…')).toBeTruthy();
    } finally {
      invalidateSpy.mockRestore();
    }
  });

  it('blames the selected order when it empties the product list', async () => {
    const { fetchWasteOrders } = jest.requireMock('@/services/waste');
    (fetchWasteOrders as jest.Mock).mockResolvedValueOnce([
      {
        id_pedido: 1,
        cliente_nombre: 'Juan Pérez',
        total: '120',
        estado_actual: 'pendiente',
        creado_en: '2026-08-03T00:00:00-03:00',
        productos: ['Zanahoria'],
      },
    ]);
    const { fetchCurrentPublications } = jest.requireMock('@/services/waste');
    (fetchCurrentPublications as jest.Mock).mockResolvedValueOnce([
      {
        id_publicacion: 10,
        agricultor: null,
        fecha_publicacion: '2026-08-03T00:00:00-03:00',
        semana: '2026-W32',
        productos: [
          {
            id_producto_semanal: 100,
            producto: 'Tomate',
            unidad: 'kg',
            stock: 5,
            precio: '120',
            foto: '',
          },
        ],
      },
    ]);
    const render = renderScreen();

    await waitForForm(render.getByText);

    // There ARE published products; before selecting an order no notice shows.
    expect(
      render.queryByText(/No hay publicaciones activas esta semana/),
    ).toBeNull();

    // Selecting an order whose products do not match empties the filtered list.
    fireEvent.press(render.getByText('Elige un pedido…'));
    await waitFor(() => render.getByText(/Pedido #1/));
    fireEvent.press(render.getByText(/Pedido #1/));

    expect(
      await waitFor(() =>
        render.getByText(
          'El pedido seleccionado no tiene productos publicados. Elige otro pedido.',
        ),
      ),
    ).toBeTruthy();
    expect(
      render.queryByText(/No hay publicaciones activas esta semana/),
    ).toBeNull();
  });
});
