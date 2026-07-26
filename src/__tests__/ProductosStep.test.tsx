/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, sonarjs/no-duplicate-string -- Test files are less strict */
import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';

import ProductosStep from '@/components/wizard/ProductosStep';
import type { WizardItemDraft } from '@/hooks/usePublicationWizard';

jest.mock('@expo/vector-icons', () => {
  const React = require('react') as typeof import('react');
  const { Text } = require('react-native') as typeof import('react-native');
  return {
    MaterialCommunityIcons: (props: { name: string; color?: string }) =>
      React.createElement(Text, null, `icon:${props.name}`),
  };
});

jest.mock('@/components/wizard/WizardItemCard', () => {
  const React = require('react') as typeof import('react');
  const { Text, View } = require('react-native') as typeof import('react-native');
  return {
    __esModule: true,
    default: (props: { item: { fk_producto: number }; onUpdate: (...args: any[]) => void }) =>
      React.createElement(
        View,
        { testID: `wizard-item-${String(props.item.fk_producto)}` },
        React.createElement(Text, null, `Producto ${String(props.item.fk_producto)}`),
      ),
  };
});

const sampleItems: WizardItemDraft[] = [
  {
    tempId: 'temp_1',
    fk_producto: 10,
    fk_unidad: 1,
    stock: '5',
    precio: '1200',
    foto: 'https://example.com/foto.jpg',
  },
  {
    tempId: 'temp_2',
    fk_producto: 20,
    fk_unidad: 2,
    stock: '3',
    precio: '800',
    foto: null,
  },
];

describe('ProductosStep', () => {
  const defaultProps = {
    items: sampleItems,
    allProductos: [],
    unidades: [],
    itemValidations: new Map(),
    onUpdate: jest.fn(),
    onRemove: jest.fn(),
    onPickImage: jest.fn(),
    onAddProduct: jest.fn(),
    isDark: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows empty state when no items', () => {
    const { getByText } = render(
      React.createElement(ProductosStep, { ...defaultProps, items: [] }),
    );
    expect(getByText('No hay productos agregados')).toBeTruthy();
    expect(getByText('Tocá el botón para agregar tu primer producto')).toBeTruthy();
  });

  it('renders item cards when items exist', () => {
    const { getByTestId } = render(
      React.createElement(ProductosStep, defaultProps),
    );
    expect(getByTestId('wizard-item-10')).toBeTruthy();
    expect(getByTestId('wizard-item-20')).toBeTruthy();
  });

  it('renders add product button', () => {
    const { getByText } = render(
      React.createElement(ProductosStep, defaultProps),
    );
    expect(getByText('Agregar producto')).toBeTruthy();
  });

  it('calls onAddProduct when add button pressed', () => {
    const onAddProduct = jest.fn();
    const { getByText } = render(
      React.createElement(ProductosStep, { ...defaultProps, onAddProduct }),
    );
    fireEvent.press(getByText('Agregar producto'));
    expect(onAddProduct).toHaveBeenCalledTimes(1);
  });
});
