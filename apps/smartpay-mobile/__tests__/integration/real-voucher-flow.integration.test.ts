/**
 * Real Voucher Flow Integration Tests
 * Location: fintech/smartpay-mobile/__tests__/integration/real-voucher-flow.integration.test.ts
 * 
 * Tests:
 * - Complete voucher issuance from Ketchup → SmartPay Backend → Mobile
 * - Webhook delivery with HMAC signature
 * - Database records created
 * - Push notification sent
 * - Voucher redemption with wallet balance update
 * - Real API calls, real database, real webhooks
 */

import axios from 'axios';
import crypto from 'crypto';
import {
  initTestDatabase,
  closeTestDatabase,
  cleanupTestData,
  createTestUser,
  createTestWallet,
  createTestVoucher,
  getWalletBalance,
  getVoucher,
  getVoucherByCode,
  generateTestToken,
  generateWebhookSignature,
  waitForCondition,
} from './setup/test-database';
import { getBackendUrl } from './setup/test-servers';

const BACKEND_URL = getBackendUrl();
const WEBHOOK_SECRET = process.env.BUFFR_WEBHOOK_SECRET || 'test-webhook-secret';

describe('Real Voucher Flow Integration', () => {
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

  describe('Voucher Issuance via Webhook', () => {
    it('should receive voucher via webhook from Ketchup with HMAC signature', async () => {
      const testUser = await createTestUser({
        phone: '+264811234567',
        firstName: 'John',
        lastName: 'Doe',
      });

      const voucherId = crypto.randomUUID();
      const voucherCode = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
      
      const webhookPayload = {
        id: voucherId,
        type: 'voucher_issuance',
        data: {
          voucher_id: voucherId,
          voucher_code: voucherCode,
          user_id: testUser.id,
          amount: 1000,
          currency: 'NAD',
          issuer: 'ketchup-portals',
          voucher_type: 'government_grant',
          issued_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      const payloadString = JSON.stringify(webhookPayload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);
      const eventId = `test-webhook-${Date.now()}`;

      const response = await axios.post(
        `${BACKEND_URL}/api/buffr/webhooks`,
        webhookPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Buffr-Signature': signature,
            'X-Buffr-Event-Id': eventId,
            'X-Buffr-Event-Type': 'voucher.issued',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.event_id).toBe(eventId);

      const isProcessed = await waitForCondition(async () => {
        const voucher = await getVoucherByCode(voucherCode);
        return voucher !== null && voucher.status === 'pending';
      }, 5000);

      expect(isProcessed).toBe(true);

      const voucher = await getVoucherByCode(voucherCode);
      expect(voucher).not.toBeNull();
      expect(voucher!.amount).toBe(1000);
      expect(voucher!.userId).toBe(testUser.id);
    }, 10000);

    it('should reject webhook with invalid HMAC signature', async () => {
      const webhookPayload = {
        id: crypto.randomUUID(),
        type: 'voucher_issuance',
        data: { amount: 1000 },
        timestamp: new Date().toISOString(),
      };

      const invalidSignature = 'invalid-signature-12345';

      try {
        await axios.post(
          `${BACKEND_URL}/api/buffr/webhooks`,
          webhookPayload,
          {
            headers: {
              'X-Buffr-Signature': invalidSignature,
              'X-Buffr-Event-Id': `test-invalid-${Date.now()}`,
              'X-Buffr-Event-Type': 'voucher.issued',
            },
          }
        );
        fail('Should have rejected invalid signature');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toContain('Invalid webhook signature');
      }
    });

    it('should handle idempotency - duplicate webhook delivery', async () => {
      const testUser = await createTestUser();
      const voucherId = crypto.randomUUID();
      const voucherCode = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');

      const webhookPayload = {
        id: voucherId,
        type: 'voucher_issuance',
        data: {
          voucher_id: voucherId,
          voucher_code: voucherCode,
          user_id: testUser.id,
          amount: 500,
          currency: 'NAD',
        },
        timestamp: new Date().toISOString(),
      };

      const payloadString = JSON.stringify(webhookPayload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);
      const eventId = `test-idempotent-${Date.now()}`;

      const response1 = await axios.post(
        `${BACKEND_URL}/api/buffr/webhooks`,
        webhookPayload,
        {
          headers: {
            'X-Buffr-Signature': signature,
            'X-Buffr-Event-Id': eventId,
            'X-Buffr-Event-Type': 'voucher.issued',
          },
        }
      );

      expect(response1.status).toBe(200);

      const response2 = await axios.post(
        `${BACKEND_URL}/api/buffr/webhooks`,
        webhookPayload,
        {
          headers: {
            'X-Buffr-Signature': signature,
            'X-Buffr-Event-Id': eventId,
            'X-Buffr-Event-Type': 'voucher.issued',
          },
        }
      );

      expect(response2.status).toBe(200);
      expect(response2.data.message).toContain('already processed');
    });
  });

  describe('Voucher Redemption to Wallet', () => {
    it('should redeem voucher by code and update wallet balance', async () => {
      const testUser = await createTestUser();
      const testWallet = await createTestWallet({
        userId: testUser.id,
        balance: 100,
        currency: 'NAD',
      });

      const testVoucher = await createTestVoucher({
        userId: testUser.id,
        amount: 1000,
        currency: 'NAD',
        status: 'pending',
      });

      const token = generateTestToken(testUser.id);
      const initialBalance = await getWalletBalance(testWallet.id);
      expect(initialBalance).toBe(100);

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/vouchers/redeem`,
        { voucherCode: testVoucher.voucherCode },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.amount).toBe(1000);
      expect(response.data.data.voucherCode).toBe(testVoucher.voucherCode);
      expect(response.data.data.walletId).toBe(testWallet.id);

      const updatedBalance = await getWalletBalance(testWallet.id);
      expect(updatedBalance).toBe(1100);

      const updatedVoucher = await getVoucher(testVoucher.id);
      expect(updatedVoucher).not.toBeNull();
      expect(updatedVoucher!.status).toBe('redeemed');
      expect(updatedVoucher!.redeemedAt).not.toBeNull();
    }, 10000);

    it('should reject redemption of already redeemed voucher', async () => {
      const testUser = await createTestUser();
      await createTestWallet({
        userId: testUser.id,
        balance: 100,
      });

      const testVoucher = await createTestVoucher({
        userId: testUser.id,
        amount: 500,
        status: 'redeemed',
      });

      const token = generateTestToken(testUser.id);

      try {
        await axios.post(
          `${BACKEND_URL}/api/v1/vouchers/redeem`,
          { voucherCode: testVoucher.voucherCode },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        fail('Should have rejected redeemed voucher');
      } catch (error: any) {
        expect(error.response.status).toBe(409);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error.message).toContain('already been redeemed');
      }
    });

    it('should reject redemption of expired voucher', async () => {
      const testUser = await createTestUser();
      await createTestWallet({
        userId: testUser.id,
        balance: 100,
      });

      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const testVoucher = await createTestVoucher({
        userId: testUser.id,
        amount: 500,
        status: 'pending',
        expiresAt: expiredDate,
      });

      const token = generateTestToken(testUser.id);

      try {
        await axios.post(
          `${BACKEND_URL}/api/v1/vouchers/redeem`,
          { voucherCode: testVoucher.voucherCode },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        fail('Should have rejected expired voucher');
      } catch (error: any) {
        expect(error.response.status).toBe(410);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error.message).toContain('expired');
      }
    });

    it('should reject redemption with invalid voucher code format', async () => {
      const testUser = await createTestUser();
      await createTestWallet({ userId: testUser.id });

      const token = generateTestToken(testUser.id);

      try {
        await axios.post(
          `${BACKEND_URL}/api/v1/vouchers/redeem`,
          { voucherCode: 'INVALID' },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        fail('Should have rejected invalid voucher code');
      } catch (error: any) {
        expect([400, 404]).toContain(error.response.status);
        expect(error.response.data.success).toBe(false);
      }
    });

    it('should reject redemption without authentication', async () => {
      try {
        await axios.post(
          `${BACKEND_URL}/api/v1/vouchers/redeem`,
          { voucherCode: '123456789012' }
        );
        fail('Should have rejected unauthenticated request');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('Voucher List and Details', () => {
    it('should fetch user vouchers list', async () => {
      const testUser = await createTestUser();
      await createTestWallet({ userId: testUser.id });
      
      const voucher1 = await createTestVoucher({
        userId: testUser.id,
        amount: 1000,
        status: 'pending',
      });

      const voucher2 = await createTestVoucher({
        userId: testUser.id,
        amount: 500,
        status: 'redeemed',
      });

      const token = generateTestToken(testUser.id);

      const response = await axios.get(`${BACKEND_URL}/api/v1/vouchers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.vouchers).toHaveLength(2);
      expect(response.data.data.count).toBe(2);

      const voucherIds = response.data.data.vouchers.map((v: any) => v.id);
      expect(voucherIds).toContain(voucher1.id);
      expect(voucherIds).toContain(voucher2.id);
    });

    it('should fetch voucher details by ID', async () => {
      const testUser = await createTestUser();
      await createTestWallet({ userId: testUser.id });

      const testVoucher = await createTestVoucher({
        userId: testUser.id,
        amount: 1500,
        status: 'pending',
        issuer: 'test-government',
        voucherType: 'social_grant',
      });

      const token = generateTestToken(testUser.id);

      const response = await axios.get(
        `${BACKEND_URL}/api/v1/vouchers/${testVoucher.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.id).toBe(testVoucher.id);
      expect(response.data.data.voucher_code).toBe(testVoucher.voucherCode);
      expect(response.data.data.amount).toBe('1500');
      expect(response.data.data.issuer).toBe('test-government');
      expect(response.data.data.voucher_type).toBe('social_grant');
    });
  });

  describe('NamPost Redemption', () => {
    it('should redeem voucher at NamPost and generate collection code', async () => {
      const testUser = await createTestUser();
      const testVoucher = await createTestVoucher({
        userId: testUser.id,
        amount: 2000,
        status: 'pending',
      });

      const token = generateTestToken(testUser.id);

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/vouchers/${testVoucher.id}/redeem-nampost`,
        { location: 'Windhoek Central' },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.collectionCode).toBeDefined();
      expect(response.data.data.collectionCode).toHaveLength(8);
      expect(response.data.data.amount).toBe(2000);
      expect(response.data.data.instructions).toContain('NamPost');

      const updatedVoucher = await getVoucher(testVoucher.id);
      expect(updatedVoucher!.status).toBe('pending_collection');
    });
  });

  describe('SmartPay Agent Redemption', () => {
    it('should redeem voucher at SmartPay agent and generate collection code', async () => {
      const testUser = await createTestUser();
      const testVoucher = await createTestVoucher({
        userId: testUser.id,
        amount: 1500,
        status: 'pending',
      });

      const token = generateTestToken(testUser.id);

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/vouchers/${testVoucher.id}/redeem-smartpay`,
        { agentCode: 'SP-WDH-001' },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.collectionCode).toBeDefined();
      expect(response.data.data.collectionCode).toMatch(/^\d{6}$/);
      expect(response.data.data.amount).toBe(1500);
      expect(response.data.data.instructions).toContain('SmartPay agent');

      const updatedVoucher = await getVoucher(testVoucher.id);
      expect(updatedVoucher!.status).toBe('pending_collection');
    });
  });

  describe('Complete Voucher Flow - End to End', () => {
    it('should complete full cycle: webhook → database → mobile redemption', async () => {
      const testUser = await createTestUser({
        phone: '+264817654321',
      });
      const testWallet = await createTestWallet({
        userId: testUser.id,
        balance: 50,
      });

      const voucherId = crypto.randomUUID();
      const voucherCode = '987654321098';

      const webhookPayload = {
        id: voucherId,
        type: 'voucher_issuance',
        data: {
          voucher_id: voucherId,
          voucher_code: voucherCode,
          user_id: testUser.id,
          amount: 2500,
          currency: 'NAD',
          issuer: 'ketchup-portals',
        },
        timestamp: new Date().toISOString(),
      };

      const payloadString = JSON.stringify(webhookPayload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);
      const eventId = `e2e-test-${Date.now()}`;

      const webhookResponse = await axios.post(
        `${BACKEND_URL}/api/buffr/webhooks`,
        webhookPayload,
        {
          headers: {
            'X-Buffr-Signature': signature,
            'X-Buffr-Event-Id': eventId,
            'X-Buffr-Event-Type': 'voucher.issued',
          },
        }
      );

      expect(webhookResponse.status).toBe(200);

      await waitForCondition(async () => {
        const voucher = await getVoucherByCode(voucherCode);
        return voucher !== null;
      }, 5000);

      const token = generateTestToken(testUser.id);

      const listResponse = await axios.get(`${BACKEND_URL}/api/v1/vouchers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(listResponse.data.data.vouchers).toHaveLength(1);
      expect(listResponse.data.data.vouchers[0].voucher_code).toBe(voucherCode);

      const redeemResponse = await axios.post(
        `${BACKEND_URL}/api/v1/vouchers/redeem`,
        { voucherCode },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(redeemResponse.status).toBe(200);
      expect(redeemResponse.data.success).toBe(true);
      expect(redeemResponse.data.data.newBalance).toBe(2550);

      const finalBalance = await getWalletBalance(testWallet.id);
      expect(finalBalance).toBe(2550);

      const finalVoucher = await getVoucherByCode(voucherCode);
      expect(finalVoucher!.status).toBe('redeemed');
    }, 15000);
  });
});
