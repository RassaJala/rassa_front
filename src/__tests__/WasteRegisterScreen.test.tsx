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

function renderScreen() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
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
});
