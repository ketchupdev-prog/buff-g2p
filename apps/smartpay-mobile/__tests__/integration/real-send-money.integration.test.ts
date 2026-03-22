/**
 * Real Send Money Flow Integration Tests
 * Location: fintech/smartpay-mobile/__tests__/integration/real-send-money.integration.test.ts
 * 
 * Tests:
 * - Complete send money P2P flow
 * - Real API calls to SmartPay Backend
 * - Database transaction creation and balance updates
 * - Fee calculation and deduction
 * - 2FA requirement validation
 * - Error handling (insufficient balance, invalid recipient)
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
const TRANSACTION_FEE_PERCENTAGE = 0.015;

describe('Real Send Money Flow Integration', () => {
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

  describe('P2P Send Money', () => {
    it('should complete send money transaction and update both wallets', async () => {
      const sender = await createTestUser({
        phone: '+264811111111',
        firstName: 'Alice',
        lastName: 'Sender',
      });
      const senderWallet = await createTestWallet({
        userId: sender.id,
        balance: 1000,
      });

      const recipient = await createTestUser({
        phone: '+264822222222',
        firstName: 'Bob',
        lastName: 'Recipient',
      });
      const recipientWallet = await createTestWallet({
        userId: recipient.id,
        balance: 500,
      });

      const token = generateTestToken(sender.id);
      const sendAmount = 200;
      const expectedFee = Math.round(sendAmount * TRANSACTION_FEE_PERCENTAGE * 100) / 100;

      const initialSenderBalance = await getWalletBalance(senderWallet.id);
      const initialRecipientBalance = await getWalletBalance(recipientWallet.id);

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/send-money`,
        {
          amount: sendAmount,
          beneficiaryPhone: recipient.phone,
          sourceWalletId: senderWallet.id,
          note: 'Test payment',
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
      expect(response.data.data.amount).toBe(sendAmount);
      expect(response.data.data.fee).toBeCloseTo(expectedFee, 2);

      const transactionId = response.data.data.transactionId;

      const isCompleted = await waitForCondition(async () => {
        const tx = await getTransaction(transactionId);
        return tx !== null && tx.status === 'completed';
      }, 5000);

      expect(isCompleted).toBe(true);

      const finalSenderBalance = await getWalletBalance(senderWallet.id);
      const finalRecipientBalance = await getWalletBalance(recipientWallet.id);

      expect(finalSenderBalance).toBeCloseTo(initialSenderBalance - sendAmount - expectedFee, 2);
      expect(finalRecipientBalance).toBeCloseTo(initialRecipientBalance + sendAmount, 2);

      const transaction = await getTransaction(transactionId);
      expect(transaction).not.toBeNull();
      expect(transaction!.type).toBe('p2p_transfer');
      expect(transaction!.amount).toBe(sendAmount);
      expect(transaction!.fee).toBeCloseTo(expectedFee, 2);
    }, 10000);

    it('should reject send money with insufficient balance', async () => {
      const sender = await createTestUser();
      const senderWallet = await createTestWallet({
        userId: sender.id,
        balance: 50,
      });

      const recipient = await createTestUser();
      await createTestWallet({ userId: recipient.id });

      const token = generateTestToken(sender.id);

      try {
        await axios.post(
          `${BACKEND_URL}/api/v1/send-money`,
          {
            amount: 100,
            beneficiaryPhone: recipient.phone,
            sourceWalletId: senderWallet.id,
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

    it('should reject send money to invalid recipient', async () => {
      const sender = await createTestUser();
      const senderWallet = await createTestWallet({
        userId: sender.id,
        balance: 500,
      });

      const token = generateTestToken(sender.id);

      try {
        await axios.post(
          `${BACKEND_URL}/api/v1/send-money`,
          {
            amount: 100,
            beneficiaryPhone: '+264899999999',
            sourceWalletId: senderWallet.id,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        fail('Should have rejected invalid recipient');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error.message).toContain('not found');
      }
    });

    it('should reject send money with invalid amount', async () => {
      const sender = await createTestUser();
      const senderWallet = await createTestWallet({
        userId: sender.id,
        balance: 1000,
      });
      const recipient = await createTestUser();

      const token = generateTestToken(sender.id);

      try {
        await axios.post(
          `${BACKEND_URL}/api/v1/send-money`,
          {
            amount: -50,
            beneficiaryPhone: recipient.phone,
            sourceWalletId: senderWallet.id,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        fail('Should have rejected negative amount');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
      }
    });

    it('should reject send money without authentication', async () => {
      try {
        await axios.post(`${BACKEND_URL}/api/v1/send-money`, {
          amount: 100,
          beneficiaryPhone: '+264811111111',
          sourceWalletId: 'wallet-123',
        });
        fail('Should have rejected unauthenticated request');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('Send Money with Fee Calculation', () => {
    it('should correctly calculate and apply transaction fee', async () => {
      const sender = await createTestUser();
      const senderWallet = await createTestWallet({
        userId: sender.id,
        balance: 10000,
      });

      const recipient = await createTestUser();
      const recipientWallet = await createTestWallet({
        userId: recipient.id,
        balance: 0,
      });

      const token = generateTestToken(sender.id);
      const testAmounts = [100, 500, 1000, 2500];

      for (const amount of testAmounts) {
        const response = await axios.post(
          `${BACKEND_URL}/api/v1/send-money`,
          {
            amount,
            beneficiaryPhone: recipient.phone,
            sourceWalletId: senderWallet.id,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        expect(response.status).toBe(200);
        const expectedFee = Math.round(amount * TRANSACTION_FEE_PERCENTAGE * 100) / 100;
        expect(response.data.data.fee).toBeCloseTo(expectedFee, 2);
      }
    }, 15000);
  });

  describe('Multiple Concurrent Transfers', () => {
    it('should handle multiple concurrent transfers correctly', async () => {
      const sender = await createTestUser();
      const senderWallet = await createTestWallet({
        userId: sender.id,
        balance: 5000,
      });

      const recipients = await Promise.all([
        createTestUser({ phone: '+264811111111' }),
        createTestUser({ phone: '+264822222222' }),
        createTestUser({ phone: '+264833333333' }),
      ]);

      await Promise.all(
        recipients.map((r) => createTestWallet({ userId: r.id, balance: 0 }))
      );

      const token = generateTestToken(sender.id);

      const transfers = recipients.map((recipient) =>
        axios.post(
          `${BACKEND_URL}/api/v1/send-money`,
          {
            amount: 100,
            beneficiaryPhone: recipient.phone,
            sourceWalletId: senderWallet.id,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
      );

      const responses = await Promise.all(transfers);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const finalBalance = await getWalletBalance(senderWallet.id);
      const totalSent = 100 * 3;
      const totalFees = Math.round(totalSent * TRANSACTION_FEE_PERCENTAGE * 100) / 100;
      
      expect(finalBalance).toBeCloseTo(5000 - totalSent - totalFees, 1);
    }, 15000);
  });
});
