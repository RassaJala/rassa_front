import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type {
  ItemValidation,
  WizardItemDraft,
} from '../../../utils/publicationWizard';
import { ProductosStep } from '../ProductosStep';

const baseColors = {
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
};

const defaultUnidades = [
  { id_unidad: 1, tipo: 'kg' },
  { id_unidad: 2, tipo: 'unidad' },
];

function makeItem(overrides: Partial<WizardItemDraft> = {}): WizardItemDraft {
  return {
    tempId: 'local_1',
    isNew: true,
    fk_producto: 1,
    nombre_producto: 'Tomate',
    fk_unidad: 1,
    stock: '10',
    precio: '500',
    foto: null,
    imageFile: null,
    imagePreview: null,
    ...overrides,
  };
}

function renderStep({
  items = [makeItem()],
  validations = new Map<string, ItemValidation>(),
  saving = false,
  loadingCatalog = false,
  ...callbacks
}: {
  items?: WizardItemDraft[];
  validations?: Map<string, ItemValidation>;
  saving?: boolean;
  loadingCatalog?: boolean;
  onAddItem?: () => void;
  onRemoveItem?: (tempId: string) => void;
  onUpdateItem?: (
    tempId: string,
    field: keyof WizardItemDraft,
    value: string | number | null,
  ) => void;
  onImageSelect?: (tempId: string, file: File) => void;
  onImageRemove?: (tempId: string) => void;
} = {}) {
  return render(
    <ProductosStep
      items={items}
      validations={validations}
      saving={saving}
      colors={baseColors}
      unidades={defaultUnidades}
      loadingCatalog={loadingCatalog}
      onAddItem={callbacks.onAddItem ?? vi.fn()}
      onRemoveItem={callbacks.onRemoveItem ?? vi.fn()}
      onUpdateItem={callbacks.onUpdateItem ?? vi.fn()}
      onImageSelect={callbacks.onImageSelect ?? vi.fn()}
      onImageRemove={callbacks.onImageRemove ?? vi.fn()}
    />,
  );
}

describe('ProductosStep', () => {
  it('renders product list with item count', () => {
    renderStep({
      items: [
        makeItem(),
        makeItem({ tempId: 'local_2', nombre_producto: 'Lechuga' }),
      ],
    });
    expect(screen.getByText('Productos (2)')).toBeDefined();
    expect(screen.getByText('Tomate')).toBeDefined();
    expect(screen.getByText('Lechuga')).toBeDefined();
  });

  it('shows empty state when no items', () => {
    renderStep({ items: [] });
    expect(screen.getByText('No hay productos')).toBeDefined();
  });

  it('renders stock, precio, and unidad fields', () => {
    renderStep();
    expect(screen.getByDisplayValue('10')).toBeDefined();
    expect(screen.getByDisplayValue('500')).toBeDefined();
    expect(screen.getByDisplayValue('kg')).toBeDefined();
  });

  it('displays validation errors', () => {
    const validations = new Map<string, ItemValidation>();
    validations.set('local_1', {
      stock: 'Stock inválido',
      precio: 'Precio inválido',
    });
    renderStep({ validations });
    expect(screen.getByText('Stock inválido')).toBeDefined();
    expect(screen.getByText('Precio inválido')).toBeDefined();
  });

  it('clears validation errors when item is fixed', () => {
    const validations = new Map<string, ItemValidation>();
    validations.set('local_1', { stock: 'Stock inválido' });
    const { rerender } = render(
      <ProductosStep
        items={[makeItem()]}
        validations={validations}
        saving={false}
        colors={baseColors}
        unidades={defaultUnidades}
        loadingCatalog={false}
        onAddItem={vi.fn()}
        onRemoveItem={vi.fn()}
        onUpdateItem={vi.fn()}
        onImageSelect={vi.fn()}
        onImageRemove={vi.fn()}
      />,
    );
    expect(screen.getByText('Stock inválido')).toBeDefined();

    const clearedValidations = new Map<string, ItemValidation>();
    rerender(
      <ProductosStep
        items={[makeItem({ stock: '15' })]}
        validations={clearedValidations}
        saving={false}
        colors={baseColors}
        unidades={defaultUnidades}
        loadingCatalog={false}
        onAddItem={vi.fn()}
        onRemoveItem={vi.fn()}
        onUpdateItem={vi.fn()}
        onImageSelect={vi.fn()}
        onImageRemove={vi.fn()}
      />,
    );
    expect(screen.queryByText('Stock inválido')).toBeNull();
  });

  it('disables inputs during saving', () => {
    renderStep({ saving: true });
    const inputs = screen.getAllByRole('spinbutton');
    for (const input of inputs) {
      expect(input).toBeDisabled();
    }
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('calls onImageRemove when image remove button is clicked', async () => {
    const onImageRemove = vi.fn();
    const user = userEvent.setup();
    renderStep({
      items: [makeItem({ imagePreview: 'blob:test' })],
      onImageRemove,
    });
    const removeImgBtns = screen.getAllByText('✕');
    const imageRemoveBtn = removeImgBtns[removeImgBtns.length - 1]!;
    await user.click(imageRemoveBtn);
    expect(onImageRemove).toHaveBeenCalledWith('local_1');
  });

  it('calls onAddItem when add button is clicked', async () => {
    const onAddItem = vi.fn();
    const user = userEvent.setup();
    renderStep({ items: [], onAddItem });
    await user.click(screen.getAllByText('+ Agregar producto')[0]!);
    expect(onAddItem).toHaveBeenCalledOnce();
  });

  it('calls onRemoveItem when remove button is clicked', async () => {
    const onRemoveItem = vi.fn();
    const user = userEvent.setup();
    renderStep({ onRemoveItem });
    const removeBtn = screen.getByText('✕');
    await user.click(removeBtn);
    expect(onRemoveItem).toHaveBeenCalledWith('local_1');
  });

  it('remove button is disabled during saving', () => {
    renderStep({ saving: true });
    const removeBtn = screen.getByText('✕');
    expect(removeBtn).toBeDisabled();
  });

  it('shows loading spinner when loading catalog', () => {
    renderStep({ items: [], loadingCatalog: true });
    expect(screen.getByText('Productos (0)')).toBeDefined();
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeDefined();
  });

  it('shows image upload area with camera emoji when no image', () => {
    renderStep();
    expect(screen.getByText('📷')).toBeDefined();
  });

  it('shows image remove button when image is present', () => {
    renderStep({
      items: [makeItem({ imagePreview: 'blob:test' })],
    });
    const removeImgBtns = screen.getAllByText('✕');
    expect(removeImgBtns.length).toBe(2);
  });

  it('uses numeric fallback when nombre_producto is missing', () => {
    renderStep({
      items: [makeItem({ nombre_producto: '' })],
    });
    expect(screen.getByText('Producto #1')).toBeDefined();
  });

  it('empty state includes action button', () => {
    const onAddItem = vi.fn();
    renderStep({ items: [], onAddItem });
    const addBtns = screen.getAllByText('+ Agregar producto');
    expect(addBtns.length).toBe(2);
  });
});
