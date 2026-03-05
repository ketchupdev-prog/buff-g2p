/**
 * Unit tests for Offline Code Generator Service
 * 
 * Tests secure code generation, validation, and queueing.
 */

import { 
  generateOfflineCode, 
  getPendingOfflineCodes, 
  markOfflineCodeAsUsed,
  cleanupExpiredCodes
} from '../offlineCodeGenerator';

// Mock dependencies
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(() => Promise.resolve(new Uint8Array([0xAB, 0xCD, 0xEF, 0x12])))
}));

jest.mock('../offlineDb', () => ({
  getDatabase: jest.fn(() => Promise.resolve({
    runAsync: jest.fn(() => Promise.resolve()),
    getAllAsync: jest.fn(() => Promise.resolve([]))
  }))
}));

describe('offlineCodeGenerator', () => {
  describe('generateOfflineCode', () => {
    it('should generate valid offline code format', async () => {
      const code = await generateOfflineCode('wallet_123', 100, 'till');
      
      expect(code.code).toMatch(/^OFFLINE-[A-F0-9]{6}-[A-F0-9]{6}$/);
      expect(code.amount).toBe(100);
      expect(code.method).toBe('till');
      expect(code.walletId).toBe('wallet_123');
    });

    it('should generate unique codes', async () => {
      const code1 = await generateOfflineCode('wallet_123', 100, 'till');
      
      // Add small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const code2 = await generateOfflineCode('wallet_123', 100, 'till');
      
      // Codes should be different due to timestamp
      expect(code1.transactionId).not.toBe(code2.transactionId);
    });

    it('should set expiry to 30 minutes', async () => {
      const now = Date.now();
      const code = await generateOfflineCode('wallet_123', 100, 'till');
      
      const expiresAt = code.expiresAt.getTime();
      const thirtyMinutes = 30 * 60 * 1000;
      
      expect(expiresAt).toBeGreaterThan(now);
      expect(expiresAt).toBeLessThanOrEqual(now + thirtyMinutes + 1000); // +1s tolerance
    });

    it('should support all cash-out methods', async () => {
      const methods: Array<'till' | 'agent' | 'merchant' | 'atm'> = ['till', 'agent', 'merchant', 'atm'];
      
      for (const method of methods) {
        const code = await generateOfflineCode('wallet_123', 100, method);
        expect(code.method).toBe(method);
      }
    });
  });

  describe('getPendingOfflineCodes', () => {
    it('should return empty array for wallet with no codes', async () => {
      const codes = await getPendingOfflineCodes('wallet_123');
      expect(codes).toEqual([]);
    });
  });

  describe('markOfflineCodeAsUsed', () => {
    it('should mark code as used', async () => {
      await expect(markOfflineCodeAsUsed('OFFLINE-ABC123-XYZ789')).resolves.not.toThrow();
    });
  });

  describe('cleanupExpiredCodes', () => {
    it('should cleanup expired codes', async () => {
      await expect(cleanupExpiredCodes()).resolves.not.toThrow();
    });
  });
});
