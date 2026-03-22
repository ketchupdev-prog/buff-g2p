/**
 * Real Wallets Integration Tests
 * Location: fintech/smartpay-mobile/__tests__/integration/real-wallets.integration.test.ts
 * 
 * Tests:
 * - Wallet creation
 * - Wallet listing
 * - Wallet balance updates
 * - Wallet settings updates
 * - Multiple currency wallets
 * - Default wallet handling
 */

import axios from 'axios';
import crypto from 'crypto';
import {
  initTestDatabase,
  closeTestDatabase,
  cleanupTestData,
  createTestUser,
  createTestWallet,
  getWalletBalance,
  generateTestToken,
  getTestPool,
} from './setup/test-database';
import { getBackendUrl } from './setup/test-servers';

const BACKEND_URL = getBackendUrl();

describe('Real Wallets Integration', () => {
  beforeAll(async () => {
    await initTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestData();
    await closeTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Wallet Creation', () => {
    it('should create new wallet for user', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/wallets`,
        {
          name: 'Savings Wallet',
          currency: 'NAD',
          icon: '💰',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.wallet.name).toBe('Savings Wallet');
      expect(response.data.data.wallet.currency).toBe('NAD');
      expect(response.data.data.wallet.balance).toBe(0);

      const pool = getTestPool();
      const walletCheck = await pool.query(
        'SELECT * FROM wallets WHERE id = $1',
        [response.data.data.wallet.id]
      );

      expect(walletCheck.rowCount).toBe(1);
      expect(walletCheck.rows[0].user_id).toBe(testUser.id);
    }, 10000);

    it('should create default wallet if none exists', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/wallets`,
        {
          name: 'Main Wallet',
          currency: 'NAD',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.data.wallet.is_default).toBe(true);
    });
  });

  describe('Wallet Listing', () => {
    it('should list all user wallets', async () => {
      const testUser = await createTestUser();
      
      const wallet1 = await createTestWallet({
        userId: testUser.id,
        name: 'Main Wallet',
        balance: 1000,
        isDefault: true,
      });

      const wallet2 = await createTestWallet({
        userId: testUser.id,
        name: 'Savings',
        balance: 5000,
        isDefault: false,
      });

      const token = generateTestToken(testUser.id);

      const response = await axios.get(`${BACKEND_URL}/api/v1/wallets`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.wallets).toHaveLength(2);

      const walletIds = response.data.data.wallets.map((w: any) => w.id);
      expect(walletIds).toContain(wallet1.id);
      expect(walletIds).toContain(wallet2.id);

      const defaultWallet = response.data.data.wallets.find((w: any) => w.is_default);
      expect(defaultWallet.id).toBe(wallet1.id);
    });
  });

  describe('Wallet Details', () => {
    it('should fetch wallet details by ID', async () => {
      const testUser = await createTestUser();
      const testWallet = await createTestWallet({
        userId: testUser.id,
        name: 'Test Wallet',
        balance: 2500,
        currency: 'NAD',
      });

      const token = generateTestToken(testUser.id);

      const response = await axios.get(
        `${BACKEND_URL}/api/v1/wallets/${testWallet.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.wallet.id).toBe(testWallet.id);
      expect(response.data.data.wallet.name).toBe('Test Wallet');
      expect(parseFloat(response.data.data.wallet.balance)).toBe(2500);
      expect(response.data.data.wallet.currency).toBe('NAD');
    });

    it('should return 404 for non-existent wallet', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      try {
        await axios.get(
          `${BACKEND_URL}/api/v1/wallets/${crypto.randomUUID()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        fail('Should have returned 404');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('Wallet Updates', () => {
    it('should update wallet name and icon', async () => {
      const testUser = await createTestUser();
      const testWallet = await createTestWallet({
        userId: testUser.id,
        name: 'Old Name',
      });

      const token = generateTestToken(testUser.id);

      const response = await axios.patch(
        `${BACKEND_URL}/api/v1/wallets/${testWallet.id}`,
        {
          name: 'New Savings',
          icon: '🏦',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.wallet.name).toBe('New Savings');

      const pool = getTestPool();
      const walletCheck = await pool.query(
        'SELECT name FROM wallets WHERE id = $1',
        [testWallet.id]
      );

      expect(walletCheck.rows[0].name).toBe('New Savings');
    }, 10000);
  });

  describe('Multiple Currency Wallets', () => {
    it('should support wallets in different currencies', async () => {
      const testUser = await createTestUser();
      
      const nadWallet = await createTestWallet({
        userId: testUser.id,
        name: 'NAD Wallet',
        currency: 'NAD',
        balance: 1000,
      });

      const usdWallet = await createTestWallet({
        userId: testUser.id,
        name: 'USD Wallet',
        currency: 'USD',
        balance: 500,
      });

      const token = generateTestToken(testUser.id);

      const response = await axios.get(`${BACKEND_URL}/api/v1/wallets`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.wallets).toHaveLength(2);

      const currencies = response.data.data.wallets.map((w: any) => w.currency);
      expect(currencies).toContain('NAD');
      expect(currencies).toContain('USD');
    });
  });

  describe('Wallet Deletion', () => {
    it('should delete non-default wallet', async () => {
      const testUser = await createTestUser();
      
      await createTestWallet({
        userId: testUser.id,
        name: 'Main Wallet',
        isDefault: true,
      });

      const deletableWallet = await createTestWallet({
        userId: testUser.id,
        name: 'Deletable Wallet',
        isDefault: false,
      });

      const token = generateTestToken(testUser.id);

      const response = await axios.delete(
        `${BACKEND_URL}/api/v1/wallets/${deletableWallet.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      const pool = getTestPool();
      const walletCheck = await pool.query(
        'SELECT status FROM wallets WHERE id = $1',
        [deletableWallet.id]
      );

      expect(walletCheck.rows[0].status).toBe('deleted');
    }, 10000);

    it('should reject deletion of default wallet', async () => {
      const testUser = await createTestUser();
      const defaultWallet = await createTestWallet({
        userId: testUser.id,
        isDefault: true,
      });

      const token = generateTestToken(testUser.id);

      try {
        await axios.delete(
          `${BACKEND_URL}/api/v1/wallets/${defaultWallet.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        fail('Should have rejected default wallet deletion');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error.message).toContain('default');
      }
    });
  });
});
