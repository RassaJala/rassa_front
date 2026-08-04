import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockParams = { current: {} as { id?: string } };

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
    inputBorder: '#D6DAD4',
    surface: '#FFFFFF',
    bg: '#F5F7F0',
    fg: '#2D3328',
    accentBg: 'rgba(36,86,60,0.07)',
  }),
}));

vi.mock('../../utils/persistItems', () => ({
  persistItems: vi.fn(),
}));

vi.mock('../../utils/publishAfterPersist', () => ({
  publishAfterPersist: vi.fn(),
}));

// Editing/creating is only allowed on Mondays; tests simulate the allowed day
// by default, and flip `mockIsMondayToday` to false to exercise the lock
// screen (C2: the gate must be testable, not hidden by a hardcoded true).
let mockIsMondayToday = true;

vi.mock('../../utils/publicationWizard', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../utils/publicationWizard')>();
  return { ...actual, isMondayToday: () => mockIsMondayToday };
});

vi.mock('../../hooks/usePublications', () => ({
  usePublicacion: vi.fn(),
  useProductosSemanales: vi.fn(),
  useCatalogProductos: vi.fn(),
  useUnidades: vi.fn(),
  useCreatePublicacion: vi.fn(),
  usePublishPublicacion: vi.fn(),
  useAddProductoSemanal: vi.fn(),
  useUpdateProductoSemanal: vi.fn(),
  useDeleteProductoSemanal: vi.fn(),
  useUploadProductoSemanalImagen: vi.fn(),
}));

import {
  usePublicacion,
  useProductosSemanales,
  useCatalogProductos,
  useUnidades,
  useCreatePublicacion,
  usePublishPublicacion,
  useAddProductoSemanal,
  useUpdateProductoSemanal,
  useDeleteProductoSemanal,
} from '../../hooks/usePublications';
import { persistItems } from '../../utils/persistItems';
import { publishAfterPersist } from '../../utils/publishAfterPersist';
import { PublicationWizard } from '../PublicationWizard';

const mockedUsePublicacion = vi.mocked(usePublicacion);
const mockedUseProductosSemanales = vi.mocked(useProductosSemanales);
const mockedUseCatalogProductos = vi.mocked(useCatalogProductos);
const mockedUseUnidades = vi.mocked(useUnidades);
const mockedUseCreatePublicacion = vi.mocked(useCreatePublicacion);
const mockedUsePublishPublicacion = vi.mocked(usePublishPublicacion);
const mockedUseAddProductoSemanal = vi.mocked(useAddProductoSemanal);
const mockedUseUpdateProductoSemanal = vi.mocked(useUpdateProductoSemanal);
const mockedUseDeleteProductoSemanal = vi.mocked(useDeleteProductoSemanal);
const mockedPersistItems = vi.mocked(persistItems);
const mockedPublishAfterPersist = vi.mocked(publishAfterPersist);

const FAKE_CATALOG = {
  data: {
    results: [
      {
        id_producto: 1,
        nombre_producto: 'Tomate',
        precio: '500',
        stock: 100,
        imagen: null,
        imagen_principal: null,
      },
      {
        id_producto: 2,
        nombre_producto: 'Lechuga',
        precio: '300',
        stock: 50,
        imagen: null,
        imagen_principal: null,
      },
    ],
  },
};

const FAKE_UNIDADES = {
  data: [
    { id_unidad: 1, tipo: 'kg' },
    { id_unidad: 2, tipo: 'unidad' },
  ],
};

const FAKE_PUBLICACION = {
  data: {
    id_publicacion: 1,
    fk_agricultor: 10,
    fecha_publicacion: '2026-07-27',
    semana: 31,
    estado: 'borrador' as const,
    productos: [
      {
        id_producto_semanal: 100,
        fk_producto: 1,
        fk_unidad: 1,
        stock: 10,
        precio: '500.00',
        foto: null,
        estado: 'activo',
        creado_en: '2026-07-27T00:00:00Z',
      },
    ],
    creado_en: '2026-07-27T00:00:00Z',
  },
};

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function getAddBtn() {
  return screen.getAllByText('+ Agregar producto')[0]!;
}

function setupHooks() {
  mockedUsePublicacion.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);

  mockedUseProductosSemanales.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);

  mockedUseCatalogProductos.mockReturnValue({
    data: FAKE_CATALOG,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);

  mockedUseUnidades.mockReturnValue({
    data: FAKE_UNIDADES,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);

  const mockMutateAsync = vi
    .fn()
    .mockResolvedValue({ data: { id_producto_semanal: 999 } });

  mockedUseCreatePublicacion.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue(FAKE_PUBLICACION),
    isPending: false,
  } as never);

  mockedUsePublishPublicacion.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  } as never);

  mockedUseAddProductoSemanal.mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
  } as never);

  mockedUseUpdateProductoSemanal.mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
  } as never);

  mockedUseDeleteProductoSemanal.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  } as never);
}

