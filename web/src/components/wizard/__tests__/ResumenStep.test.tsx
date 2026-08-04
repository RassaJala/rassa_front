import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { WizardItemDraft } from '../../../utils/publicationWizard';
import { ResumenStep } from '../ResumenStep';

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

const defaultUnidades = [
  { id_unidad: 1, tipo: 'kg' },
  { id_unidad: 2, tipo: 'unidad' },
];

vi.mock('../../../utils/mediaUrl', () => ({
  mediaUrl: (path: string | null | undefined) =>
    path ? 'http://test.com/img.jpg' : null,
}));

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

describe('ResumenStep', () => {
  it('renders product summaries', () => {
    render(
      <ResumenStep
        weekNumber={32}
        nextMonday={new Date(2026, 7, 3)}
        items={[
          makeItem(),
          makeItem({ tempId: 'local_2', nombre_producto: 'Lechuga' }),
        ]}
        unidades={defaultUnidades}
        colors={baseColors}
      />,
    );
    expect(screen.getByText('Tomate')).toBeDefined();
    expect(screen.getByText('Lechuga')).toBeDefined();
  });

  it('shows empty state when no items', () => {
    render(
      <ResumenStep
        weekNumber={32}
        nextMonday={new Date(2026, 7, 3)}
        items={[]}
        unidades={defaultUnidades}
        colors={baseColors}
      />,
    );
    expect(screen.getByText('Sin productos')).toBeDefined();
  });

  it('displays total count', () => {
    render(
      <ResumenStep
        weekNumber={32}
        nextMonday={new Date(2026, 7, 3)}
        items={[makeItem()]}
        unidades={defaultUnidades}
        colors={baseColors}
      />,
    );
    expect(screen.getByText('1 producto en la publicación')).toBeDefined();
  });

  it('displays plural count', () => {
    render(
      <ResumenStep
        weekNumber={32}
        nextMonday={new Date(2026, 7, 3)}
        items={[makeItem(), makeItem({ tempId: 'local_2' })]}
        unidades={defaultUnidades}
        colors={baseColors}
      />,
    );
    expect(screen.getByText('2 productos en la publicación')).toBeDefined();
  });

  it('shows week info', () => {
    render(
      <ResumenStep
        weekNumber={32}
        nextMonday={new Date(2026, 7, 3)}
        items={[makeItem()]}
        unidades={defaultUnidades}
        colors={baseColors}
      />,
    );
    expect(screen.getByText(/semana 32/i)).toBeDefined();
  });

  it('shows image preview', () => {
    render(
      <ResumenStep
        weekNumber={32}
        nextMonday={new Date(2026, 7, 3)}
        items={[makeItem({ foto: 'uploads/photo.jpg' })]}
        unidades={defaultUnidades}
        colors={baseColors}
      />,
    );
    const imgs = document.querySelectorAll('img');
    expect(imgs.length).toBe(1);
  });

  it('shows leaf emoji when no image', () => {
    render(
      <ResumenStep
        weekNumber={32}
        nextMonday={new Date(2026, 7, 3)}
        items={[makeItem()]}
        unidades={defaultUnidades}
        colors={baseColors}
      />,
    );
    expect(screen.getByText('🌿')).toBeDefined();
  });

  it('shows badge based on image presence', () => {
    const { rerender } = render(
      <ResumenStep
        weekNumber={32}
        nextMonday={new Date(2026, 7, 3)}
        items={[makeItem({ foto: null })]}
        unidades={defaultUnidades}
        colors={baseColors}
      />,
    );
    expect(screen.getByText('Sin foto')).toBeDefined();

    rerender(
      <ResumenStep
        weekNumber={32}
        nextMonday={new Date(2026, 7, 3)}
        items={[makeItem({ foto: 'uploads/photo.jpg' })]}
        unidades={defaultUnidades}
        colors={baseColors}
      />,
    );
    expect(screen.getByText('Con foto')).toBeDefined();
  });

  it('shows unidad and precio for each item', () => {
    render(
      <ResumenStep
        weekNumber={32}
        nextMonday={new Date(2026, 7, 3)}
        items={[makeItem({ stock: '10', precio: '500', fk_unidad: 1 })]}
        unidades={defaultUnidades}
        colors={baseColors}
      />,
    );
    expect(screen.getByText('10 kg · $500')).toBeDefined();
  });

  it('shows unavailable label when nombre_producto is empty (deleted product)', () => {
    render(
      <ResumenStep
        weekNumber={32}
        nextMonday={new Date(2026, 7, 3)}
        items={[makeItem({ nombre_producto: '' })]}
        unidades={defaultUnidades}
        colors={baseColors}
      />,
    );
    expect(
      screen.getByText('Producto no disponible (eliminado del catálogo)'),
    ).toBeDefined();
  });

  it('shows different product count variants', () => {
    const { rerender } = render(
      <ResumenStep
        weekNumber={32}
        nextMonday={new Date(2026, 7, 3)}
        items={[]}
        unidades={defaultUnidades}
        colors={baseColors}
      />,
    );
    expect(screen.getByText('0 productos en la publicación')).toBeDefined();

    rerender(
      <ResumenStep
        weekNumber={32}
        nextMonday={new Date(2026, 7, 3)}
        items={[makeItem()]}
        unidades={defaultUnidades}
        colors={baseColors}
      />,
    );
    expect(screen.getByText('1 producto en la publicación')).toBeDefined();

    rerender(
      <ResumenStep
        weekNumber={32}
        nextMonday={new Date(2026, 7, 3)}
        items={[makeItem(), makeItem({ tempId: 'local_2' })]}
        unidades={defaultUnidades}
        colors={baseColors}
      />,
    );
    expect(screen.getByText('2 productos en la publicación')).toBeDefined();
  });

  it('renders multiple products with different images', () => {
    render(
      <ResumenStep
        weekNumber={32}
        nextMonday={new Date(2026, 7, 3)}
        items={[
          makeItem({
            tempId: 'local_1',
            foto: 'uploads/photo1.jpg',
            nombre_producto: 'Tomate',
          }),
          makeItem({
            tempId: 'local_2',
            foto: null,
            nombre_producto: 'Lechuga',
          }),
          makeItem({
            tempId: 'local_3',
            foto: 'uploads/photo2.jpg',
            nombre_producto: 'Zanahoria',
          }),
        ]}
        unidades={defaultUnidades}
        colors={baseColors}
      />,
    );
    expect(screen.getByText('Tomate')).toBeDefined();
    expect(screen.getByText('Lechuga')).toBeDefined();
    expect(screen.getByText('Zanahoria')).toBeDefined();
    const conFoto = screen.getAllByText('Con foto');
    expect(conFoto.length).toBe(2);
    expect(screen.getByText('Sin foto')).toBeDefined();
  });

  it('shows correct badges for items with and without images', () => {
    render(
      <ResumenStep
        weekNumber={32}
        nextMonday={new Date(2026, 7, 3)}
        items={[
          makeItem({ tempId: 'local_1', foto: null, imageFile: null }),
          makeItem({
            tempId: 'local_2',
            imageFile: new File([''], 'test.jpg', { type: 'image/jpeg' }),
            foto: null,
          }),
        ]}
        unidades={defaultUnidades}
        colors={baseColors}
      />,
    );
    const sinFoto = screen.getAllByText('Sin foto');
    const conFoto = screen.getAllByText('Con foto');
    expect(sinFoto.length).toBe(1);
    expect(conFoto.length).toBe(1);
  });
});
