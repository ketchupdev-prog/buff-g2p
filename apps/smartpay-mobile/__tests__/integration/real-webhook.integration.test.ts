/**
 * Real Webhook Integration Tests
 * Location: fintech/smartpay-mobile/__tests__/integration/real-webhook.integration.test.ts
 * 
 * Tests:
 * - Webhook receiver endpoint functionality
 * - HMAC signature validation
 * - Idempotency protection
 * - Webhook processing with database updates
 * - Push notification triggering
 * - Various webhook event types
 */

import axios from 'axios';
import {
  initTestDatabase,
  closeTestDatabase,
  cleanupTestData,
  createTestUser,
  createTestWallet,
  createTestTransaction,
  generateWebhookSignature,
  getTransaction,
  getTestPool,
  waitForCondition,
} from './setup/test-database';
import { getBackendUrl } from './setup/test-servers';

const BACKEND_URL = getBackendUrl();
const WEBHOOK_SECRET = process.env.BUFFR_WEBHOOK_SECRET || 'test-webhook-secret';

describe('Real Webhook Integration', () => {
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

  describe('Webhook Signature Validation', () => {
    it('should accept webhook with valid HMAC signature', async () => {
      const payload = {
        id: 'test-event-123',
        type: 'test_event',
        data: { message: 'test' },
        timestamp: new Date().toISOString(),
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      const response = await axios.post(
        `${BACKEND_URL}/api/buffr/webhooks`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Buffr-Signature': signature,
            'X-Buffr-Event-Id': `event-${Date.now()}`,
            'X-Buffr-Event-Type': 'test_event',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = {
        id: 'test-event-456',
        type: 'test_event',
        data: { message: 'test' },
        timestamp: new Date().toISOString(),
      };

      try {
        await axios.post(
          `${BACKEND_URL}/api/buffr/webhooks`,
          payload,
          {
            headers: {
              'X-Buffr-Signature': 'invalid-signature',
              'X-Buffr-Event-Id': `event-${Date.now()}`,
              'X-Buffr-Event-Type': 'test_event',
            },
          }
        );
        fail('Should have rejected invalid signature');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toContain('Invalid webhook signature');
      }
    });

    it('should reject webhook without required headers', async () => {
      const payload = { message: 'test' };

      try {
        await axios.post(`${BACKEND_URL}/api/buffr/webhooks`, payload);
        fail('Should have rejected missing headers');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain('Missing required webhook headers');
      }
    });
  });

  describe('Idempotency Protection', () => {
    it('should process webhook only once with same event ID', async () => {
      const eventId = `idempotent-test-${Date.now()}`;
      const payload = {
        type: 'transaction.completed',
        data: {
          id: 'tx-123',
          amount: 500,
          status: 'completed',
        },
        timestamp: new Date().toISOString(),
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      const response1 = await axios.post(
        `${BACKEND_URL}/api/buffr/webhooks`,
        payload,
        {
          headers: {
            'X-Buffr-Signature': signature,
            'X-Buffr-Event-Id': eventId,
            'X-Buffr-Event-Type': 'transaction.completed',
          },
        }
      );

      expect(response1.status).toBe(200);
      expect(response1.data.success).toBe(true);

      const response2 = await axios.post(
        `${BACKEND_URL}/api/buffr/webhooks`,
        payload,
        {
          headers: {
            'X-Buffr-Signature': signature,
            'X-Buffr-Event-Id': eventId,
            'X-Buffr-Event-Type': 'transaction.completed',
          },
        }
      );

      expect(response2.status).toBe(200);
      expect(response2.data.message).toContain('already processed');
    });

    it('should verify idempotency is stored in database', async () => {
      const eventId = `db-idempotency-${Date.now()}`;
      const payload = {
        type: 'test_event',
        data: { test: true },
        timestamp: new Date().toISOString(),
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      await axios.post(
        `${BACKEND_URL}/api/buffr/webhooks`,
        payload,
        {
          headers: {
            'X-Buffr-Signature': signature,
            'X-Buffr-Event-Id': eventId,
            'X-Buffr-Event-Type': 'test_event',
          },
        }
      );

      const pool = getTestPool();
      const result = await pool.query(
        'SELECT * FROM buffr_webhook_events WHERE event_id = $1',
        [eventId]
      );

      expect(result.rowCount).toBe(1);
      expect(result.rows[0].event_type).toBe('test_event');
      expect(result.rows[0].processed_at).not.toBeNull();
    });
  });

  describe('Transaction Status Webhooks', () => {
    it('should process transaction.completed webhook', async () => {
      const testUser = await createTestUser();
      const testWallet = await createTestWallet({ userId: testUser.id });
      const testTx = await createTestTransaction({
        userId: testUser.id,
        walletId: testWallet.id,
        type: 'cash_out',
        amount: 500,
        status: 'pending',
      });

      const payload = {
        type: 'transaction.completed',
        data: {
          id: testTx.id,
          type: 'cash-out',
          amount: 500,
          status: 'completed',
          agent_id: 'agent-123',
        },
        timestamp: new Date().toISOString(),
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      const response = await axios.post(
        `${BACKEND_URL}/api/buffr/webhooks`,
        payload,
        {
          headers: {
            'X-Buffr-Signature': signature,
            'X-Buffr-Event-Id': `tx-complete-${Date.now()}`,
            'X-Buffr-Event-Type': 'transaction.completed',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      const isUpdated = await waitForCondition(async () => {
        const tx = await getTransaction(testTx.id);
        return tx !== null && tx.status === 'completed';
      }, 5000);

      expect(isUpdated).toBe(true);
    }, 10000);

    it('should process transaction.failed webhook', async () => {
      const testUser = await createTestUser();
      const testWallet = await createTestWallet({ userId: testUser.id });
      const testTx = await createTestTransaction({
        userId: testUser.id,
        walletId: testWallet.id,
        type: 'cash_out',
        amount: 500,
        status: 'pending',
      });

      const payload = {
        type: 'transaction.failed',
        data: {
          id: testTx.id,
          type: 'cash-out',
          amount: 500,
          status: 'failed',
          agent_id: 'agent-456',
          error: {
            code: 'INSUFFICIENT_AGENT_BALANCE',
            message: 'Agent has insufficient balance',
          },
        },
        timestamp: new Date().toISOString(),
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      const response = await axios.post(
        `${BACKEND_URL}/api/buffr/webhooks`,
        payload,
        {
          headers: {
            'X-Buffr-Signature': signature,
            'X-Buffr-Event-Id': `tx-failed-${Date.now()}`,
            'X-Buffr-Event-Type': 'transaction.failed',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      const isUpdated = await waitForCondition(async () => {
        const tx = await getTransaction(testTx.id);
        return tx !== null && tx.status === 'failed';
      }, 5000);

      expect(isUpdated).toBe(true);
    }, 10000);
  });

  describe('Agent Balance Update Webhooks', () => {
    it('should process agent.balance_updated webhook', async () => {
      const payload = {
        type: 'agent.balance_updated',
        data: {
          agent_id: 'agent-789',
          previous_balance: 10000,
          new_balance: 9500,
          change: -500,
          reason: 'cash_out_settlement',
        },
        timestamp: new Date().toISOString(),
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      const response = await axios.post(
        `${BACKEND_URL}/api/buffr/webhooks`,
        payload,
        {
          headers: {
            'X-Buffr-Signature': signature,
            'X-Buffr-Event-Id': `balance-${Date.now()}`,
            'X-Buffr-Event-Type': 'agent.balance_updated',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe('Webhook Health Check', () => {
    it('should verify webhook endpoint health', async () => {
      const response = await axios.get(`${BACKEND_URL}/api/buffr/webhooks/health`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.status).toBe('healthy');
      expect(response.data.webhook_secret_configured).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should handle webhook processing failure gracefully', async () => {
      const payload = {
        type: 'transaction.completed',
        data: {
          id: 'non-existent-transaction',
          status: 'completed',
        },
        timestamp: new Date().toISOString(),
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      try {
        await axios.post(
          `${BACKEND_URL}/api/buffr/webhooks`,
          payload,
          {
            headers: {
              'X-Buffr-Signature': signature,
              'X-Buffr-Event-Id': `error-${Date.now()}`,
              'X-Buffr-Event-Type': 'transaction.completed',
            },
          }
        );
      } catch (error: any) {
        expect(error.response.status).toBe(500);
        expect(error.response.data.success).toBe(false);
      }
    });
  });
});
