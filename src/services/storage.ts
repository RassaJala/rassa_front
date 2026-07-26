import { Platform } from 'react-native';

import * as SecureStore from 'expo-secure-store';

// ── Token storage keys ────────────────────────────────────
export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const ONBOARDING_KEY = 'onboarding_completed';

function isWeb(): boolean {
  return Platform.OS === 'web';
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (isWeb()) {
    try {
      // ponytail: localStorage over sessionStorage — tokens survive tab navigation
      // and refresh-token rotation works across tabs. The storage event listener
      // in AuthProvider syncs logout across tabs. Real XSS mitigation requires
      // httpOnly cookies served from the backend + CSP.

      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (isWeb()) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Silently ignore storage errors; upstream handles auth failures
    }
    return;
  }
  return SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (isWeb()) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Silently ignore storage errors
    }
    return;
  }
  return SecureStore.deleteItemAsync(key);
}
