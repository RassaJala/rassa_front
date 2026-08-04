/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, sonarjs/no-duplicate-string -- Test files are less strict */
import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';

import WizardItemCard from '@/components/wizard/WizardItemCard';
import { DELETED_PRODUCT_LABEL } from '@/common/publicationLabels';
import type { WizardItemDraft } from '@/hooks/usePublicationWizard';
import type { Producto, Unidad } from '@/services/productos';

jest.mock('@expo/vector-icons', () => {
  const React = require('react') as typeof import('react');
  const { Text } = require('react-native') as typeof import('react-native');
  return {
    MaterialCommunityIcons: (props: { name: string; color?: string }) =>
      React.createElement(Text, null, `icon:${props.name}`),
  };
});

const sampleProductos: Producto[] = [
  {
    id_producto: 10,
    nombre_producto: 'Tomate',
    descripcion: '',
    precio: '1500',
    stock: 20,
    categoria: {
      id_categoria: 1,
      nombre: 'Verdura',
      descripcion: 'Verduras frescas',
    },
    unidad: { id_unidad: 1, tipo: 'kg' },
    es_perecedero: true,
    imagen: null,
    imagen_principal: null,
    estado: true,
    creado_en: '',
  },
];

const sampleUnidades: Unidad[] = [
  { id_unidad: 1, tipo: 'kg' },
  { id_unidad: 2, tipo: 'unidad' },
];

const validItem: WizardItemDraft = {
  tempId: 'temp_1',
  fk_producto: 10,
  fk_unidad: 1,
  stock: '5',
  precio: '1200',
  foto: 'https://example.com/foto.jpg',
};

describe('WizardItemCard', () => {
  const defaultProps = {
    item: validItem,
    allProductos: sampleProductos,
    unidades: sampleUnidades,
    validation: undefined,
    onUpdate: jest.fn(),
    onRemove: jest.fn(),
    onPickImage: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders product name from catalog', () => {
    const { getByText } = render(
      React.createElement(WizardItemCard, defaultProps),
    );
    expect(getByText('Tomate')).toBeTruthy();
  });

  it('shows deleted product label when product not in catalog', () => {
    const unknownItem: WizardItemDraft = {
      tempId: 'temp_99',
      fk_producto: 999,
      fk_unidad: 1,
      stock: '1',
      precio: '500',
      foto: null,
    };
    const { getByText } = render(
      React.createElement(WizardItemCard, {
        ...defaultProps,
        item: unknownItem,
      }),
    );
    expect(getByText(DELETED_PRODUCT_LABEL)).toBeTruthy();
  });

  it('renders stock and price inputs with values', () => {
    const { getByDisplayValue } = render(
      React.createElement(WizardItemCard, defaultProps),
    );
    expect(getByDisplayValue('5')).toBeTruthy();
    expect(getByDisplayValue('1200')).toBeTruthy();
  });

  it('shows placeholder when there is no photo', () => {
    const noPhotoItem: WizardItemDraft = { ...validItem, foto: null };
    const { getByText } = render(
      React.createElement(WizardItemCard, {
        ...defaultProps,
        item: noPhotoItem,
      }),
    );
    expect(getByText('Toca para foto')).toBeTruthy();
  });

  it('calls onUpdate when stock changes', () => {
    const onUpdate = jest.fn();
    const { getByDisplayValue } = render(
      React.createElement(WizardItemCard, {
        ...defaultProps,
        onUpdate,
      }),
    );
    fireEvent.changeText(getByDisplayValue('5'), '7');
    expect(onUpdate).toHaveBeenCalledWith('temp_1', 'stock', '7');
  });

  it('calls onUpdate when price changes', () => {
    const onUpdate = jest.fn();
    const { getByDisplayValue } = render(
      React.createElement(WizardItemCard, {
        ...defaultProps,
        onUpdate,
      }),
    );
    fireEvent.changeText(getByDisplayValue('1200'), '1400');
    expect(onUpdate).toHaveBeenCalledWith('temp_1', 'precio', '1400');
  });

  it('calls onUpdate when a unidad is selected', () => {
    const onUpdate = jest.fn();
    const { getByText } = render(
      React.createElement(WizardItemCard, {
        ...defaultProps,
        onUpdate,
      }),
    );
    fireEvent.press(getByText('unidad'));
    expect(onUpdate).toHaveBeenCalledWith('temp_1', 'fk_unidad', 2);
  });

  it('calls onRemove when delete pressed', () => {
    const onRemove = jest.fn();
    const { getByText } = render(
      React.createElement(WizardItemCard, {
        ...defaultProps,
        onRemove,
      }),
    );
    fireEvent.press(getByText('Eliminar'));
    expect(onRemove).toHaveBeenCalledWith('temp_1');
  });

  it('calls onPickImage when photo area pressed', () => {
    const onPickImage = jest.fn();
    const { getByLabelText } = render(
      React.createElement(WizardItemCard, {
        ...defaultProps,
        onPickImage,
      }),
    );
    fireEvent.press(getByLabelText('Seleccionar imagen'));
    expect(onPickImage).toHaveBeenCalledWith('temp_1');
  });

  it('shows validation error text when present', () => {
    const { getByText } = render(
      React.createElement(WizardItemCard, {
        ...defaultProps,
        validation: { stock: 'El stock es requerido' },
      }),
    );
    expect(getByText('El stock es requerido')).toBeTruthy();
  });
});
