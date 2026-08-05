/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Test file */
import React from 'react';

import { render } from '@testing-library/react-native';

import type { MermaDePedido, MermaDePedidoPublic } from '@/common/waste';
import OrderMermasSection from '@/components/OrderMermasSection';

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({
    colorScheme: 'light',
    toggleColorScheme: jest.fn(),
  }),
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

describe('OrderMermasSection', () => {
  it('no renderiza nada cuando la lista está vacía', () => {
    const { queryByText } = render(<OrderMermasSection mermas={[]} />);
    expect(queryByText('Mermas')).toBeNull();
  });

  it('muestra producto, cantidad, decisión y motivo en el happy path', () => {
    const { getByText } = render(<OrderMermasSection mermas={[baseMerma]} />);
    expect(getByText('Manzana')).toBeTruthy();
    expect(getByText('2x')).toBeTruthy();
    expect(getByText('Se dañó en el traslado · Tirar')).toBeTruthy();
  });

  it('muestra fallback "Producto" cuando producto_info es null', () => {
    const { getByText } = render(
      <OrderMermasSection mermas={[{ ...baseMerma, producto_info: null }]} />,
    );
    expect(getByText('Producto')).toBeTruthy();
  });

  it('no crashea cuando comentarios es null', () => {
    const { queryByText } = render(
      <OrderMermasSection mermas={[{ ...baseMerma, comentarios: null }]} />,
    );
    expect(queryByText('Nota interna del staff')).toBeNull();
  });

  it('muestra comentarios por defecto (showComentarios true)', () => {
    const { getByText } = render(<OrderMermasSection mermas={[baseMerma]} />);
    expect(getByText('Nota interna del staff')).toBeTruthy();
  });

  it('oculta comentarios con showComentarios={false}', () => {
    const { queryByText } = render(
      <OrderMermasSection mermas={[baseMerma]} showComentarios={false} />,
    );
    expect(queryByText('Nota interna del staff')).toBeNull();
    expect(queryByText('Manzana')).toBeTruthy();
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
    const { getByText } = render(
      <OrderMermasSection mermas={[publicMerma]} showComentarios={false} />,
    );
    expect(getByText('Producto')).toBeTruthy();
    expect(getByText('Se dañó en el traslado')).toBeTruthy();
  });
});
