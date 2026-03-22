/**
 * Real Transactions Integration Tests
 * Location: fintech/smartpay-mobile/__tests__/integration/real-transactions.integration.test.ts
 * 
 * Tests:
 * - Transaction listing with filters
 * - Transaction details
 * - Transaction history
 * - Transaction analytics
 * - Real API calls and database queries
 */

import axios from 'axios';
import crypto from 'crypto';
import {
  initTestDatabase,
  closeTestDatabase,
  cleanupTestData,
  createTestUser,
  createTestWallet,
  createTestTransaction,
  generateTestToken,
  getTestPool,
} from './setup/test-database';
import { getBackendUrl } from './setup/test-servers';

const BACKEND_URL = getBackendUrl();

describe('Real Transactions Integration', () => {
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

  describe('Transaction Listing', () => {
    it('should list user transactions', async () => {
      const testUser = await createTestUser();
      const testWallet = await createTestWallet({ userId: testUser.id });

      await createTestTransaction({
        userId: testUser.id,
        walletId: testWallet.id,
        type: 'p2p_transfer',
        amount: 100,
        status: 'completed',
      });

      await createTestTransaction({
        userId: testUser.id,
        walletId: testWallet.id,
        type: 'voucher_redemption',
        amount: 500,
        status: 'completed',
      });

      const token = generateTestToken(testUser.id);

      const response = await axios.get(`${BACKEND_URL}/api/v1/transactions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.transactions).toHaveLength(2);
    });

    it('should filter transactions by wallet ID', async () => {
      const testUser = await createTestUser();
      const wallet1 = await createTestWallet({ userId: testUser.id, name: 'Wallet 1' });
      const wallet2 = await createTestWallet({ userId: testUser.id, name: 'Wallet 2' });

      await createTestTransaction({
        userId: testUser.id,
        walletId: wallet1.id,
        type: 'p2p_transfer',
        amount: 100,
      });

      await createTestTransaction({
        userId: testUser.id,
        walletId: wallet2.id,
        type: 'cash_out',
        amount: 200,
      });

      const token = generateTestToken(testUser.id);

      const response = await axios.get(
        `${BACKEND_URL}/api/v1/transactions?walletId=${wallet1.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.data.transactions).toHaveLength(1);
      expect(response.data.data.transactions[0].destination_wallet_id).toBe(wallet1.id);
    });

    it('should paginate transaction results', async () => {
      const testUser = await createTestUser();
      const testWallet = await createTestWallet({ userId: testUser.id });

      for (let i = 0; i < 25; i++) {
        await createTestTransaction({
          userId: testUser.id,
          walletId: testWallet.id,
          type: 'p2p_transfer',
          amount: 10 * (i + 1),
        });
      }

      const token = generateTestToken(testUser.id);

      const response = await axios.get(
        `${BACKEND_URL}/api/v1/transactions?limit=10&offset=0`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.data.transactions).toHaveLength(10);
      expect(response.data.data.pagination.total).toBe(25);
      expect(response.data.data.pagination.hasMore).toBe(true);
    }, 15000);
  });

  describe('Transaction Details', () => {
    it('should fetch transaction details by ID', async () => {
      const testUser = await createTestUser();
      const testWallet = await createTestWallet({ userId: testUser.id });

      const transaction = await createTestTransaction({
        userId: testUser.id,
        walletId: testWallet.id,
        type: 'voucher_redemption',
        amount: 1000,
        status: 'completed',
      });

      const token = generateTestToken(testUser.id);

      const response = await axios.get(
        `${BACKEND_URL}/api/v1/transactions/${transaction.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.transaction.id).toBe(transaction.id);
      expect(response.data.data.transaction.type).toBe('voucher_redemption');
      expect(parseFloat(response.data.data.transaction.amount)).toBe(1000);
    });

    it('should return 404 for non-existent transaction', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      try {
        await axios.get(
          `${BACKEND_URL}/api/v1/transactions/${crypto.randomUUID()}`,
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

  describe('Transaction Summary', () => {
    it('should generate transaction summary for period', async () => {
      const testUser = await createTestUser();
      const testWallet = await createTestWallet({ userId: testUser.id, balance: 10000 });

      await createTestTransaction({
        userId: testUser.id,
        walletId: testWallet.id,
        type: 'p2p_transfer',
        amount: -200,
        status: 'completed',
      });

      await createTestTransaction({
        userId: testUser.id,
        walletId: testWallet.id,
        type: 'voucher_redemption',
        amount: 500,
        status: 'completed',
      });

      await createTestTransaction({
        userId: testUser.id,
        walletId: testWallet.id,
        type: 'cash_out',
        amount: -300,
        status: 'completed',
      });

      const token = generateTestToken(testUser.id);

      const response = await axios.get(
        `${BACKEND_URL}/api/v1/transactions/summary?days=7`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.totalCredits).toBe(500);
      expect(response.data.data.totalDebits).toBe(500);
      expect(response.data.data.recentTransactions).toBeDefined();
    }, 10000);
  });
});
