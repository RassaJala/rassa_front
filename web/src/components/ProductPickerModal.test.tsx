import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Producto } from '../services/publications';
import { ProductPickerModal } from './ProductPickerModal';

function makeProduct(overrides: Partial<Producto> = {}): Producto {
  return {
    id_producto: 1,
    nombre_producto: 'Tomate',
    precio: '500',
    stock: 100,
    imagen: null,
    imagen_principal: null,
    ...overrides,
  };
}

const baseColors = {
  isDark: false,
  brand: '#24563C',
  onBrand: '#FFFFFF',
  coral: '#DE393A',
  muted: '#5E6B5E',
  border: '#E2E6DF',
  inputBorder: '#D6DAD4',
  surface: '#FFFFFF',
  bg: '#F5F7F0',
  fg: '#2D3328',
  accentBg: 'rgba(36,86,60,0.07)',
} as const;

function renderModal({
  catalog = [makeProduct()],
  catalogError = false,
  onRetryCatalog = vi.fn(),
  selectedIds = new Set<number>(),
  onSelect = vi.fn(),
  onClose = vi.fn(),
} = {}) {
  return render(
    <ProductPickerModal
      catalog={catalog}
      catalogError={catalogError}
      onRetryCatalog={onRetryCatalog}
      selectedIds={selectedIds}
      onSelect={onSelect}
      onClose={onClose}
      colors={baseColors}
    />,
  );
}

describe('ProductPickerModal', () => {
  it('renders catalog products', () => {
    renderModal({
      catalog: [
        makeProduct(),
        makeProduct({ id_producto: 2, nombre_producto: 'Lechuga' }),
      ],
    });
    expect(screen.getByText('Tomate')).toBeDefined();
    expect(screen.getByText('Lechuga')).toBeDefined();
  });

  it('search filters products by name', async () => {
    const user = userEvent.setup();
    renderModal({
      catalog: [
        makeProduct(),
        makeProduct({ id_producto: 2, nombre_producto: 'Lechuga' }),
      ],
    });
    const searchInput = screen.getByPlaceholderText(/buscar/i);
    await user.type(searchInput, 'Tom');
    expect(screen.getByText('Tomate')).toBeDefined();
    expect(screen.queryByText('Lechuga')).toBeNull();
  });

  it('shows empty state when no products match search', async () => {
    const user = userEvent.setup();
    renderModal({ catalog: [makeProduct()] });
    const searchInput = screen.getByPlaceholderText(/buscar/i);
    await user.type(searchInput, 'Zanahoria');
    expect(screen.getByText('No hay productos disponibles.')).toBeDefined();
  });

  it('shows error state with retry button', async () => {
    const onRetryCatalog = vi.fn();
    const user = userEvent.setup();
    renderModal({ catalog: [], catalogError: true, onRetryCatalog });
    expect(screen.getByText('Error al cargar el catálogo.')).toBeDefined();
    await user.click(screen.getByText('Reintentar'));
    expect(onRetryCatalog).toHaveBeenCalledOnce();
  });

  it('calls onSelect when product is clicked', async () => {
    const onSelect = vi.fn();
    const product = makeProduct();
    const user = userEvent.setup();
    renderModal({ catalog: [product], onSelect });
    await user.click(screen.getByText('Tomate'));
    expect(onSelect).toHaveBeenCalledWith(product);
  });

  it('filters out already selected products', () => {
    renderModal({
      catalog: [
        makeProduct(),
        makeProduct({ id_producto: 2, nombre_producto: 'Lechuga' }),
      ],
      selectedIds: new Set([1]),
    });
    expect(screen.queryByText('Tomate')).toBeNull();
    expect(screen.getByText('Lechuga')).toBeDefined();
  });

  it('keyboard escape calls onClose', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('overlay click calls onClose', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = renderModal({ onClose });
    const overlay = container.querySelector('.fixed.inset-0')!;
    await user.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('inner card click does not propagate to overlay', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderModal({ onClose });
    const heading = screen.getByText('Seleccionar producto');
    await user.click(heading);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('displays product stock and price', () => {
    renderModal({
      catalog: [makeProduct({ stock: 50, precio: '250' })],
    });
    expect(screen.getByText('Stock: 50')).toBeDefined();
    expect(screen.getByText('$250')).toBeDefined();
  });
});
