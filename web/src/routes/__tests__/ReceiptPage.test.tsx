import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockParams = { current: { paymentId: '9' } };

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams.current,
}));

vi.mock('../../hooks/useAppColors', () => ({
  useAppColors: () => ({
    isDark: false,
    brand: '#24563C',
    coral: '#DE393A',
    muted: '#5E6B5E',
    border: '#E2E6DF',
    surface: '#FFFFFF',
    bg: '#F5F7F0',
    fg: '#2D3328',
    accentBg: 'rgba(36,86,60,0.07)',
  }),
}));

vi.mock('@/common/payments', async () => ({
  ...(await vi.importActual('@/common/payments')),
  fetchTiposPago: vi.fn(),
  createPago: vi.fn(),
  fetchPago: vi.fn(),
}));

import { fetchPago } from '@/common/payments';
import { PRINT_FALLBACK_MS, ReceiptPage } from '../ReceiptPage';

const mockedFetchPago = vi.mocked(fetchPago);

const mockPago = {
  id_pago: 9,
  folio: 'PAG-0009',
  pedido: 5,
  tipo_pago: 1,
  tipo_pago_nombre: 'Efectivo',
  cliente_nombre: 'Cliente Test',
  cliente_id: 4,
  monto: '119.48',
  referencia: 'TEST-001',
  total_pedido: '119.48',
  productos: [{ nombre: 'Manzana', precio: '59.74', cantidad: 2 }],
  fecha_pago: '2026-07-30T12:00:00Z',
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReceiptPage />
    </QueryClientProvider>,
  );
}

/** Mock de Window con soporte afterprint/matchMedia para el popup. */
function makeMockWin(
  overrides: {
    readonly readyState?: string;
    readonly print?: () => void;
    readonly write?: () => void;
  } = {},
) {
  const listeners = {
    print: [] as Array<(event: MediaQueryListEvent) => void>,
  };
  return {
    document: {
      write: overrides.write ? vi.fn(overrides.write) : vi.fn(),
      close: vi.fn(),
      readyState: overrides.readyState ?? 'complete',
    },
    focus: vi.fn(),
    print: overrides.print ? vi.fn(overrides.print) : vi.fn(),
    close: vi.fn(),
    matchMedia: (query: string) => {
      if (query !== 'print') return { matches: false };
      return {
        matches: false,
        addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
          listeners.print.push(cb);
        },
        removeEventListener: (
          _: string,
          cb: (e: MediaQueryListEvent) => void,
        ) => {
          listeners.print = listeners.print.filter((l) => l !== cb);
        },
      };
    },
    /** Helper de test: dispara el cambio de matchMedia('print') que cierra. */
    firePrintExit() {
      for (const cb of [...listeners.print]) {
        cb({ matches: false } as MediaQueryListEvent);
      }
    },
  } as unknown as Window & { firePrintExit: () => void } & Record<
      string,
      unknown
    >;
}

