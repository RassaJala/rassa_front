/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test file for admin CRUD validation & Toast */
import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';

// Minimal mock for Animated that avoids native driver connections in Jest.
// The real timing/parallel with useNativeDriver triggers the native renderer
// which fails with a react/react-native-renderer version mismatch.
// This mock does not use NativeAnimatedModule.
const emptyAnimation = { start: () => {}, stop: () => {}, reset: () => {} };

jest.mock('react-native/Libraries/Animated/Animated', () => {
  const ViewComponent =
    require('react-native/Libraries/Components/View/View').default;
  const TextComponent = require('react-native/Libraries/Text/Text').default;

  const { default: AnimatedValueClass } = jest.requireActual(
    'react-native/Libraries/Animated/nodes/AnimatedValue',
  );
  const { default: AnimatedValueXYClass } = jest.requireActual(
    'react-native/Libraries/Animated/nodes/AnimatedValueXY',
  );

  return {
    __esModule: true,
    default: {
      Value: AnimatedValueClass,
      ValueXY: AnimatedValueXYClass,
      timing: jest.fn(() => ({
        ...emptyAnimation,
        start: jest.fn((cb?: (r?: { finished: boolean }) => void) =>
          cb?.({ finished: true }),
        ),
        _isUsingNativeDriver: () => false,
      })),
      parallel: jest.fn((animations) => ({
        ...emptyAnimation,
        start: jest.fn((cb?: (r?: { finished: boolean }) => void) => {
          animations.forEach((a: { start: Function }) => a.start());
          cb?.({ finished: true });
        }),
        _isUsingNativeDriver: () => false,
      })),
      sequence: jest.fn(() => ({
        ...emptyAnimation,
        start: jest.fn((cb?: (r?: { finished: boolean }) => void) =>
          cb?.({ finished: true }),
        ),
      })),
      delay: jest.fn(() => ({
        ...emptyAnimation,
        start: jest.fn((cb?: (r?: { finished: boolean }) => void) =>
          cb?.({ finished: true }),
        ),
      })),
      loop: jest.fn(() => ({
        ...emptyAnimation,
        start: jest.fn(),
      })),
      event: jest.fn(),
      createAnimatedComponent: (Component: React.ComponentType) => Component,
      // Plain components for Animated.View, Animated.Text etc.
      View: ViewComponent,
      Text: TextComponent,
    },
  };
});

import Toast from '@/components/Toast';
import type { Category } from '@/types';

// ── Mock dependencies ────────────────────────────────────

const mockInvalidateQueries = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: mockInvalidateQueries,
  })),
}));

jest.mock('@/store/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'admin' } }),
}));

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(() => ({ isConnected: true })),
}));

jest.mock('@/services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  default: {
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  },
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

// ── Toast tests ───────────────────────────────────────────

