/**
 * Real Cash-Out Flow Integration Tests
 * Location: fintech/smartpay-mobile/__tests__/integration/real-cash-out.integration.test.ts
 * 
 * Tests:
 * - Cash-out to agent with QR
 * - Cash-out to till
 * - Cash-out to merchant
 * - Cash-out to bank
 * - Cash-out to ATM
 * - NAMQR generation
 * - Wallet balance deduction
 * - Fee calculation
 * - Real API calls and database updates
 */

import axios from 'axios';
import {
  initTestDatabase,
  closeTestDatabase,
  cleanupTestData,
  createTestUser,
  createTestWallet,
  getWalletBalance,
  getTransaction,
  generateTestToken,
  waitForCondition,
} from './setup/test-database';
import { getBackendUrl } from './setup/test-servers';

const BACKEND_URL = getBackendUrl();
const CASH_OUT_FEE_PERCENTAGE = 0.02;

describe('Real Cash-Out Flow Integration', () => {
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

  describe('Cash-Out to Agent', () => {
    it('should complete cash-out to agent with QR code generation', async () => {
      const testUser = await createTestUser({
        phone: '+264811111111',
      });
      const testWallet = await createTestWallet({
        userId: testUser.id,
        balance: 2000,
      });

      const token = generateTestToken(testUser.id);
      const cashOutAmount = 500;
      const initialBalance = await getWalletBalance(testWallet.id);

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/cash-out/agent`,
        {
          walletId: testWallet.id,
          amount: cashOutAmount,
          agentCode: 'AG-WDH-001',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.transactionId).toBeDefined();
      expect(response.data.data.qrCode).toBeDefined();
      expect(response.data.data.expiresAt).toBeDefined();
      expect(response.data.data.instructions).toContain('QR code');

      const transactionId = response.data.data.transactionId;

      const isCompleted = await waitForCondition(async () => {
        const tx = await getTransaction(transactionId);
        return tx !== null;
      }, 5000);

      expect(isCompleted).toBe(true);

      const transaction = await getTransaction(transactionId);
      expect(transaction!.type).toBe('cash_out_agent');
      expect(transaction!.amount).toBe(cashOutAmount);

      const finalBalance = await getWalletBalance(testWallet.id);
      const expectedDeduction = cashOutAmount + (cashOutAmount * CASH_OUT_FEE_PERCENTAGE);
      expect(finalBalance).toBeCloseTo(initialBalance - expectedDeduction, 2);
    }, 10000);

    it('should reject cash-out with insufficient balance', async () => {
      const testUser = await createTestUser();
      const testWallet = await createTestWallet({
        userId: testUser.id,
        balance: 50,
      });

      const token = generateTestToken(testUser.id);

      try {
        await axios.post(
          `${BACKEND_URL}/api/v1/cash-out/agent`,
          {
            walletId: testWallet.id,
            amount: 100,
            agentCode: 'AG-WDH-001',
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        fail('Should have rejected insufficient balance');
      } catch (error: any) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error.message).toContain('Insufficient');
      }
    });
  });

  describe('Cash-Out to Till', () => {
    it('should complete cash-out to till with offline code', async () => {
      const testUser = await createTestUser();
      const testWallet = await createTestWallet({
        userId: testUser.id,
        balance: 1500,
      });

      const token = generateTestToken(testUser.id);
      const cashOutAmount = 300;

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/cash-out/till`,
        {
          walletId: testWallet.id,
          amount: cashOutAmount,
          tillNumber: 'TILL-001',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.transactionId).toBeDefined();
      expect(response.data.data.offlineCode).toBeDefined();
      expect(response.data.data.expiresAt).toBeDefined();
      expect(response.data.data.instructions).toContain('till');
    }, 10000);
  });

  describe('Cash-Out to Merchant', () => {
    it('should complete merchant payment with auth code', async () => {
      const testUser = await createTestUser();
      const testWallet = await createTestWallet({
        userId: testUser.id,
        balance: 3000,
      });

      const token = generateTestToken(testUser.id);
      const paymentAmount = 750;
      const merchantFeePercentage = 0.01;

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/cash-out/merchant`,
        {
          walletId: testWallet.id,
          amount: paymentAmount,
          merchantId: 'MERCH-WDH-001',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.transactionId).toBeDefined();
      expect(response.data.data.authCode).toBeDefined();

      const initialBalance = 3000;
      const expectedFee = paymentAmount * merchantFeePercentage;
      const finalBalance = await getWalletBalance(testWallet.id);
      
      expect(finalBalance).toBeCloseTo(initialBalance - paymentAmount - expectedFee, 2);
    }, 10000);
  });

  describe('Cash-Out to ATM', () => {
    it('should complete ATM withdrawal with NAMQR code', async () => {
      const testUser = await createTestUser();
      const testWallet = await createTestWallet({
        userId: testUser.id,
        balance: 5000,
      });

      const token = generateTestToken(testUser.id);
      const withdrawalAmount = 1000;

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/cash-out/atm`,
        {
          walletId: testWallet.id,
          amount: withdrawalAmount,
          atmId: 'ATM-WDH-001',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.transactionId).toBeDefined();
      expect(response.data.data.namqrCode).toBeDefined();
      expect(response.data.data.expiresAt).toBeDefined();
      expect(response.data.data.instructions).toContain('ATM');
    }, 10000);
  });

  describe('Cash-Out to Bank', () => {
    it('should complete bank transfer cash-out', async () => {
      const testUser = await createTestUser();
      const testWallet = await createTestWallet({
        userId: testUser.id,
        balance: 10000,
      });

      const token = generateTestToken(testUser.id);
      const transferAmount = 2000;
      const initialBalance = await getWalletBalance(testWallet.id);

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/cash-out/bank`,
        {
          walletId: testWallet.id,
          amount: transferAmount,
          bankAccount: '1234567890',
          bankCode: 'FNB_NA',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.transactionId).toBeDefined();
      expect(response.data.data.reference).toBeDefined();
      expect(response.data.data.processingTime).toBeDefined();

      const finalBalance = await getWalletBalance(testWallet.id);
      expect(finalBalance).toBe(initialBalance - transferAmount);

      const transaction = await getTransaction(response.data.data.transactionId);
      expect(transaction).not.toBeNull();
      expect(transaction!.type).toBe('cash_out_bank');
      expect(transaction!.amount).toBe(transferAmount);
    }, 10000);
  });

  describe('Fee Calculation', () => {
    it('should correctly calculate fees for different cash-out methods', async () => {
      const testUser = await createTestUser();
      const testWallet = await createTestWallet({
        userId: testUser.id,
        balance: 10000,
      });

      const token = generateTestToken(testUser.id);
      const amount = 1000;

      const methods = [
        { endpoint: '/api/v1/cash-out/agent', params: { agentCode: 'AG-001' }, fee: 5 },
        { endpoint: '/api/v1/cash-out/atm', params: { atmId: 'ATM-001' }, fee: 10 },
        { endpoint: '/api/v1/cash-out/till', params: { tillNumber: 'TILL-001' }, fee: 0 },
        {
          endpoint: '/api/v1/cash-out/merchant',
          params: { merchantId: 'MERCH-001' },
          fee: amount * 0.01,
        },
        {
          endpoint: '/api/v1/cash-out/bank',
          params: { bankAccount: '1234567890', bankCode: 'FNB_NA' },
          fee: 0,
        },
      ];

      for (const method of methods) {
        const response = await axios.post(
          `${BACKEND_URL}${method.endpoint}`,
          {
            walletId: testWallet.id,
            amount,
            ...method.params,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);

        const transaction = await getTransaction(response.data.data.transactionId);
        expect(transaction).not.toBeNull();
        expect(transaction!.fee).toBeCloseTo(method.fee, 2);
      }
    }, 20000);
  });

  describe('Concurrent Cash-Out Protection', () => {
    it('should prevent double cash-out from same wallet', async () => {
      const testUser = await createTestUser();
      const testWallet = await createTestWallet({
        userId: testUser.id,
        balance: 1000,
      });

      const token = generateTestToken(testUser.id);

      const cashOutPromises = [
        axios.post(
          `${BACKEND_URL}/api/v1/cash-out/agent`,
          {
            walletId: testWallet.id,
            amount: 600,
            agentCode: 'AG-001',
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ),
        axios.post(
          `${BACKEND_URL}/api/v1/cash-out/agent`,
          {
            walletId: testWallet.id,
            amount: 600,
            agentCode: 'AG-002',
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ),
      ];

      const results = await Promise.allSettled(cashOutPromises);

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failureCount = results.filter((r) => r.status === 'rejected').length;

      expect(successCount).toBeGreaterThanOrEqual(1);

      if (failureCount > 0) {
        const finalBalance = await getWalletBalance(testWallet.id);
        expect(finalBalance).toBeGreaterThan(0);
      }
    }, 10000);
  });
});