describe('ReceiptPage', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    mockNavigate.mockReset();
    mockParams.current = { paymentId: '9' };
    mockedFetchPago.mockResolvedValue(mockPago);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders payment details after fetch', async () => {
    renderPage();

    expect(await screen.findByText('Recibo de Pago')).toBeTruthy();
    await waitFor(() =>
      expect(mockedFetchPago).toHaveBeenCalledWith(expect.anything(), 9),
    );
    expect((await screen.findAllByText('PAG-0009')).length).toBeGreaterThan(0);
    expect(screen.getByText('Pago Registrado')).toBeTruthy();
    expect(screen.getByText('Productos')).toBeTruthy();
    expect(screen.getByText('Resumen del pago')).toBeTruthy();
    expect(screen.getByText('Manzana')).toBeTruthy();
    expect(screen.getByText('Cliente Test')).toBeTruthy();
    expect(screen.getByText('Total pagado')).toBeTruthy();
  });

  it('renders product rows with quantity, price and subtotal', async () => {
    renderPage();

    expect(await screen.findByText('Manzana')).toBeTruthy();
    // Quantity 2x and $59.74 each => importe $119.48 (también en Total pagado)
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('$59.74')).toBeTruthy();
    expect(
      (await screen.findAllByText('$119.48')).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('shows error view when fetch fails', async () => {
    mockedFetchPago.mockRejectedValue(new Error('Network error'));

    renderPage();
    expect(await screen.findByText(/Error al cargar el recibo/i)).toBeTruthy();
  });

  it('shows the error state and does not fetch when paymentId is invalid', async () => {
    mockParams.current = { paymentId: 'abc' };
    renderPage();

    expect(await screen.findByText(/Error al cargar el recibo/i)).toBeTruthy();
    expect(mockedFetchPago).not.toHaveBeenCalled();
  });

  it('opens a printable window with the receipt HTML when Imprimir is clicked', async () => {
    const mockWin = makeMockWin();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockWin);

    renderPage();
    expect(await screen.findByText('Recibo de Pago')).toBeTruthy();

    const printer = screen.getByRole('button', { name: /Imprimir/i });
    printer.click();

    expect(openSpy).toHaveBeenCalledWith('', '_blank', 'noopener');
    expect(mockWin.document.write).toHaveBeenCalled();
    expect(mockWin.document.close).toHaveBeenCalled();

    // La impresión se dispara recién cuando el popup termina de cargar.
    const onload = (mockWin as unknown as { onload: () => void }).onload;
    onload();
    expect(mockWin.print).toHaveBeenCalled();

    // En Safari print() no bloquea: el popup NO se cierra en el acto, se
    // cierra cuando matchMedia('print') sale del modo impresión.
    expect(mockWin.close).not.toHaveBeenCalled();
    (mockWin as unknown as { firePrintExit: () => void }).firePrintExit();
    expect(mockWin.close).toHaveBeenCalledTimes(1);

    const html = (
      mockWin.document.write as unknown as { mock: { calls: string[][] } }
    ).mock.calls[0][0] as string;
    expect(html).toContain('PAG-0009');
    expect(html).toContain('Manzana');
    expect(html).toContain('RASSA');
    // Montos reales del mock: 2 × $59.74 = $119.48 (importe, subtotal y total).
    expect(html).toContain('$59.74');
    expect(html).toContain('$119.48');
    openSpy.mockRestore();
  });

  it('muestra alerta cuando el popup está bloqueado (window.open devuelve null)', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    renderPage();
    expect(await screen.findByText('Recibo de Pago')).toBeTruthy();

    const printer = screen.getByRole('button', { name: /Imprimir/i });
    printer.click();

    expect(openSpy).toHaveBeenCalledWith('', '_blank', 'noopener');
    // Sin ventana no hay document.write ni print: solo la alerta al usuario.
    expect(alertSpy).toHaveBeenCalledWith(
      'Permite popups para este sitio para poder imprimir el recibo.',
    );
    alertSpy.mockRestore();
    openSpy.mockRestore();
  });

  it('muestra alerta cuando window.open LANZA (popup bloqueado con excepción)', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {
      throw new Error('blocked by browser');
    });

    renderPage();
    expect(await screen.findByText('Recibo de Pago')).toBeTruthy();

    const printer = screen.getByRole('button', { name: /Imprimir/i });
    printer.click();

    // El catch interno captura la excepción y cae en la misma alerta que null.
    expect(alertSpy).toHaveBeenCalledWith(
      'Permite popups para este sitio para poder imprimir el recibo.',
    );
    alertSpy.mockRestore();
    openSpy.mockRestore();
  });

  it('imprime vía fallback por timeout cuando el popup nunca dispara onload', async () => {
    const mockWin = makeMockWin();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockWin);

    renderPage();
    expect(await screen.findByText('Recibo de Pago')).toBeTruthy();

    vi.useFakeTimers();
    const printer = screen.getByRole('button', { name: /Imprimir/i });
    printer.click();

    expect(openSpy).toHaveBeenCalledWith('', '_blank', 'noopener');
    expect(mockWin.document.write).toHaveBeenCalled();
    // El evento onload nunca ocurre; el fallback setTimeout(doPrint, PRINT_FALLBACK_MS) debe imprimir.
    expect(mockWin.print).not.toHaveBeenCalled();
    vi.advanceTimersByTime(PRINT_FALLBACK_MS);
    expect(mockWin.print).toHaveBeenCalledTimes(1);
    // El popup no se cierra en el acto; se cierra en la salida de impresión.
    expect(mockWin.close).not.toHaveBeenCalled();
    (mockWin as unknown as { firePrintExit: () => void }).firePrintExit();
    expect(mockWin.close).toHaveBeenCalledTimes(1);
    // El guard printed evita dobles impresiones si el fallback vuelve a correr.
    vi.advanceTimersByTime(PRINT_FALLBACK_MS);
    expect(mockWin.print).toHaveBeenCalledTimes(1);
    vi.useRealTimers();

    openSpy.mockRestore();
  });

  it('re-programa la impresión mientras readyState siga en loading', async () => {
    const mockWin = makeMockWin({ readyState: 'loading' });
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockWin);

    renderPage();
    expect(await screen.findByText('Recibo de Pago')).toBeTruthy();

    vi.useFakeTimers();
    const printer = screen.getByRole('button', { name: /Imprimir/i });
    printer.click();

    // Primer fallback: el documento aún carga → no imprime, se reprograma.
    vi.advanceTimersByTime(PRINT_FALLBACK_MS);
    expect(mockWin.print).not.toHaveBeenCalled();

    // El documento terminó de cargar → el siguiente fallback imprime.
    mockWin.document.readyState = 'complete';
    vi.advanceTimersByTime(PRINT_FALLBACK_MS);
    expect(mockWin.print).toHaveBeenCalledTimes(1);
    expect(mockWin.close).not.toHaveBeenCalled();
    (mockWin as unknown as { firePrintExit: () => void }).firePrintExit();
    expect(mockWin.close).toHaveBeenCalledTimes(1);
    vi.useRealTimers();

    openSpy.mockRestore();
  });

  it('desacopla la ventana nueva del opener (no retiene referencias)', async () => {
    const mockWin = makeMockWin();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockWin);

    renderPage();
    expect(await screen.findByText('Recibo de Pago')).toBeTruthy();

    const printer = screen.getByRole('button', { name: /Imprimir/i });
    printer.click();

    expect((mockWin as unknown as { opener: unknown }).opener).toBeNull();

    const onload = (mockWin as unknown as { onload: () => void }).onload;
    onload();
    expect(mockWin.print).toHaveBeenCalledTimes(1);
    openSpy.mockRestore();
  });

  it('no abre dos popups con doble clic en Imprimir', async () => {
    const mockWin = makeMockWin();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockWin);

    renderPage();
    expect(await screen.findByText('Recibo de Pago')).toBeTruthy();

    // La ventana de guard del semáforo (PRINT_FALLBACK_MS*3) se controla con
    // fake timers para poder liberarla sin esperar en tiempo real.
    vi.useFakeTimers();
    const printer = screen.getByRole('button', { name: /Imprimir/i });
    printer.click();
    printer.click();

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(mockWin.document.write).toHaveBeenCalledTimes(1);

    // El semáforo se libera y un clic posterior (no doble clic) imprime de nuevo.
    vi.advanceTimersByTime(PRINT_FALLBACK_MS * 3);
    printer.click();
    expect(openSpy).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
    openSpy.mockRestore();
  });

  it('pantalla y PDF usan el mismo subtotal (consistencia con descuentos)', async () => {
    // Filas: 2×59.74 + 3×30.50 = 210.98; monto cobrado 119.48; total_pedido 112.00.
    mockedFetchPago.mockResolvedValue({
      ...mockPago,
      monto: '119.48',
      total_pedido: '112.00',
      productos: [
        { nombre: 'Manzana', precio: '59.74', cantidad: 2 },
        { nombre: 'Plátano', precio: '30.50', cantidad: 3 },
      ],
    });
    const mockWin = makeMockWin();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockWin);

    renderPage();
    expect(await screen.findByText('Manzana')).toBeTruthy();

    // La pantalla muestra el subtotal como suma de filas Y la fila Ajuste
    // (misma historia que el PDF, R2-W2).
    expect((await screen.findAllByText('$210.98')).length).toBeGreaterThan(0);
    expect(screen.getByText('Ajuste')).toBeTruthy();
    expect(screen.getByText('−$91.50')).toBeTruthy();

    const printer = screen.getByRole('button', { name: /Imprimir/i });
    printer.click();

    const html = (
      mockWin.document.write as unknown as { mock: { calls: string[][] } }
    ).mock.calls[0][0] as string;
    // El PDF usa el MISMO subtotal (suma de filas), más ajuste y total informativo.
    expect(html).toContain('$210.98');
    expect(html).toContain('−$91.50');
    expect(html).toContain('Total del pedido');
    expect(html).toContain('$112.00');
    expect(html).toContain('<strong>$119.48</strong>');
    openSpy.mockRestore();
  });

  it('alerta y loguea el error cuando document.write lanza', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockWin = makeMockWin({
      write: () => {
        throw new Error('write failed');
      },
    });
    vi.spyOn(window, 'open').mockReturnValue(mockWin);

    renderPage();
    expect(await screen.findByText('Recibo de Pago')).toBeTruthy();

    screen.getByRole('button', { name: /Imprimir/i }).click();

    expect(
      (mockWin as unknown as { document: { write: () => void } }).document
        .write,
    ).toHaveBeenCalled();
    expect(mockWin.print).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'No se pudo imprimir el recibo. Inténtalo de nuevo.',
    );
  });

  it('alerta y loguea el error cuando win.print() lanza', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockWin = makeMockWin({
      print: () => {
        throw new Error('print failed');
      },
    });
    vi.spyOn(window, 'open').mockReturnValue(mockWin);

    renderPage();
    expect(await screen.findByText('Recibo de Pago')).toBeTruthy();

    screen.getByRole('button', { name: /Imprimir/i }).click();

    const onload = (mockWin as unknown as { onload: () => void }).onload;
    onload();
    expect(
      (mockWin as unknown as { print: () => void }).print,
    ).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'No se pudo imprimir el recibo. Inténtalo de nuevo.',
    );
  });
});
