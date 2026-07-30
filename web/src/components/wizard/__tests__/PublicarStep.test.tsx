import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { WizardItemDraft } from '../../../utils/publicationWizard';
import { PublicarStep } from '../PublicarStep';

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

describe('PublicarStep', () => {
  it('renders week info', () => {
    render(
      <PublicarStep weekNumber={32} items={[makeItem()]} colors={baseColors} />,
    );
    expect(screen.getByText('¿Publicar la semana 32?')).toBeDefined();
  });

  it('shows product count with single item', () => {
    render(
      <PublicarStep weekNumber={32} items={[makeItem()]} colors={baseColors} />,
    );
    expect(
      screen.getByText(
        '1 producto serán publicados y visibles para los compradores.',
      ),
    ).toBeDefined();
  });

  it('shows product count with multiple items', () => {
    render(
      <PublicarStep
        weekNumber={32}
        items={[makeItem(), makeItem({ tempId: 'local_2' })]}
        colors={baseColors}
      />,
    );
    expect(
      screen.getByText(
        '2 productos serán publicados y visibles para los compradores.',
      ),
    ).toBeDefined();
  });

  it('shows rocket emoji', () => {
    render(
      <PublicarStep weekNumber={32} items={[makeItem()]} colors={baseColors} />,
    );
    expect(screen.getByText('🚀')).toBeDefined();
  });

  it('handles empty items gracefully', () => {
    render(<PublicarStep weekNumber={32} items={[]} colors={baseColors} />);
    expect(
      screen.getByText(
        '0 productos serán publicados y visibles para los compradores.',
      ),
    ).toBeDefined();
  });

  it('handles different week numbers', () => {
    const { rerender } = render(
      <PublicarStep weekNumber={1} items={[makeItem()]} colors={baseColors} />,
    );
    expect(screen.getByText('¿Publicar la semana 1?')).toBeDefined();
    rerender(
      <PublicarStep weekNumber={53} items={[makeItem()]} colors={baseColors} />,
    );
    expect(screen.getByText('¿Publicar la semana 53?')).toBeDefined();
  });

  it('shows correct product count text for single item', () => {
    render(
      <PublicarStep weekNumber={32} items={[makeItem()]} colors={baseColors} />,
    );
    expect(screen.getByText(/1 producto/)).toBeDefined();
  });

  it('shows correct product count text for multiple items', () => {
    render(
      <PublicarStep
        weekNumber={32}
        items={[
          makeItem(),
          makeItem({ tempId: 'local_2', nombre_producto: 'Lechuga' }),
        ]}
        colors={baseColors}
      />,
    );
    expect(screen.getByText(/2 productos/)).toBeDefined();
  });

  it('shows correct product count text for zero items', () => {
    render(<PublicarStep weekNumber={32} items={[]} colors={baseColors} />);
    expect(screen.getByText(/0 productos/)).toBeDefined();
  });

  it('renders with single item with image', () => {
    render(
      <PublicarStep
        weekNumber={10}
        items={[
          makeItem({ foto: 'uploads/img.jpg', nombre_producto: 'Manzana' }),
        ]}
        colors={baseColors}
      />,
    );
    expect(screen.getByText('¿Publicar la semana 10?')).toBeDefined();
  });
});
