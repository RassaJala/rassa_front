import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  PublicationActions,
  getStatusBadge,
  productCountLabel,
} from '../PublicationActions';
import type { Publicacion } from '../../services/publications';

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

function fakePub(overrides: Partial<Publicacion> = {}): Publicacion {
  return {
    id_publicacion: 1,
    fk_agricultor: 10,
    fecha_publicacion: '2026-07-27',
    semana: 31,
    estado: 'borrador',
    productos: [],
    creado_en: '2026-07-27T00:00:00Z',
    ...overrides,
  } as Publicacion;
}

describe('PublicationActions', () => {
  const onEdit = vi.fn();
  const onPublish = vi.fn();
  const onDelete = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders edit/publish/delete for borrador', () => {
    render(
      <PublicationActions
        pub={fakePub()}
        isMutating={false}
        onEdit={onEdit}
        onPublish={onPublish}
        onDelete={onDelete}
        onClose={onClose}
        colors={baseColors}
      />,
    );
    expect(screen.getByText('Editar')).toBeInTheDocument();
    expect(screen.getByText('Publicar')).toBeInTheDocument();
    expect(screen.getByText('Eliminar')).toBeInTheDocument();
  });

  it('calls onEdit when edit clicked', async () => {
    const user = userEvent.setup();
    render(
      <PublicationActions
        pub={fakePub()}
        isMutating={false}
        onEdit={onEdit}
        onPublish={onPublish}
        onDelete={onDelete}
        onClose={onClose}
        colors={baseColors}
      />,
    );
    await user.click(screen.getByText('Editar'));
    expect(onEdit).toHaveBeenCalledWith(1);
  });

  it('calls onPublish when publish clicked', async () => {
    const user = userEvent.setup();
    render(
      <PublicationActions
        pub={fakePub()}
        isMutating={false}
        onEdit={onEdit}
        onPublish={onPublish}
        onDelete={onDelete}
        onClose={onClose}
        colors={baseColors}
      />,
    );
    await user.click(screen.getByText('Publicar'));
    expect(onPublish).toHaveBeenCalledWith(1);
  });

  it('calls onDelete when delete clicked', async () => {
    const user = userEvent.setup();
    render(
      <PublicationActions
        pub={fakePub()}
        isMutating={false}
        onEdit={onEdit}
        onPublish={onPublish}
        onDelete={onDelete}
        onClose={onClose}
        colors={baseColors}
      />,
    );
    await user.click(screen.getByText('Eliminar'));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('renders close button for publicado', () => {
    render(
      <PublicationActions
        pub={fakePub({ estado: 'publicado' })}
        isMutating={false}
        onEdit={onEdit}
        onPublish={onPublish}
        onDelete={onDelete}
        onClose={onClose}
        colors={baseColors}
      />,
    );
    expect(screen.getByText('Cerrar')).toBeInTheDocument();
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
  });

  it('calls onClose when close clicked', async () => {
    const user = userEvent.setup();
    render(
      <PublicationActions
        pub={fakePub({ estado: 'publicado' })}
        isMutating={false}
        onEdit={onEdit}
        onPublish={onPublish}
        onDelete={onDelete}
        onClose={onClose}
        colors={baseColors}
      />,
    );
    await user.click(screen.getByText('Cerrar'));
    expect(onClose).toHaveBeenCalledWith(1);
  });

  it('renders nothing for cerrado', () => {
    const { container } = render(
      <PublicationActions
        pub={fakePub({ estado: 'cerrado' })}
        isMutating={false}
        onEdit={onEdit}
        onPublish={onPublish}
        onDelete={onDelete}
        onClose={onClose}
        colors={baseColors}
      />,
    );
    expect(container.querySelector('.flex')).toBeEmptyDOMElement();
  });

  it('renders nothing for cancelado', () => {
    const { container } = render(
      <PublicationActions
        pub={fakePub({ estado: 'cancelado' })}
        isMutating={false}
        onEdit={onEdit}
        onPublish={onPublish}
        onDelete={onDelete}
        onClose={onClose}
        colors={baseColors}
      />,
    );
    expect(container.querySelector('.flex')).toBeEmptyDOMElement();
  });

  it('disables action buttons when isMutating (Editar stays enabled)', () => {
    render(
      <PublicationActions
        pub={fakePub()}
        isMutating={true}
        onEdit={onEdit}
        onPublish={onPublish}
        onDelete={onDelete}
        onClose={onClose}
        colors={baseColors}
      />,
    );
    expect(screen.getByText('Editar')).not.toBeDisabled();
    expect(screen.getByText('Publicar')).toBeDisabled();
    expect(screen.getByText('Eliminar')).toBeDisabled();
  });
});

describe('getStatusBadge', () => {
  it('returns correct variant for each estado', () => {
    expect(getStatusBadge('borrador')).toEqual({
      variant: 'warning',
      label: 'Borrador',
    });
    expect(getStatusBadge('publicado')).toEqual({
      variant: 'success',
      label: 'Publicada',
    });
    expect(getStatusBadge('cerrado')).toEqual({
      variant: 'success',
      label: 'Cerrada',
    });
    expect(getStatusBadge('cancelado')).toEqual({
      variant: 'error',
      label: 'Cancelada',
    });
  });
});

describe('productCountLabel', () => {
  it('returns singular for 1', () => {
    expect(productCountLabel(1)).toBe('1 producto');
  });

  it('returns plural for 0', () => {
    expect(productCountLabel(0)).toBe('0 productos');
  });

  it('returns plural for >1', () => {
    expect(productCountLabel(5)).toBe('5 productos');
  });
});