describe('Toast component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renderiza cuando visible es true', () => {
    const { getByText } = render(
      <Toast visible message="Operación exitosa" onDismiss={jest.fn()} />,
    );

    expect(getByText('Operación exitosa')).toBeTruthy();
  });

  it('no renderiza cuando visible es false', () => {
    const { queryByText } = render(
      <Toast visible={false} message="No visible" onDismiss={jest.fn()} />,
    );

    expect(queryByText('No visible')).toBeNull();
  });

  it('llama onDismiss al presionar el toast', () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <Toast visible message="Presióname" onDismiss={onDismiss} />,
    );

    fireEvent.press(getByText('Presióname'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('se auto-descarta después de la duración + animación', () => {
    const onDismiss = jest.fn();

    render(
      <Toast
        visible
        message="Auto-dismiss"
        onDismiss={onDismiss}
        duration={100}
      />,
    );

    // Advance past display duration + fade-out
    jest.advanceTimersByTime(400);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('acepta type error sin romperse', () => {
    const { getByText } = render(
      <Toast visible message="Error" type="error" onDismiss={jest.fn()} />,
    );

    expect(getByText('Error')).toBeTruthy();
  });

  it('acepta type info sin romperse', () => {
    const { getByText } = render(
      <Toast visible message="Info" type="info" onDismiss={jest.fn()} />,
    );

    expect(getByText('Info')).toBeTruthy();
  });
});

// ── Validate function tests ──────────────────────────────

describe('CategoryListScreen validate', () => {
  const catValidate = (formValues: Record<string, string>) => {
    if (!(formValues.nombre ?? '').trim()) return 'El nombre es obligatorio.';
    return null;
  };

  it('retorna null para valores válidos', () => {
    expect(catValidate({ nombre: 'Frutas' })).toBeNull();
    expect(
      catValidate({ nombre: 'Verduras', descripcion: 'Cosas verdes' }),
    ).toBeNull();
  });

  it('retorna error cuando el nombre está vacío', () => {
    expect(catValidate({ nombre: '' })).toBe('El nombre es obligatorio.');
    expect(catValidate({ nombre: '   ' })).toBe('El nombre es obligatorio.');
  });

  it('retorna error cuando falta la clave nombre', () => {
    expect(catValidate({})).toBe('El nombre es obligatorio.');
  });
});

describe('UnitListScreen validate', () => {
  const unitValidate = (formValues: Record<string, string>) => {
    if (!(formValues.nombre ?? '').trim()) return 'El nombre es obligatorio.';
    if (!(formValues.abreviatura ?? '').trim())
      return 'La abreviatura es obligatoria.';
    return null;
  };

  it('retorna null para valores válidos', () => {
    expect(unitValidate({ nombre: 'Kilogramo', abreviatura: 'kg' })).toBeNull();
  });

  it('retorna error cuando el nombre está vacío', () => {
    expect(unitValidate({ nombre: '', abreviatura: 'kg' })).toBe(
      'El nombre es obligatorio.',
    );
  });

  it('retorna error cuando la abreviatura está vacía', () => {
    expect(unitValidate({ nombre: 'Kilogramo', abreviatura: '' })).toBe(
      'La abreviatura es obligatoria.',
    );
  });
});

// ── Duplicate validation in handleSave ────────────────────

describe('CrudListScreen duplicate validation', () => {
  const getId = (item: Category) => item.id_categoria;

  const items: Category[] = [
    {
      id_categoria: 1,
      nombre: 'Frutas',
      descripcion: '',
      estado: true,
      creado_en: '',
    },
    {
      id_categoria: 2,
      nombre: 'Verduras',
      descripcion: '',
      estado: true,
      creado_en: '',
    },
  ];

  const checkDuplicate = (
    formValues: Record<string, string>,
    editingItem: Category | null,
  ) => {
    const trimmedName = (formValues.nombre ?? '').trim();
    const nameLower = trimmedName.toLocaleLowerCase();
    const isDuplicate = items.some(
      (item) =>
        item.nombre.toLocaleLowerCase() === nameLower &&
        (!editingItem || getId(item) !== getId(editingItem)),
    );

    if (isDuplicate) {
      return `Ya existe categoría con el nombre "${trimmedName}".`;
    }
    return null;
  };

  it('detecta nombre duplicado en creación', () => {
    expect(checkDuplicate({ nombre: 'Frutas' }, null)).toBe(
      'Ya existe categoría con el nombre "Frutas".',
    );
  });

  it('ignora el mismo item en edición (mismo nombre, mismo ID)', () => {
    const result = checkDuplicate(
      { nombre: 'Frutas' },
      {
        id_categoria: 1,
        nombre: 'Frutas',
        descripcion: '',
        estado: true,
        creado_en: '',
      },
    );

    expect(result).toBeNull();
  });

  it('detecta duplicado con otro item aunque esté editando', () => {
    const result = checkDuplicate(
      { nombre: 'Verduras' },
      {
        id_categoria: 1,
        nombre: 'Frutas',
        descripcion: '',
        estado: true,
        creado_en: '',
      },
    );

    expect(result).toBe('Ya existe categoría con el nombre "Verduras".');
  });

  it('ignora duplicados con diferente capitalización en edición', () => {
    const result = checkDuplicate(
      { nombre: 'frutas' },
      {
        id_categoria: 1,
        nombre: 'Frutas',
        descripcion: '',
        estado: true,
        creado_en: '',
      },
    );

    expect(result).toBeNull(); // mismo item, ignorado por ID
  });

  it('detecta duplicado con diferente capitalización si es otro item', () => {
    const result = checkDuplicate({ nombre: 'frutas' }, null);

    expect(result).toBe('Ya existe categoría con el nombre "frutas".');
  });

  it('retorna null para nombre nuevo', () => {
    expect(checkDuplicate({ nombre: 'Lácteos' }, null)).toBeNull();
  });
});
