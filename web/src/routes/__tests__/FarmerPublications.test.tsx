import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    inputBorder: '#D6DAD4',
    surface: '#FFFFFF',
    bg: '#F5F7F0',
    fg: '#2D3328',
    accentBg: 'rgba(36,86,60,0.07)',
  }),
}));

const mockRefetch = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock('../../hooks/usePublications', () => ({
  usePublicaciones: vi.fn(),
  useDeletePublicacion: () => ({
    isPending: false,
    mutateAsync: mockMutateAsync,
  }),
  usePublishPublicacion: () => ({
    isPending: false,
    mutateAsync: mockMutateAsync,
  }),
  useClosePublicacion: () => ({
    isPending: false,
    mutateAsync: mockMutateAsync,
  }),
}));

import { usePublicaciones } from '../../hooks/usePublications';
import { FarmerPublications } from '../FarmerPublications';

const mockedUsePublicaciones = vi.mocked(usePublicaciones);

function fakePub(overrides: Record<string, unknown> = {}) {
  return {
    id_publicacion: 1,
    fk_agricultor: 10,
    fecha_publicacion: '2026-07-27',
    semana: 31,
    estado: 'borrador' as const,
    productos: [
      {
        id_producto_semanal: 100,
        fk_producto: 5,
        fk_unidad: 2,
        stock: 10,
        precio: '500.00',
        foto: null,
        estado: 'activo',
        creado_en: '2026-07-27T00:00:00Z',
      },
    ],
    creado_en: '2026-07-27T00:00:00Z',
    ...overrides,
  };
}

describe('FarmerPublications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading spinner when isLoading', () => {
    mockedUsePublicaciones.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: mockRefetch,
    } as never);
    const { container } = render(<FarmerPublications />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows error state with retry button', async () => {
    mockedUsePublicaciones.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    } as never);
    render(<FarmerPublications />);
    expect(screen.getByText('Error al cargar publicaciones')).toBeDefined();
    await userEvent.click(screen.getByText('Reintentar'));
    expect(mockRefetch).toHaveBeenCalledOnce();
  });

  it('shows empty state when no publications', () => {
    mockedUsePublicaciones.mockReturnValue({
      data: { data: { results: [] } },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as never);
    render(<FarmerPublications />);
    expect(screen.getByText('No hay publicaciones')).toBeDefined();
    const btns = screen.getAllByText('+ Nueva publicación');
    expect(btns.length).toBeGreaterThanOrEqual(1);
  });

  it('renders publications in both desktop and mobile views', () => {
    mockedUsePublicaciones.mockReturnValue({
      data: { data: { results: [fakePub()] } },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as never);
    render(<FarmerPublications />);

    const semanaEls = screen.getAllByText('Semana 31');
    expect(semanaEls.length).toBe(2);

    const statusEls = screen.getAllByText('Borrador');
    expect(statusEls.length).toBe(2);

    const productoEls = screen.getAllByText('1 producto');
    expect(productoEls.length).toBe(2);
  });

  it('navigates to new publication on button click', async () => {
    mockedUsePublicaciones.mockReturnValue({
      data: { data: { results: [] } },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as never);
    render(<FarmerPublications />);
    const btns = screen.getAllByText('+ Nueva publicación');
    await userEvent.click(btns[0]!);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/agricultor/publicaciones/nueva',
    );
  });

  it('calls delete when confirm is accepted', async () => {
    mockedUsePublicaciones.mockReturnValue({
      data: { data: { results: [fakePub()] } },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as never);
    mockMutateAsync.mockResolvedValue(undefined);
    render(<FarmerPublications />);
    await userEvent.click(screen.getAllByText('Eliminar')[0]!);
    expect(
      await screen.findByRole('heading', { name: 'Eliminar publicación' }),
    ).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByText('Eliminar'));
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(1);
    });
  });

  it('calls publish', async () => {
    mockedUsePublicaciones.mockReturnValue({
      data: { data: { results: [fakePub()] } },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as never);
    mockMutateAsync.mockResolvedValue(undefined);
    render(<FarmerPublications />);
    const btns = screen.getAllByText('Publicar');
    await userEvent.click(btns[0]!);
    expect(mockMutateAsync).toHaveBeenCalledWith(1);
  });

  it('does not call mutate when confirm is rejected', async () => {
    mockedUsePublicaciones.mockReturnValue({
      data: { data: { results: [fakePub()] } },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as never);
    render(<FarmerPublications />);
    const actionBtns = screen.getAllByText('Eliminar');
    await userEvent.click(actionBtns[0]!);
    await userEvent.click(await screen.findByText('Cancelar'));
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('calls close for published publications', async () => {
    mockedUsePublicaciones.mockReturnValue({
      data: { data: { results: [fakePub({ estado: 'publicado' })] } },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as never);
    mockMutateAsync.mockResolvedValue(undefined);
    render(<FarmerPublications />);
    await userEvent.click(screen.getAllByText('Cerrar')[0]!);
    expect(
      await screen.findByRole('heading', { name: 'Cerrar publicación' }),
    ).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByText('Cerrar'));
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(1);
    });
  });

  it('shows toast on mutation error', async () => {
    mockedUsePublicaciones.mockReturnValue({
      data: { data: { results: [fakePub()] } },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as never);
    mockMutateAsync.mockRejectedValue(new Error('fail'));
    render(<FarmerPublications />);
    const btns = screen.getAllByText('Publicar');
    await userEvent.click(btns[0]!);
    expect(await screen.findByText('fail')).toBeDefined();
  });
});
