import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
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

vi.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('../../components/layout/DataTable', () => ({
  DataTable: ({
    data,
    columns,
  }: {
    data: Array<Record<string, unknown>>;
    columns: Array<{
      key: string;
      render?: (item: Record<string, unknown>) => React.ReactNode;
    }>;
  }) => (
    <table>
      <tbody>
        {data.map((item) => (
          <tr key={String(item.id_pedido)}>
            {columns.map((col) => (
              <td key={col.key}>
                {col.render
                  ? col.render(item)
                  : String((item as Record<string, unknown>)[col.key] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

import api from '../../services/api';
import { VendorPanelScreen } from '../VendorPanelScreen';

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
};

const mockOrderReady = {
  id_pedido: 5,
  cliente_nombre: 'Cliente Test',
  total: '119.48',
  estado_actual: 'listo_para_retirar',
  creado_en: '2026-07-24T10:00:00Z',
};

const mockOrderPending = {
  id_pedido: 6,
  cliente_nombre: 'Cliente Dos',
  total: '90.00',
  estado_actual: 'pendiente',
  creado_en: '2026-07-24T10:00:00Z',
};

const mockOrderDelivered = {
  id_pedido: 7,
  cliente_nombre: 'Cliente Entregado',
  total: '85.00',
  estado_actual: 'entregado',
  creado_en: '2026-07-24T10:00:00Z',
};

const mockPago = {
  id_pago: 9,
  folio: 'PAG-0009',
  pedido: 7,
  tipo_pago: 1,
  tipo_pago_nombre: 'Efectivo',
  cliente_nombre: 'Cliente Entregado',
  cliente_id: 7,
  monto: '85.00',
  referencia: '',
  total_pedido: '85.00',
  productos: [],
  fecha_pago: '2026-07-30T12:00:00Z',
};

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <VendorPanelScreen />
    </QueryClientProvider>,
  );
}

describe('VendorPanelScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    mockedApi.get.mockResolvedValue({ data: { results: [] } });
    mockedApi.patch.mockResolvedValue({ data: {} });
  });

  it('navigates to payment page instead of PATCHing when order is listo_para_retirar', async () => {
    mockedApi.get.mockResolvedValue({
      data: { results: [mockOrderReady] },
    });
    const user = userEvent.setup();
    renderPanel();

    const cobrar = await screen.findByRole('button', { name: /Cobrar/i });
    await user.click(cobrar);

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/vendedor/cobrar/5'),
    );
    expect(mockedApi.patch).not.toHaveBeenCalled();
  });

  it('PATCHes next state when order is pendiente', async () => {
    mockedApi.get.mockResolvedValue({
      data: { results: [mockOrderPending] },
    });
    const user = userEvent.setup();
    renderPanel();

    const confirmar = await screen.findByRole('button', {
      name: /Confirmar/i,
    });
    await user.click(confirmar);

    await waitFor(() =>
      expect(mockedApi.patch).toHaveBeenCalledWith('/pedidos/6/status/', {
        nuevo_estado: 'confirmado',
      }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows Ver recibo on entregado orders and navigates to the receipt page', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { results: [mockOrderDelivered] },
    });
    mockedApi.get.mockResolvedValueOnce({ data: { results: [mockPago] } });
    const user = userEvent.setup();
    renderPanel();

    const verRecibo = await screen.findByRole('button', {
      name: /Ver recibo/i,
    });
    await user.click(verRecibo);

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/vendedor/recibo/9'),
    );
    expect(mockedApi.patch).not.toHaveBeenCalled();
  });

  it('shows an error toast when there is no payment for an entregado order', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { results: [mockOrderDelivered] },
    });
    mockedApi.get.mockResolvedValueOnce({ data: { results: [] } });
    const user = userEvent.setup();
    renderPanel();

    const verRecibo = await screen.findByRole('button', {
      name: /Ver recibo/i,
    });
    await user.click(verRecibo);

    expect(
      await screen.findByText(/No hay un recibo registrado/i),
    ).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
