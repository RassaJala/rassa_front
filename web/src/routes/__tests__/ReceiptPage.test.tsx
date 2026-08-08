import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
import { ReceiptPage } from '../ReceiptPage';

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

describe('ReceiptPage', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    mockNavigate.mockReset();
    mockParams.current = { paymentId: '9' };
    mockedFetchPago.mockResolvedValue(mockPago);
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
    const mockWin = {
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
      focus: vi.fn(),
      print: vi.fn(),
    };
    const openSpy = vi
      .spyOn(window, 'open')
      .mockReturnValue(mockWin as unknown as Window);

    renderPage();
    expect(await screen.findByText('Recibo de Pago')).toBeTruthy();

    const printer = screen.getByRole('button', { name: /Imprimir/i });
    printer.click();

    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    expect(mockWin.document.write).toHaveBeenCalled();
    expect(mockWin.document.close).toHaveBeenCalled();

    // La impresión se dispara recién cuando el popup termina de cargar.
    const onload = (mockWin as unknown as { onload: () => void }).onload;
    onload();
    expect(mockWin.print).toHaveBeenCalled();

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

    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    // Sin ventana no hay document.write ni print: solo la alerta al usuario.
    expect(alertSpy).toHaveBeenCalledWith(
      'Permite popups para este sitio para poder imprimir el recibo.',
    );
    alertSpy.mockRestore();
    openSpy.mockRestore();
  });

  it('imprime vía fallback por timeout cuando el popup nunca dispara onload', async () => {
    const mockWin = {
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
      focus: vi.fn(),
      print: vi.fn(),
    };
    const openSpy = vi
      .spyOn(window, 'open')
      .mockReturnValue(mockWin as unknown as Window);

    renderPage();
    expect(await screen.findByText('Recibo de Pago')).toBeTruthy();

    vi.useFakeTimers();
    const printer = screen.getByRole('button', { name: /Imprimir/i });
    printer.click();

    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    expect(mockWin.document.write).toHaveBeenCalled();
    // El evento onload nunca ocurre; el fallback setTimeout(doPrint, 400) debe imprimir.
    expect(mockWin.print).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(mockWin.print).toHaveBeenCalledTimes(1);
    // El guard printed evita dobles impresiones si el fallback vuelve a correr.
    vi.advanceTimersByTime(400);
    expect(mockWin.print).toHaveBeenCalledTimes(1);
    vi.useRealTimers();

    openSpy.mockRestore();
  });
});
