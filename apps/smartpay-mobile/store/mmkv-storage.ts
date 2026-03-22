/**
 * MMKV-backed storage for Zustand persist middleware.
 * Falls back to in-memory storage in Expo Go (MMKV native module not available).
 * Location: fintech/smartpay/store/mmkv-storage.ts
 */
import type { StateStorage } from 'zustand/middleware';

type StorageInterface = {
  getString: (k: string) => string | undefined;
  set: (k: string, v: string) => void;
  delete: (k: string) => void;
};

let storage: StorageInterface | undefined;

function getStorage(): StorageInterface {
  if (storage) return storage;
  try {
    const { MMKV } = require('react-native-mmkv');
    const mmkvStorage = new MMKV({ id: 'smartpay-storage' });
    storage = mmkvStorage;
    return mmkvStorage;
  } catch {
    const memory: Record<string, string> = {};
    const memoryStorage: StorageInterface = {
      getString: (k: string) => memory[k],
      set: (k: string, v: string) => { memory[k] = v; },
      delete: (k: string) => { delete memory[k]; },
    };
    storage = memoryStorage;
    return memoryStorage;
  }
}

export const zustandStorage: StateStorage = {
  getItem: (name: string) => {
    const store = getStorage();
    return store.getString(name) ?? null;
  },
  setItem: (name: string, value: string) => {
    const store = getStorage();
    store.set(name, value);
  },
  removeItem: (name: string) => {
    const store = getStorage();
    store.delete(name);
  },
};
