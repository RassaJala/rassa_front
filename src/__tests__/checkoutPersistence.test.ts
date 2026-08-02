import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearInFlightOrder,
  createIdempotencyKey,
  getInFlightOrder,
  IN_FLIGHT_ORDER_KEY,
  saveInFlightOrder,
} from '@/services/checkoutPersistence';
import type { InFlightOrderRecord } from '@/services/checkoutPersistence';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<
  typeof AsyncStorage.getItem
>;
const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<
  typeof AsyncStorage.setItem
>;
const mockRemoveItem = AsyncStorage.removeItem as jest.MockedFunction<
  typeof AsyncStorage.removeItem
>;

const record: InFlightOrderRecord = {
  idempotencyKey: 'checkout-key-1',
  payload: { items: [{ id_producto_semanal: 1, cantidad: 2 }] },
  productNames: ['Tomate'],
  total: 5,
  createdAt: '2026-07-30T12:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockImplementation(() => Promise.resolve(null));
});

describe('checkoutPersistence', () => {
  it('persiste el registro en vuelo bajo la clave dedicada', async () => {
    await saveInFlightOrder(record);

    expect(mockSetItem).toHaveBeenCalledWith(
      IN_FLIGHT_ORDER_KEY,
      JSON.stringify(record),
    );
  });

  it('recupera el registro persistido', async () => {
    mockGetItem.mockImplementation((key) =>
      key === IN_FLIGHT_ORDER_KEY
        ? Promise.resolve(JSON.stringify(record))
        : Promise.resolve(null),
    );

    const result = await getInFlightOrder();

    expect(result).toEqual(record);
  });

  it('devuelve null cuando no hay registro', async () => {
    expect(await getInFlightOrder()).toBeNull();
  });

  it('devuelve null ante JSON corrupto', async () => {
    mockGetItem.mockResolvedValue('{not json');

    expect(await getInFlightOrder()).toBeNull();
  });

  it('devuelve null ante un registro con forma inválida', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify({ idempotencyKey: 'x', total: 'not-a-number' }),
    );

    expect(await getInFlightOrder()).toBeNull();
  });

  it('elimina el registro', async () => {
    await clearInFlightOrder();

    expect(mockRemoveItem).toHaveBeenCalledWith(IN_FLIGHT_ORDER_KEY);
  });

  it('no lanza si el storage falla (red de seguridad best-effort)', async () => {
    mockSetItem.mockRejectedValue(new Error('storage full'));

    await expect(saveInFlightOrder(record)).resolves.toBeUndefined();
  });

  it('genera claves de idempotencia únicas con prefijo checkout-', () => {
    const a = createIdempotencyKey();
    const b = createIdempotencyKey();

    expect(a).toMatch(/^checkout-/);
    expect(a).not.toBe(b);
  });
});
