/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

import { themeColors } from '@/constants/colors';
import { DecisionModal } from '@/screens/waste/DecisionModal';
import {
  PEDIDO_FECHA_LOCALE,
  PedidoModal,
} from '@/screens/waste/PedidoModal';
import { ProductModal } from '@/screens/waste/ProductModal';
import type { Order } from '@/types';
import type { PublishedProduct, WasteDecisionOption } from '@/types/waste';

const t = themeColors(false);

const pedido: Order = {
  id_pedido: 1,
  cliente_nombre: 'Juan Pérez',
  vendedor_nombre: null,
  total: '120',
  estado_actual: 'pendiente',
  creado_en: '2026-08-03T00:00:00-03:00',
};

const tomate: PublishedProduct = {
  id_producto_semanal: 100,
  producto: 'Tomate',
  unidad: 'kg',
  stock: 5,
  precio: '120',
  foto: '',
};

const donar: WasteDecisionOption = { id_decision: 1, decision: 'Donar' };

function renderPedidoModal(props: {
  readonly orders: readonly Order[];
  readonly selectedId?: number | null;
}) {
  const onClose = jest.fn();
  const onSelect = jest.fn();
  const view = render(
    <PedidoModal
      visible
      loading={false}
      orders={props.orders}
      selectedId={props.selectedId ?? null}
      bottomInset={0}
      t={t}
      onClose={onClose}
      onSelect={onSelect}
    />,
  );
  return { view, onClose, onSelect };
}

function renderProductModal(props: {
  readonly products: readonly PublishedProduct[];
  readonly selectedId?: number | null;
}) {
  const onClose = jest.fn();
  const onSelect = jest.fn();
  const view = render(
    <ProductModal
      visible
      loading={false}
      products={props.products}
      selectedId={props.selectedId ?? null}
      bottomInset={0}
      t={t}
      onClose={onClose}
      onSelect={onSelect}
    />,
  );
  return { view, onClose, onSelect };
}

function renderDecisionModal(props: {
  readonly options: readonly WasteDecisionOption[];
  readonly selectedId?: number | null;
}) {
  const onClose = jest.fn();
  const onSelect = jest.fn();
  const view = render(
    <DecisionModal
      visible
      options={props.options}
      selectedId={props.selectedId ?? null}
      bottomInset={0}
      t={t}
      onClose={onClose}
      onSelect={onSelect}
    />,
  );
  return { view, onClose, onSelect };
}

describe('PedidoModal', () => {
  it('renders the title, hint and one row per order with a single formatted date', () => {
    const { view } = renderPedidoModal({ orders: [pedido] });

    expect(view.getByText('Seleccionar pedido')).toBeTruthy();
    expect(
      view.getByText('Selecciona el pedido afectado por la merma.'),
    ).toBeTruthy();
    expect(view.getByText('Pedido #1 · 03-ago')).toBeTruthy();
    expect(view.getByText('Juan Pérez · $120')).toBeTruthy();
    expect(view.getByText('pendiente')).toBeTruthy();
  });

  it('shows the empty hint when there are no orders', () => {
    const { view } = renderPedidoModal({ orders: [] });

    expect(view.getByText('No hay pedidos para este vendedor.')).toBeTruthy();
  });

  it('calls onSelect with the pressed order', () => {
    const { view, onSelect } = renderPedidoModal({ orders: [pedido] });

    fireEvent.press(view.getByText('Pedido #1 · 03-ago'));

    expect(onSelect).toHaveBeenCalledWith(pedido);
  });

  it('calls onClose when the close button is pressed', () => {
    const { view, onClose } = renderPedidoModal({ orders: [pedido] });

    fireEvent.press(view.getByLabelText('Cerrar selector de pedido'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('ProductModal', () => {
  it('renders the title, hint and one row per product', () => {
    const { view } = renderProductModal({ products: [tomate] });

    expect(view.getByText('Producto publicado')).toBeTruthy();
    expect(view.getByText('Elige un producto publicado…')).toBeTruthy();
    expect(view.getByText('Tomate')).toBeTruthy();
    expect(view.getByText('Unidad: kg')).toBeTruthy();
    expect(view.getByText('$120')).toBeTruthy();
    expect(view.getByText('Stock: 5')).toBeTruthy();
  });

  it('shows the empty hint when there are no products', () => {
    const { view } = renderProductModal({ products: [] });

    expect(view.getByText('No hay productos disponibles.')).toBeTruthy();
  });

  it('calls onSelect with the pressed product', () => {
    const { view, onSelect } = renderProductModal({ products: [tomate] });

    fireEvent.press(view.getByText('Tomate'));

    expect(onSelect).toHaveBeenCalledWith(tomate);
  });

  it('calls onClose when the close button is pressed', () => {
    const { view, onClose } = renderProductModal({ products: [tomate] });

    fireEvent.press(view.getByLabelText('Cerrar selector de producto'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('DecisionModal', () => {
  it('renders the title, hint and one row per decision', () => {
    const { view } = renderDecisionModal({ options: [donar] });

    expect(view.getByText('Seleccionar decisión')).toBeTruthy();
    expect(view.getByText('Elige qué hacer con el producto.')).toBeTruthy();
    expect(view.getByText('Donar')).toBeTruthy();
  });

  it('calls onSelect with the pressed decision', () => {
    const { view, onSelect } = renderDecisionModal({ options: [donar] });

    fireEvent.press(view.getByText('Donar'));

    expect(onSelect).toHaveBeenCalledWith(donar);
  });

  it('calls onClose when the close button is pressed', () => {
    const { view, onClose } = renderDecisionModal({ options: [donar] });

    fireEvent.press(view.getByLabelText('Cerrar selector de decisión'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('PEDIDO_FECHA_LOCALE (R2-F)', () => {
  it('aligns the pedido date locale with the repo standard (es-AR)', () => {
    expect(PEDIDO_FECHA_LOCALE).toBe('es-AR');
  });
});
