/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef, @typescript-eslint/no-explicit-any, security/detect-object-injection -- Test files are less strict */
import { Platform } from 'react-native';

import * as SecureStore from 'expo-secure-store';

import * as Storage from '../services/storage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('Storage (native)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getItemAsync llama a SecureStore.getItemAsync en native', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('stored_value');

    const result = await Storage.getItemAsync('test_key');

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('test_key');
    expect(result).toBe('stored_value');
  });

  it('setItemAsync llama a SecureStore.setItemAsync en native', async () => {
    await Storage.setItemAsync('test_key', 'test_value');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'test_key',
      'test_value',
    );
  });

  it('deleteItemAsync llama a SecureStore.deleteItemAsync en native', async () => {
    await Storage.deleteItemAsync('test_key');

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('test_key');
  });

  it('retorna null cuando SecureStore.getItemAsync falla', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(
      new Error('Keychain locked'),
    );

    await expect(Storage.getItemAsync('test_key')).rejects.toThrow(
      'Keychain locked',
    );
  });

  it('setItemAsync propaga error de SecureStore', async () => {
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(
      new Error('Storage full'),
    );

    await expect(Storage.setItemAsync('test_key', 'value')).rejects.toThrow(
      'Storage full',
    );
  });
});

describe('Storage (web)', () => {
  let originalOS: string;

  beforeAll(() => {
    originalOS = Platform.OS;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'web';

    // Mock sessionStorage
    const store: Record<string, string> = {};
    (global as any).sessionStorage = {
      getItem: jest.fn((key: string) => store[key] ?? null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
    };
  });

  afterAll(() => {
    (Platform as any).OS = originalOS;
  });

  it('getItemAsync lee de sessionStorage en web', async () => {
    (global as any).sessionStorage.setItem('test_key', 'web_value');

    const result = await Storage.getItemAsync('test_key');

    expect((global as any).sessionStorage.getItem).toHaveBeenCalledWith(
      'test_key',
    );
    expect(result).toBe('web_value');
  });

  it('setItemAsync escribe en sessionStorage en web', async () => {
    await Storage.setItemAsync('test_key', 'web_value');

    expect((global as any).sessionStorage.setItem).toHaveBeenCalledWith(
      'test_key',
      'web_value',
    );
  });

  it('deleteItemAsync borra de sessionStorage en web', async () => {
    (global as any).sessionStorage.setItem('test_key', 'value');
    await Storage.deleteItemAsync('test_key');

    expect((global as any).sessionStorage.removeItem).toHaveBeenCalledWith(
      'test_key',
    );
    const result = await Storage.getItemAsync('test_key');
    expect(result).toBeNull();
  });

  it('retorna null si sessionStorage.getItem lanza excepción', async () => {
    (global as any).sessionStorage.getItem = jest.fn(() => {
      throw new Error('Storage error');
    });

    const result = await Storage.getItemAsync('test_key');
    expect(result).toBeNull();
  });

  it('no lanza si sessionStorage.setItem falla', async () => {
    (global as any).sessionStorage.setItem = jest.fn(() => {
      throw new Error('Quota exceeded');
    });

    await expect(
      Storage.setItemAsync('test_key', 'value'),
    ).resolves.toBeUndefined();
  });

  it('no lanza si sessionStorage.removeItem falla', async () => {
    (global as any).sessionStorage.removeItem = jest.fn(() => {
      throw new Error('Storage error');
    });

    await expect(Storage.deleteItemAsync('test_key')).resolves.toBeUndefined();
  });

  it('exporta ACCESS_TOKEN_KEY y REFRESH_TOKEN_KEY', () => {
    expect(Storage.ACCESS_TOKEN_KEY).toBe('access_token');
    expect(Storage.REFRESH_TOKEN_KEY).toBe('refresh_token');
  });
});
