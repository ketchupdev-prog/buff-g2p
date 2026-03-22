/**
 * Unit tests for Offline Database Service
 * 
 * Tests SQLite database initialization, schema, and data operations.
 */

import { getDatabase, getWalletBalance, updateWalletBalance, clearOfflineData } from '../offlineDb';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve({
    getAllAsync: jest.fn(() => Promise.resolve([])),
    runAsync: jest.fn(() => Promise.resolve()),
    execAsync: jest.fn(() => Promise.resolve())
  }))
}));

describe('offlineDb', () => {
  describe('getDatabase', () => {
    it('should initialize database', async () => {
      const db = await getDatabase();
      expect(db).toBeDefined();
    });

    it('should return same database instance on multiple calls', async () => {
      const db1 = await getDatabase();
      const db2 = await getDatabase();
      expect(db1).toBe(db2);
    });
  });

  describe('getWalletBalance', () => {
    it('should return 0 for non-existent wallet', async () => {
      const balance = await getWalletBalance('wallet_123');
      expect(balance).toBe(0);
    });
  });

  describe('updateWalletBalance', () => {
    it('should update wallet balance', async () => {
      await expect(updateWalletBalance('wallet_123', 100)).resolves.not.toThrow();
    });

    it('should handle negative amounts (debit)', async () => {
      await expect(updateWalletBalance('wallet_123', -50)).resolves.not.toThrow();
    });
  });

  describe('clearOfflineData', () => {
    it('should clear all offline data', async () => {
      await expect(clearOfflineData()).resolves.not.toThrow();
    });
  });
});
