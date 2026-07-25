/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, sonarjs/no-duplicate-string, @typescript-eslint/no-unsafe-argument -- Test files are less strict */
import type { WizardItemDraft } from '@/hooks/usePublicationWizard';
import {
  generateLocalTempId,
  isLocalFileUri,
  validateItem,
  withTimeout,
} from '@/hooks/usePublicationWizard';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('axios-retry', () => jest.fn());

jest.mock('axios', () => {
  const mockAxios = jest.fn() as any;
  mockAxios.create = jest.fn(() => mockAxios);
  mockAxios.get = jest.fn();
  mockAxios.post = jest.fn();
  mockAxios.patch = jest.fn();
  mockAxios.delete = jest.fn();
  mockAxios.isAxiosError = jest.fn((err: any) => err?.isAxiosError === true);
  mockAxios.interceptors = {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  };
  return { __esModule: true, default: mockAxios };
});

// ── generateTempId ─────────────────────────────────────────

describe('generateLocalTempId', () => {
  it('returns string starting with local_', () => {
    const id = generateLocalTempId();
    expect(id).toMatch(/^local_\d+_/);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateLocalTempId()));
    expect(ids.size).toBe(50);
  });
});

// ── isLocalFileUri ──────────────────────────────────────────

describe('isLocalFileUri', () => {
  it('returns true for file:// URIs', () => {
    expect(isLocalFileUri('file:///data/photo.jpg')).toBe(true);
  });

  it('returns false for http URLs', () => {
    expect(isLocalFileUri('https://cdn.example.com/photo.jpg')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isLocalFileUri('')).toBe(false);
  });
});

// ── validateItem ────────────────────────────────────────────

function makeValidItem(overrides?: Partial<WizardItemDraft>): WizardItemDraft {
  return {
    tempId: 'temp_1',
    fk_producto: 10,
    fk_unidad: 1,
    stock: '5',
    precio: '1200',
    foto: 'https://cdn.example.com/foto.jpg',
    ...overrides,
  };
}

describe('validateItem', () => {
  it('returns empty object for a valid item', () => {
    const errors = validateItem(makeValidItem());
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('returns error when stock is empty', () => {
    const errors = validateItem(makeValidItem({ stock: '' }));
    expect(errors.stock).toBeDefined();
  });

  it('returns error when stock is zero', () => {
    const errors = validateItem(makeValidItem({ stock: '0' }));
    expect(errors.stock).toBeDefined();
  });

  it('returns error when stock is NaN', () => {
    const errors = validateItem(makeValidItem({ stock: 'abc' }));
    expect(errors.stock).toBeDefined();
  });

  it('returns error when precio is empty', () => {
    const errors = validateItem(makeValidItem({ precio: '' }));
    expect(errors.precio).toBeDefined();
  });

  it('returns error when precio is zero', () => {
    const errors = validateItem(makeValidItem({ precio: '0' }));
    expect(errors.precio).toBeDefined();
  });

  it('returns error when fk_unidad is 0', () => {
    const errors = validateItem(makeValidItem({ fk_unidad: 0 }));
    expect(errors.fk_unidad).toBeDefined();
  });

  it('returns error when foto is null', () => {
    const errors = validateItem(makeValidItem({ foto: null }));
    expect(errors.foto).toBeDefined();
  });

  it('returns error when foto is empty string', () => {
    const errors = validateItem(makeValidItem({ foto: '  ' }));
    expect(errors.foto).toBeDefined();
  });

  it('returns all errors for a completely invalid item', () => {
    const errors = validateItem(
      makeValidItem({
        stock: '',
        precio: '',
        fk_unidad: 0,
        foto: null,
      }),
    );
    expect(Object.keys(errors)).toHaveLength(4);
  });
});

// ── withTimeout ─────────────────────────────────────────────

describe('withTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves if promise completes before timeout', async () => {
    const result = await withTimeout(Promise.resolve('ok'), 5000);
    expect(result).toBe('ok');
  });

  it('rejects with timeout error if promise is too slow', async () => {
    const neverResolves = new Promise<string>(() => {});
    const promise = withTimeout(neverResolves, 1000);

    jest.advanceTimersByTime(1000);

    await expect(promise).rejects.toThrow('tardó más de 1000ms');
  });

  it('clears timeout on success', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    await withTimeout(Promise.resolve('done'), 5000);

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});

// ── Hook integration tests (via renderHook with QueryClient) ──

import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import type { Producto } from '@/services/productos';

jest.mock('@/services/publications', () => ({
  createPublicacion: jest.fn(),
  deletePublicacion: jest.fn(),
  publishPublicacion: jest.fn(),
  addProductoSemanal: jest.fn(),
  updateProductoSemanal: jest.fn(),
  deleteProductoSemanal: jest.fn(),
  uploadProductoSemanalImagen: jest.fn(),
}));

const { usePublicationWizard } =
  require('@/hooks/usePublicationWizard') as typeof import('@/hooks/usePublicationWizard');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
}

