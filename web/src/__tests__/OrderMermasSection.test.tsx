/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Test file */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';

import type { MermaDePedido, MermaDePedidoPublic } from '@/common/waste';

import { OrderMermasSection } from '../routes/OrderMermasSection';

vi.mock('../providers/ThemeProvider', () => ({
  useTheme: () => ({ resolved: 'light' }),
}));

const baseMerma: MermaDePedido = {
  id_merma: 1,
  fk_producto_semanal: 100,
  fk_pedido: 1,
  cantidad: 2,
  motivo: 'Se dañó en el traslado',
  comentarios: 'Nota interna del staff',
  fk_decision: 1,
  creado_en: '2026-07-25T10:00:00Z',
  estado: true,
  producto_info: {
    id: 100,
    producto: 'Manzana',
    publicacion: 1,
    stock_restante: 8,
  },
  decision_info: { id: 1, nombre: 'Tirar' },
  pedido_info: {
    id: 1,
    cliente: 'Cliente Test',
    estado: 'entregado',
    total: '150.50',
  },
};

describe('OrderMermasSection (web)', () => {
  it('muestra el empty state cuando la lista está vacía', () => {
    render(<OrderMermasSection mermas={[]} />);
    expect(screen.getByText('Este pedido no tiene mermas')).toBeInTheDocument();
  });

  it('muestra producto, cantidad, decisión y motivo en el happy path', () => {
    render(<OrderMermasSection mermas={[baseMerma]} />);
    expect(screen.getByText('Manzana')).toBeInTheDocument();
    expect(screen.getByText('2x')).toBeInTheDocument();
    expect(
      screen.getByText('Se dañó en el traslado · Tirar'),
    ).toBeInTheDocument();
  });

  it('muestra fallback "Producto" cuando producto_info es null', () => {
    render(
      <OrderMermasSection mermas={[{ ...baseMerma, producto_info: null }]} />,
    );
    expect(screen.getByText('Producto')).toBeInTheDocument();
  });

  it('no crashea cuando comentarios es null', () => {
    render(
      <OrderMermasSection mermas={[{ ...baseMerma, comentarios: null }]} />,
    );
    expect(
      screen.queryByText('Nota interna del staff'),
    ).not.toBeInTheDocument();
  });

  it('muestra comentarios por defecto (showComentarios true)', () => {
    render(<OrderMermasSection mermas={[baseMerma]} />);
    expect(screen.getByText('Nota interna del staff')).toBeInTheDocument();
  });

  it('oculta comentarios con showComentarios={false}', () => {
    render(<OrderMermasSection mermas={[baseMerma]} showComentarios={false} />);
    expect(
      screen.queryByText('Nota interna del staff'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Manzana')).toBeInTheDocument();
  });

  it('acepta mermas públicas (sin pedido_info ni comentarios) sin crashear', () => {
    const publicMerma: MermaDePedidoPublic = {
      id_merma: 1,
      fk_producto_semanal: 100,
      fk_pedido: 1,
      cantidad: 2,
      motivo: 'Se dañó en el traslado',
      fk_decision: 1,
      creado_en: '2026-07-25T10:00:00Z',
      estado: true,
      producto_info: null,
      decision_info: null,
    };
    render(
      <OrderMermasSection mermas={[publicMerma]} showComentarios={false} />,
    );
    expect(screen.getByText('Producto')).toBeInTheDocument();
    expect(screen.getByText('Se dañó en el traslado')).toBeInTheDocument();
  });
});
