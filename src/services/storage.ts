/* globals console -- Allow console methods for logging */
import { Platform } from 'react-native';

import * as SecureStore from 'expo-secure-store';

export async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      // eslint-disable-next-line no-undef -- web only
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      // eslint-disable-next-line no-undef -- web only
      window.localStorage.setItem(key, value);
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
    return;
  }
  return SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      // eslint-disable-next-line no-undef -- web only
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
    return;
  }
  return SecureStore.deleteItemAsync(key);
}
