/**
 * Jest setup – Buffr G2P.
 * Global mocks for tests (expo/RN modules not available in Node).
 */
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/services/secureStorage', () => ({
  getSecureItem: jest.fn(() => Promise.resolve(null)),
  setSecureItem: jest.fn(() => Promise.resolve()),
  removeSecureItem: jest.fn(() => Promise.resolve()),
}));
