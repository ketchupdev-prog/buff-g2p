/**
 * Secure storage – Buffr G2P.
 * Sensitive keys (tokens) use expo-secure-store; other keys use AsyncStorage.
 * Location: services/secureStorage.ts
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SECURE_KEYS = new Set([
  'buffr_access_token',
  'buffr_refresh_token',
  'buffr_2fa_pin_hash',
]);

/**
 * Get item: SecureStore for token/secret keys, AsyncStorage otherwise.
 */
export async function getSecureItem(key: string): Promise<string | null> {
  if (SECURE_KEYS.has(key)) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn('SecureStore get failed for', key, e);
      return null;
    }
  }
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    console.warn('AsyncStorage get failed for', key, e);
    return null;
  }
}

/**
 * Set item: SecureStore for token/secret keys, AsyncStorage otherwise.
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  if (SECURE_KEYS.has(key)) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

/**
 * Remove item from SecureStore or AsyncStorage depending on key.
 */
export async function removeSecureItem(key: string): Promise<void> {
  if (SECURE_KEYS.has(key)) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn('SecureStore delete failed for', key, e);
    }
    return;
  }
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn('AsyncStorage remove failed for', key, e);
  }
}