async function addItemAndFill(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText('Siguiente →'));
  await user.click(getAddBtn());
  await user.click(screen.getByText('Tomate'));
  const stockInput = screen.getByPlaceholderText('0');
  const precioInput = screen.getByPlaceholderText('0.00');
  await user.clear(stockInput);
  await user.type(stockInput, '10');
  await user.clear(precioInput);
  await user.type(precioInput, '500');
  await user.selectOptions(screen.getByRole('combobox'), '1');
}

describe('PublicationWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.current = {};
    mockIsMondayToday = true;
    setupHooks();
    mockedPersistItems.mockResolvedValue({ orphanFailures: 0 });
    mockedPublishAfterPersist.mockResolvedValue(undefined);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('new publication', () => {
    it('renders step 1 (FechaStep) with week info', () => {
      render(<PublicationWizard />, { wrapper: createWrapper() });
      expect(screen.getByText('Fecha de publicación')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /Semana \d+/ }),
      ).toBeInTheDocument();
    });

    it('renders FechaStep even when catalog is still loading', () => {
      mockedUseCatalogProductos.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
      } as never);
      render(<PublicationWizard />, { wrapper: createWrapper() });
      expect(screen.getByText('Fecha de publicación')).toBeInTheDocument();
    });

    it('can navigate from Fecha to Productos step', async () => {
      const user = userEvent.setup();
      render(<PublicationWizard />, { wrapper: createWrapper() });
      await user.click(screen.getByText('Siguiente →'));
      expect(screen.getByText('Productos (0)')).toBeInTheDocument();
    });

    it('block navigation to Resumen when Productos has no items', async () => {
      const user = userEvent.setup();
      render(<PublicationWizard />, { wrapper: createWrapper() });
      await user.click(screen.getByText('Siguiente →'));
      const nextBtn = screen.getByText('Siguiente →');
      expect(nextBtn.closest('button')).toBeDisabled();
    });

    it('adds item via ProductPickerModal', async () => {
      const user = userEvent.setup();
      render(<PublicationWizard />, { wrapper: createWrapper() });
      await user.click(screen.getByText('Siguiente →'));
      await user.click(getAddBtn());
      expect(screen.getByText('Seleccionar producto')).toBeInTheDocument();
      await user.click(screen.getByText('Tomate'));
      await waitFor(() => {
        expect(
          screen.queryByText('Seleccionar producto'),
        ).not.toBeInTheDocument();
      });
      expect(screen.getByText('Productos (1)')).toBeInTheDocument();
    });

    it('fills item fields and advances through all steps', async () => {
      const user = userEvent.setup();
      render(<PublicationWizard />, { wrapper: createWrapper() });
      await addItemAndFill(user);
      await user.click(screen.getByText('Siguiente →'));
      expect(
        screen.getByRole('heading', { name: 'Resumen' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText('1 producto en la publicación'),
      ).toBeInTheDocument();
      await user.click(screen.getByText('Siguiente →'));
      expect(
        screen.getByRole('heading', { name: 'Publicar' }),
      ).toBeInTheDocument();
      expect(screen.getByText(/¿Publicar la semana/)).toBeInTheDocument();
    });

    it('shows validation error when item has invalid data', async () => {
      const user = userEvent.setup();
      render(<PublicationWizard />, { wrapper: createWrapper() });
      await user.click(screen.getByText('Siguiente →'));
      await user.click(getAddBtn());
      await user.click(screen.getByText('Tomate'));
      const stockInput = screen.getByPlaceholderText('0');
      const precioInput = screen.getByPlaceholderText('0.00');
      await user.clear(stockInput);
      await user.type(stockInput, '0');
      await user.clear(precioInput);
      await user.type(precioInput, '0');
      await user.click(screen.getByText('Siguiente →'));
      expect(screen.getByText('Stock debe ser mayor a 0.')).toBeInTheDocument();
      expect(
        screen.getByText('Precio debe ser mayor a 0.'),
      ).toBeInTheDocument();
      expect(screen.getByText('Seleccioná una unidad.')).toBeInTheDocument();
    });

    it('can jump back to previous steps via step indicator', async () => {
      const user = userEvent.setup();
      render(<PublicationWizard />, { wrapper: createWrapper() });
      await user.click(screen.getByText('Siguiente →'));
      expect(screen.getByText('Productos (0)')).toBeInTheDocument();
      const stepBtns = screen.getAllByText(
        (content, el) => el?.tagName === 'BUTTON' && content.includes('Fecha'),
      );
      await user.click(stepBtns[0]!);
      expect(screen.getByText('Fecha de publicación')).toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    beforeEach(() => {
      mockParams.current = { id: '1' };
    });

    it('shows loading spinner when pubQuery is loading', () => {
      mockedUsePublicacion.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
      } as never);
      mockedUseProductosSemanales.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
      } as never);
      render(<PublicationWizard />, { wrapper: createWrapper() });
      expect(document.querySelector('.animate-spin')).toBeTruthy();
    });

    it('shows error state with retry when pubQuery fails', async () => {
      const mockRefetch = vi.fn();
      mockedUsePublicacion.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('fail'),
        refetch: mockRefetch,
      } as never);
      mockedUseProductosSemanales.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never);
      const user = userEvent.setup();
      render(<PublicationWizard />, { wrapper: createWrapper() });
      expect(
        screen.getByText('No se pudo cargar la publicación.'),
      ).toBeInTheDocument();
      await user.click(screen.getByText('Reintentar'));
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('shows error state when itemsQuery fails', () => {
      mockedUsePublicacion.mockReturnValue({
        data: FAKE_PUBLICACION,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never);
      mockedUseProductosSemanales.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('fail'),
        refetch: vi.fn(),
      } as never);
      render(<PublicationWizard />, { wrapper: createWrapper() });
      expect(
        screen.getByText(
          'No se pudieron cargar los productos de la publicación.',
        ),
      ).toBeInTheDocument();
    });

    it('shows empty state when edit mode has zero items', async () => {
      mockedUsePublicacion.mockReturnValue({
        data: {
          ...FAKE_PUBLICACION,
          data: { ...FAKE_PUBLICACION.data, productos: [] },
        },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never);
      mockedUseProductosSemanales.mockReturnValue({
        data: { data: { results: [] } },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never);
      const user = userEvent.setup();
      render(<PublicationWizard />, { wrapper: createWrapper() });
      await user.click(screen.getByText('Siguiente →'));
      expect(screen.getByText('No hay productos')).toBeInTheDocument();
    });
  });

  describe('item management', () => {
    it('adds and removes items', async () => {
      const user = userEvent.setup();
      render(<PublicationWizard />, { wrapper: createWrapper() });
      await user.click(screen.getByText('Siguiente →'));
      await user.click(getAddBtn());
      await user.click(screen.getByText('Tomate'));
      expect(screen.getByText('Productos (1)')).toBeInTheDocument();
      await user.click(getAddBtn());
      await user.click(screen.getByText('Lechuga'));
      expect(screen.getByText('Productos (2)')).toBeInTheDocument();
      const removeBtns = screen.getAllByText('✕');
      await user.click(removeBtns[0]!);
      expect(screen.getByText('Productos (1)')).toBeInTheDocument();
    });

    it('prevents duplicate product from picker', async () => {
      const user = userEvent.setup();
      render(<PublicationWizard />, { wrapper: createWrapper() });
      await user.click(screen.getByText('Siguiente →'));
      await user.click(getAddBtn());
      await user.click(screen.getByText('Tomate'));
      await user.click(getAddBtn());
      expect(
        screen.queryByRole('heading', { name: 'Seleccionar producto' }),
      ).toBeInTheDocument();
      expect(screen.queryByText('Lechuga')).toBeInTheDocument();
    });

    it('updates item stock, precio, and unidad fields', async () => {
      const user = userEvent.setup();
      render(<PublicationWizard />, { wrapper: createWrapper() });
      await user.click(screen.getByText('Siguiente →'));
      await user.click(getAddBtn());
      await user.click(screen.getByText('Tomate'));
      const stockInput = screen.getByPlaceholderText('0');
      const precioInput = screen.getByPlaceholderText('0.00');
      await user.clear(stockInput);
      await user.type(stockInput, '25');
      await user.clear(precioInput);
      await user.type(precioInput, '750');
      await user.selectOptions(screen.getByRole('combobox'), '2');
      expect(stockInput).toHaveValue(25);
      expect(precioInput).toHaveValue(750);
    });
  });

  describe('save draft', () => {
    it('triggers persist flow from Publicar step', async () => {
      const createMutateAsync = vi.fn().mockResolvedValue(FAKE_PUBLICACION);
      mockedUseCreatePublicacion.mockReturnValue({
        mutateAsync: createMutateAsync,
        isPending: false,
      } as never);
      const user = userEvent.setup();
      render(<PublicationWizard />, { wrapper: createWrapper() });
      await addItemAndFill(user);
      await user.click(screen.getByText('Siguiente →'));
      await user.click(screen.getByText('Siguiente →'));
      await user.click(screen.getByText('Guardar borrador'));
      await waitFor(
        () => {
          expect(screen.getByText('Borrador guardado.')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it('shows saving state while persisting', async () => {
      let resolvePersist: (v: { orphanFailures: number }) => void;
      mockedPersistItems.mockReturnValue(
        new Promise((resolve) => {
          resolvePersist = resolve;
        }),
      );
      const createMutateAsync = vi.fn().mockResolvedValue(FAKE_PUBLICACION);
      mockedUseCreatePublicacion.mockReturnValue({
        mutateAsync: createMutateAsync,
        isPending: false,
      } as never);
      const user = userEvent.setup();
      render(<PublicationWizard />, { wrapper: createWrapper() });
      await addItemAndFill(user);
      await user.click(screen.getByText('Siguiente →'));
      await user.click(screen.getByText('Siguiente →'));
      await user.click(screen.getByText('Guardar borrador'));
      expect(screen.getByText('Guardando…')).toBeInTheDocument();
      resolvePersist!({ orphanFailures: 0 });
      await waitFor(() => {
        expect(screen.queryByText('Guardando…')).not.toBeInTheDocument();
      });
    });

    it('shows error on persist failure', async () => {
      const createMutateAsync = vi
        .fn()
        .mockRejectedValue(new Error('Network error'));
      mockedUseCreatePublicacion.mockReturnValue({
        mutateAsync: createMutateAsync,
        isPending: false,
      } as never);
      const user = userEvent.setup();
      render(<PublicationWizard />, { wrapper: createWrapper() });
      await addItemAndFill(user);
      await user.click(screen.getByText('Siguiente →'));
      await user.click(screen.getByText('Siguiente →'));
      await user.click(screen.getByText('Guardar borrador'));
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('disables save button when publish button is visible with valid items', async () => {
      const user = userEvent.setup();
      render(<PublicationWizard />, { wrapper: createWrapper() });
      await addItemAndFill(user);
      await user.click(screen.getByText('Siguiente →'));
      await user.click(screen.getByText('Siguiente →'));
      const saveBtn = screen.getByText('Guardar borrador');
      expect(saveBtn.closest('button')).not.toBeDisabled();
    });

    it('allows advancing after fixing item validation errors', async () => {
      const user = userEvent.setup();
      render(<PublicationWizard />, { wrapper: createWrapper() });
      await user.click(screen.getByText('Siguiente →'));
      await user.click(getAddBtn());
      await user.click(screen.getByText('Tomate'));
      const stockInput = screen.getByPlaceholderText('0');
      const precioInput = screen.getByPlaceholderText('0.00');
      await user.clear(stockInput);
      await user.type(stockInput, '10');
      await user.clear(precioInput);
      await user.type(precioInput, '500');
      await user.selectOptions(screen.getByRole('combobox'), '1');
      await user.click(screen.getByText('Siguiente →'));
      expect(
        screen.getByRole('heading', { name: 'Resumen' }),
      ).toBeInTheDocument();
    });
  });

  describe('publish', () => {
    it('shows publish button enabled with valid items', async () => {
      const user = userEvent.setup();
      render(<PublicationWizard />, { wrapper: createWrapper() });
      await addItemAndFill(user);
      await user.click(screen.getByText('Siguiente →'));
      await user.click(screen.getByText('Siguiente →'));
      const publishBtn = screen.getByText('🚀 Publicar');
      expect(publishBtn.closest('button')).not.toBeDisabled();
    });

    it('triggers persist and publish flow', async () => {
      const user = userEvent.setup();
      render(<PublicationWizard />, { wrapper: createWrapper() });
      await addItemAndFill(user);
      await user.click(screen.getByText('Siguiente →'));
      await user.click(screen.getByText('Siguiente →'));
      await user.click(screen.getByText('🚀 Publicar'));
      await waitFor(() => {
        expect(screen.getByText('¡Publicación publicada!')).toBeInTheDocument();
      });
      expect(mockedPersistItems).toHaveBeenCalled();
      expect(mockedPublishAfterPersist).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('shows invalid ID state', () => {
      mockParams.current = { id: 'abc' };
      render(<PublicationWizard />, { wrapper: createWrapper() });
      expect(
        screen.getByText('ID de publicación inválido.'),
      ).toBeInTheDocument();
    });

    it('shows invalid ID for negative ID', () => {
      mockParams.current = { id: '-1' };
      render(<PublicationWizard />, { wrapper: createWrapper() });
      expect(
        screen.getByText('ID de publicación inválido.'),
      ).toBeInTheDocument();
    });

    it('navigates back from invalid ID', async () => {
      const user = userEvent.setup();
      mockParams.current = { id: 'abc' };
      render(<PublicationWizard />, { wrapper: createWrapper() });
      await user.click(screen.getByText('Volver'));
      expect(mockNavigate).toHaveBeenCalledWith('/agricultor/publicaciones');
    });

    it('empty catalog shows no products in picker', async () => {
      mockedUseCatalogProductos.mockReturnValue({
        data: { data: { results: [] } },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never);
      const user = userEvent.setup();
      render(<PublicationWizard />, { wrapper: createWrapper() });
      await user.click(screen.getByText('Siguiente →'));
      await user.click(getAddBtn());
      expect(
        screen.getByText('No hay productos disponibles.'),
      ).toBeInTheDocument();
    });

    it('catalog error shows error in picker', async () => {
      const mockRefetch = vi.fn();
      mockedUseCatalogProductos.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: mockRefetch,
      } as never);
      const user = userEvent.setup();
      render(<PublicationWizard />, { wrapper: createWrapper() });
      await user.click(screen.getByText('Siguiente →'));
      await user.click(getAddBtn());
      expect(
        screen.getByText('Error al cargar el catálogo.'),
      ).toBeInTheDocument();
    });

    it('can navigate back through all steps with items', async () => {
      const user = userEvent.setup();
      render(<PublicationWizard />, { wrapper: createWrapper() });
      await addItemAndFill(user);
      await user.click(screen.getByText('Siguiente →'));
      await user.click(screen.getByText('Siguiente →'));
      expect(
        screen.getByRole('heading', { name: 'Publicar' }),
      ).toBeInTheDocument();
      await user.click(screen.getByText('← Anterior'));
      expect(
        screen.getByRole('heading', { name: 'Resumen' }),
      ).toBeInTheDocument();
      await user.click(screen.getByText('← Anterior'));
      expect(screen.getByText(/Productos \(1\)/)).toBeInTheDocument();
      await user.click(screen.getByText('← Anterior'));
      expect(
        screen.getByRole('heading', { name: 'Fecha de publicación' }),
      ).toBeInTheDocument();
    });
  });

  describe('lock screen (Monday/borrador gate)', () => {
    it('shows lock screen when creating on a non-Monday', () => {
      mockIsMondayToday = false;
      render(<PublicationWizard />, { wrapper: createWrapper() });
      expect(screen.getByText('Publicación bloqueada')).toBeInTheDocument();
      expect(
        screen.getByText('Solo se pueden crear publicaciones los lunes.'),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('Fecha de publicación'),
      ).not.toBeInTheDocument();
    });

    it('shows lock screen when editing on a non-Monday', () => {
      mockParams.current = { id: '1' };
      mockIsMondayToday = false;
      mockedUsePublicacion.mockReturnValue({
        data: FAKE_PUBLICACION,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never);
      mockedUseProductosSemanales.mockReturnValue({
        data: { data: { results: [] } },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never);
      render(<PublicationWizard />, { wrapper: createWrapper() });
      expect(screen.getByText('Publicación bloqueada')).toBeInTheDocument();
      expect(
        screen.getByText('Solo puedes editar publicaciones los lunes.'),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('Fecha de publicación'),
      ).not.toBeInTheDocument();
    });

    it('shows lock screen when editing a non-borrador publication', () => {
      mockParams.current = { id: '1' };
      mockedUsePublicacion.mockReturnValue({
        data: {
          ...FAKE_PUBLICACION,
          data: { ...FAKE_PUBLICACION.data, estado: 'publicada' },
        },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never);
      mockedUseProductosSemanales.mockReturnValue({
        data: { data: { results: [] } },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never);
      render(<PublicationWizard />, { wrapper: createWrapper() });
      expect(screen.getByText('Publicación bloqueada')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Solo se puede editar una publicación en estado borrador. Las publicadas o cerradas no se pueden modificar.',
        ),
      ).toBeInTheDocument();
    });

    it('does not render lock screen when query fails (error wins over gate)', () => {
      mockParams.current = { id: '1' };
      mockIsMondayToday = false;
      mockedUsePublicacion.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('network down'),
        refetch: vi.fn(),
      } as never);
      mockedUseProductosSemanales.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never);
      render(<PublicationWizard />, { wrapper: createWrapper() });
      expect(
        screen.getByText('No se pudo cargar la publicación.'),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('Publicación bloqueada'),
      ).not.toBeInTheDocument();
    });
  });
});
