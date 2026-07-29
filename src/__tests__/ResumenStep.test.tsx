/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, sonarjs/no-duplicate-string -- Test files are less strict */
import React from 'react';

import { render } from '@testing-library/react-native';

import ResumenStep from '@/components/wizard/ResumenStep';
import type {
  WizardItemDraft,
  WizardItemValidation,
} from '@/hooks/usePublicationWizard';
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

const sampleUnidades: Unidad[] = [{ id_unidad: 1, tipo: 'kg' }];

const validItem: WizardItemDraft = {
  tempId: 'temp_1',
  fk_producto: 10,
  fk_unidad: 1,
  stock: '5',
  precio: '1200',
  foto: 'https://example.com/foto.jpg',
};

const itemWithoutPhoto: WizardItemDraft = {
  tempId: 'temp_2',
  fk_producto: 10,
  fk_unidad: 1,
  stock: '3',
  precio: '800',
  foto: null,
};

describe('ResumenStep', () => {
  const defaultProps = {
    items: [validItem],
    allProductos: sampleProductos,
    unidades: sampleUnidades,
    itemValidations: new Map<string, WizardItemValidation>(),
    isDark: false,
  };

  it('shows empty state when no items', () => {
    const { getByText } = render(
      React.createElement(ResumenStep, { ...defaultProps, items: [] }),
    );
    expect(getByText('No hay productos para revisar')).toBeTruthy();
  });

  it('renders product name from catalog', () => {
    const { getByText } = render(
      React.createElement(ResumenStep, defaultProps),
    );
    expect(getByText('Tomate')).toBeTruthy();
  });

  it('renders stock and precio values', () => {
    const { getByText } = render(
      React.createElement(ResumenStep, defaultProps),
    );
    expect(getByText('5')).toBeTruthy();
    expect(getByText('$1200')).toBeTruthy();
  });

  it('shows photo attached indicator', () => {
    const { getByText } = render(
      React.createElement(ResumenStep, defaultProps),
    );
    expect(getByText('Foto adjunta')).toBeTruthy();
  });

  it('shows no photo indicator when foto is null', () => {
    const { getByText } = render(
      React.createElement(ResumenStep, {
        ...defaultProps,
        items: [itemWithoutPhoto],
      }),
    );
    expect(getByText('Sin foto')).toBeTruthy();
  });

  it('shows error border when item has validation errors', () => {
    const validations = new Map<string, WizardItemValidation>([
      ['temp_1', { stock: 'Requerido' }],
    ]);
    const { getByText } = render(
      React.createElement(ResumenStep, {
        ...defaultProps,
        itemValidations: validations,
      }),
    );
    expect(getByText('icon:alert-circle')).toBeTruthy();
  });

  it('shows check icon when item has no errors', () => {
    const { getByText } = render(
      React.createElement(ResumenStep, defaultProps),
    );
    expect(getByText('icon:check-circle')).toBeTruthy();
  });

  it('falls back to Producto #id when name not found', () => {
    const unknownItem: WizardItemDraft = {
      tempId: 'temp_99',
      fk_producto: 999,
      fk_unidad: 1,
      stock: '1',
      precio: '500',
      foto: 'https://example.com/foto.jpg',
    };
    const { getByText } = render(
      React.createElement(ResumenStep, {
        ...defaultProps,
        items: [unknownItem],
      }),
    );
    expect(getByText('Producto #999')).toBeTruthy();
  });
});
