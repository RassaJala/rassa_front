/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Test files are less strict */
import React from 'react';

import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import ReceiptScreen from '@/screens/seller/ReceiptScreen';
import { mockPago } from '@/common/payment-fixtures';
import * as receipt from '@/common/receipt';
import { fetchPago } from '@/common/payments';

const mockGoBack = jest.fn();
const mockPopToTop = jest.fn();
const mockParams = { current: { paymentId: 9 } };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    popToTop: mockPopToTop,
  }),
  useRoute: () => ({
    params: mockParams.current,
    key: 'Receipt-test',
    name: 'Receipt',
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

jest.mock('expo-print', () => ({
  printAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/common/payments', () => ({
  ...jest.requireActual('@/common/payments'),
  fetchTiposPago: jest.fn(),
  createPago: jest.fn(),
  fetchPago: jest.fn(),
}));

const mockedFetchPago = fetchPago as jest.MockedFunction<typeof fetchPago>;

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReceiptScreen />
    </QueryClientProvider>,
  );
}

describe('ReceiptScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.current = { paymentId: 9 };
    mockedFetchPago.mockResolvedValue(mockPago);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders payment details after fetch', async () => {
    const { findByText, findAllByText } = renderScreen();

    expect(await findByText('Recibo de Pago')).toBeTruthy();
    await waitFor(() =>
      expect(mockedFetchPago).toHaveBeenCalledWith(expect.anything(), 9),
    );
    const folios = await findAllByText('PAG-0009');
    expect(folios.length).toBeGreaterThan(0);
    expect(await findByText('Manzana')).toBeTruthy();
  });

  it('shows error view when fetch fails', async () => {
    mockedFetchPago.mockRejectedValue(new Error('Network error'));

    const { findByText } = renderScreen();
    expect(await findByText(/Error al cargar el recibo/i)).toBeTruthy();
  });

  it('shows the error state and does not fetch when paymentId is invalid', async () => {
    mockParams.current = { paymentId: 'abc' as unknown as number };

    const { findByText } = renderScreen();
    expect(await findByText(/Error al cargar el recibo/i)).toBeTruthy();
    expect(mockedFetchPago).not.toHaveBeenCalled();
  });

  it('opens the print dialog with the real receipt HTML when PDF is pressed', async () => {
    const printAsync = jest.requireMock('expo-print').printAsync;

    const { findByText, getByLabelText } = renderScreen();
    expect(await findByText('Recibo de Pago')).toBeTruthy();

    const pdfBtn = getByLabelText('Imprimir recibo en PDF');
    fireEvent.press(pdfBtn);

    // buildReceiptHtml no está mockeado: el HTML que se imprime es el real.
    const printCall = printAsync.mock.calls[0][0] as { html: string };
    expect(printCall.html).toContain('PAG-0009');
    expect(printCall.html).toContain('Manzana');
    expect(printCall.html).toContain('$59.74');
  });

  it('muestra una alerta de error cuando la impresión del PDF falla', async () => {
    const printAsync = jest.requireMock('expo-print').printAsync;
    printAsync.mockRejectedValueOnce(new Error('print explosion'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { findByText, getByLabelText } = renderScreen();
    expect(await findByText('Recibo de Pago')).toBeTruthy();

    fireEvent.press(getByLabelText('Imprimir recibo en PDF'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(alertSpy).toHaveBeenCalledWith(
      'No se pudo imprimir',
      'Ocurrió un error al generar el PDF del recibo. Intentá de nuevo.',
    );
    expect(warnSpy).toHaveBeenCalled();
  });

  it('reintenta tras un fallo de impresión (el finally libera el semáforo)', async () => {
    const printAsync = jest.requireMock('expo-print').printAsync;
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { findByText, getByLabelText } = renderScreen();
    expect(await findByText('Recibo de Pago')).toBeTruthy();

    const pdfBtn = getByLabelText('Imprimir recibo en PDF');
    printAsync.mockRejectedValueOnce(new Error('first attempt fails'));
    fireEvent.press(pdfBtn);
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));

    // El finally liberó imprimiendoRef: un segundo tap vuelve a intentar.
    printAsync.mockResolvedValueOnce(undefined);
    fireEvent.press(pdfBtn);
    await waitFor(() => expect(printAsync).toHaveBeenCalledTimes(2));
  });

  it('ignora un doble tap: solo abre un diálogo de impresión por vez', async () => {
    const printAsync = jest.requireMock('expo-print').printAsync;
    printAsync.mockResolvedValue(undefined);

    const { findByText, getByLabelText } = renderScreen();
    expect(await findByText('Recibo de Pago')).toBeTruthy();

    const pdfBtn = getByLabelText('Imprimir recibo en PDF');
    fireEvent.press(pdfBtn);
    fireEvent.press(pdfBtn);

    await waitFor(() => expect(printAsync).toHaveBeenCalledTimes(1));
  });

  it('muestra la fila Ajuste en pantalla cuando hay descuento/recargo (misma historia que el PDF)', async () => {
    // Filas: 2 × 59.74 = 119.48; monto cobrado 210.98 → ajuste +$91.50.
    mockedFetchPago.mockResolvedValue({
      ...mockPago,
      monto: '210.98',
      total_pedido: '210.98',
    });

    const { findByText, findAllByText } = renderScreen();
    expect(await findByText('Recibo de Pago')).toBeTruthy();

    expect(await findByText('Ajuste')).toBeTruthy();
    expect(await findByText('+$91.50')).toBeTruthy();
    // '$119.48' aparece dos veces: importe de la fila Manzana y subtotal.
    expect((await findAllByText('$119.48')).length).toBeGreaterThan(0);
    // '$210.98' aparece en la fila informativa Total del pedido y en Total
    // pagado (R2-S), ya que total_pedido difiere del subtotal visible.
    expect((await findAllByText('$210.98')).length).toBeGreaterThan(0);
  });

  it('muestra la fila Total del pedido en pantalla cuando difiere de la suma (R2-S)', async () => {
    // Filas: 119.48; total_pedido 112.00 → fila informativa, misma que el PDF.
    mockedFetchPago.mockResolvedValue({
      ...mockPago,
      monto: '119.48',
      total_pedido: '112.00',
    });

    const { findByText } = renderScreen();
    expect(await findByText('Recibo de Pago')).toBeTruthy();

    expect(await findByText('Total del pedido')).toBeTruthy();
    expect(await findByText('$112.00')).toBeTruthy();
  });

  it('liberar el semáforo cuando buildReceiptHtml LANZA síncrono (R3-W2)', async () => {
    const printAsync = jest.requireMock('expo-print').printAsync;
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    // buildReceiptHtml es síncrono y puede lanzar ante datos corruptos: el
    // catch debe informar y NO dejar el botón muerto.
    const buildSpy = jest
      .spyOn(receipt, 'buildReceiptHtml')
      .mockImplementationOnce(() => {
        throw new Error('sync explosion');
      });

    const { findByText, getByLabelText } = renderScreen();
    expect(await findByText('Recibo de Pago')).toBeTruthy();

    const pdfBtn = getByLabelText('Imprimir recibo en PDF');
    fireEvent.press(pdfBtn);

    expect(buildSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      'No se pudo imprimir',
      'No se pudo generar el recibo. Intentá de nuevo.',
    );
    expect(warnSpy).toHaveBeenCalled();
    expect(printAsync).not.toHaveBeenCalled();

    // El catch liberó imprimiendoRef: un segundo tap vuelve a intentar con el
    // buildReceiptHtml real (mockImplementationOnce ya se consumió).
    fireEvent.press(pdfBtn);
    expect(printAsync).toHaveBeenCalledTimes(1);
  });
});