const sampleProducto: Producto = {
  id_producto: 10,
  nombre_producto: 'Tomate',
  descripcion: 'Tomate cherry',
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
  creado_en: '2025-01-01',
};

describe('usePublicationWizard hook', () => {
  it('starts on the fecha step', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePublicationWizard({ publicacion: undefined, productos: [] }),
      { wrapper },
    );
    expect(result.current.currentStep).toBe('fecha');
    expect(result.current.stepIndex).toBe(0);
  });

  it('navigates forward and backward through steps', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePublicationWizard({ publicacion: undefined, productos: [] }),
      { wrapper },
    );

    act(() => result.current.nextStep());
    expect(result.current.currentStep).toBe('productos');
    expect(result.current.stepIndex).toBe(1);

    act(() => result.current.nextStep());
    expect(result.current.currentStep).toBe('resumen');

    act(() => result.current.prevStep());
    expect(result.current.currentStep).toBe('productos');
  });

  it('does not go beyond last step', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePublicationWizard({ publicacion: undefined, productos: [] }),
      { wrapper },
    );

    act(() => result.current.goToStep('publicar'));
    expect(result.current.stepIndex).toBe(3);

    act(() => result.current.nextStep());
    expect(result.current.stepIndex).toBe(3);
  });

  it('does not go below first step', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePublicationWizard({ publicacion: undefined, productos: [] }),
      { wrapper },
    );

    act(() => result.current.prevStep());
    expect(result.current.stepIndex).toBe(0);
  });

  it('adds a new item', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePublicationWizard({ publicacion: undefined, productos: [] }),
      { wrapper },
    );

    act(() => result.current.addItem(sampleProducto));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.fk_producto).toBe(10);
  });

  it('does not add duplicate items', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePublicationWizard({ publicacion: undefined, productos: [] }),
      { wrapper },
    );

    act(() => result.current.addItem(sampleProducto));
    act(() => result.current.addItem(sampleProducto));
    expect(result.current.items).toHaveLength(1);
  });

  it('removes an item', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePublicationWizard({ publicacion: undefined, productos: [] }),
      { wrapper },
    );

    act(() => result.current.addItem(sampleProducto));
    const tempId = result.current.items[0]?.tempId;
    expect(tempId).toBeDefined();

    act(() => result.current.removeItem(tempId!));
    expect(result.current.items).toHaveLength(0);
  });

  it('updates an item field', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePublicationWizard({ publicacion: undefined, productos: [] }),
      { wrapper },
    );

    act(() => result.current.addItem(sampleProducto));
    const tempId = result.current.items[0]?.tempId;
    expect(tempId).toBeDefined();

    act(() => result.current.updateItem(tempId!, 'stock', '42'));
    expect(result.current.items[0]?.stock).toBe('42');

    act(() => result.current.updateItem(tempId!, 'precio', '2000'));
    expect(result.current.items[0]?.precio).toBe('2000');
  });

  it('validateItems returns false when items have errors', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePublicationWizard({ publicacion: undefined, productos: [] }),
      { wrapper },
    );

    act(() => result.current.addItem(sampleProducto));

    let isValid = true;
    act(() => {
      isValid = result.current.validateItems();
    });

    expect(isValid).toBe(false);
    expect(result.current.hasItemErrors).toBe(true);
  });

  it('validateItems returns true when all items are valid', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePublicationWizard({ publicacion: undefined, productos: [] }),
      { wrapper },
    );

    act(() => result.current.addItem(sampleProducto));
    const tempId = result.current.items[0]?.tempId;
    expect(tempId).toBeDefined();

    act(() => result.current.updateItem(tempId!, 'stock', '10'));
    act(() => result.current.updateItem(tempId!, 'precio', '1500'));
    act(() => result.current.updateItem(tempId!, 'fk_unidad', 1));
    act(() =>
      result.current.updateItem(
        tempId!,
        'foto',
        'https://example.com/foto.jpg',
      ),
    );

    let isValid = true;
    act(() => {
      isValid = result.current.validateItems();
    });

    expect(isValid).toBe(true);
    expect(result.current.hasItemErrors).toBe(false);
  });
});
