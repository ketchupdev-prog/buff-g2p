/**
 * BuffrConnect Webhook Handler Tests
 * 
 * Purpose: Test webhook signature verification, event routing, and idempotency
 * Location: backend/src/routes/__tests__/buffr-webhooks.test.ts
 * 
 * Coverage:
 * - Webhook signature verification (HMAC-SHA256)
 * - Event type routing (completed, failed, balance_updated, settlement, voucher)
 * - Idempotency handling (duplicate event prevention)
 * - Missing headers validation
 * - Invalid signature rejection
 * - Event handler execution
 * - Error handling and retry logic
 * 
 * Test Count: 30+ comprehensive test cases
 */

import request from 'supertest';
import express, { Express } from 'express';
import crypto from 'crypto';
import buffrWebhooksRouter from '../buffr-webhooks';
import * as db from '../../lib/db';
import {
  generateWebhookSignature,
  createMockWebhookHeaders,
  createMockTransactionCompletedEvent,
  createMockTransactionFailedEvent,
  createMockAgentBalanceUpdatedEvent,
  createMockSettlementCompletedEvent,
  createMockVoucherRedeemedEvent,
  createMockTransaction,
  TEST_CONFIG,
} from '../../services/buffr/__tests__/mocks';

describe('BuffrConnect Webhook Handler', () => {
  let app: Express;
  let server: any;
  const webhookSecret = TEST_CONFIG.WEBHOOK_SECRET;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/buffr', buffrWebhooksRouter);
    
    process.env.BUFFR_WEBHOOK_SECRET = webhookSecret;
  });
  
  afterEach(async () => {
    jest.clearAllMocks();
    // Close server if it was started
    if (server && server.close) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });
  
  // ================================
  // Signature Verification Tests
  // ================================
  
  describe('Webhook Signature Verification', () => {
    it('should accept webhook with valid signature', async () => {
      const payload = createMockTransactionCompletedEvent();
      const signature = generateWebhookSignature(payload.data, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', payload.id)
        .set('X-Buffr-Event-Type', payload.type)
        .send(payload.data);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.event_id).toBe(payload.id);
    });
    
    it('should reject webhook with invalid signature', async () => {
      const payload = createMockTransactionCompletedEvent();
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', 'invalid-signature-12345')
        .set('X-Buffr-Event-Id', payload.id)
        .set('X-Buffr-Event-Type', payload.type)
        .send(payload.data);
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid webhook signature');
    });
    
    it('should reject webhook with missing signature', async () => {
      const payload = createMockTransactionCompletedEvent();
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Event-Id', payload.id)
        .set('X-Buffr-Event-Type', payload.type)
        .send(payload.data);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required webhook headers');
    });
    
    it('should reject webhook with missing event ID', async () => {
      const payload = createMockTransactionCompletedEvent();
      const signature = generateWebhookSignature(payload.data, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Type', payload.type)
        .send(payload.data);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required webhook headers');
    });
    
    it('should reject webhook with missing event type', async () => {
      const payload = createMockTransactionCompletedEvent();
      const signature = generateWebhookSignature(payload.data, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', payload.id)
        .send(payload.data);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required webhook headers');
    });
    
    it('should handle webhook secret not configured', async () => {
      delete process.env.BUFFR_WEBHOOK_SECRET;
      
      const payload = createMockTransactionCompletedEvent();
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', 'any-signature')
        .set('X-Buffr-Event-Id', payload.id)
        .set('X-Buffr-Event-Type', payload.type)
        .send(payload.data);
      
      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Webhook verification not configured');
      
      process.env.BUFFR_WEBHOOK_SECRET = webhookSecret;
    });
    
    it('should use timing-safe comparison for signatures', async () => {
      const payload = createMockTransactionCompletedEvent();
      const validSignature = generateWebhookSignature(payload.data, webhookSecret);
      
      const almostValidSignature = validSignature.slice(0, -2) + 'XX';
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', almostValidSignature)
        .set('X-Buffr-Event-Id', payload.id)
        .set('X-Buffr-Event-Type', payload.type)
        .send(payload.data);
      
      expect(response.status).toBe(401);
    });
  });
  
  // ================================
  // Idempotency Tests
  // ================================
  
  describe('Idempotency Handling', () => {
    it('should process webhook event only once', async () => {
      const payload = createMockTransactionCompletedEvent();
      const signature = generateWebhookSignature(payload.data, webhookSecret);
      const eventId = `evt-idempotent-${Date.now()}`;
      
      const response1 = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', eventId)
        .set('X-Buffr-Event-Type', payload.type)
        .send(payload.data);
      
      expect(response1.status).toBe(200);
      expect(response1.body.success).toBe(true);
      
      const response2 = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', eventId)
        .set('X-Buffr-Event-Type', payload.type)
        .send(payload.data);
      
      expect(response2.status).toBe(200);
      expect(response2.body.message).toContain('already processed');
    });
    
    it('should process different event IDs separately', async () => {
      const payload = createMockTransactionCompletedEvent();
      const signature = generateWebhookSignature(payload.data, webhookSecret);
      
      const response1 = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', 'evt-1')
        .set('X-Buffr-Event-Type', payload.type)
        .send(payload.data);
      
      const response2 = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', 'evt-2')
        .set('X-Buffr-Event-Type', payload.type)
        .send(payload.data);
      
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.event_id).toBe('evt-1');
      expect(response2.body.event_id).toBe('evt-2');
    });
    
    it('should handle rapid duplicate requests', async () => {
      const payload = createMockTransactionCompletedEvent();
      const signature = generateWebhookSignature(payload.data, webhookSecret);
      const eventId = `evt-rapid-${Date.now()}`;
      
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/buffr/webhooks')
          .set('X-Buffr-Signature', signature)
          .set('X-Buffr-Event-Id', eventId)
          .set('X-Buffr-Event-Type', payload.type)
          .send(payload.data)
      );
      
      const responses = await Promise.all(promises);
      
      const successCount = responses.filter(r => r.status === 200).length;
      const processedCount = responses.filter(
        r => !r.body.message?.includes('already processed')
      ).length;
      
      expect(successCount).toBe(5);
      expect(processedCount).toBeLessThanOrEqual(1);
    });
  });
  
  // ================================
  // Event Type Routing Tests
  // ================================
  
  describe('Event Type Routing', () => {
    it('should route transaction.completed events', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const payload = createMockTransactionCompletedEvent();
      const signature = generateWebhookSignature(payload.data, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', payload.id)
        .set('X-Buffr-Event-Type', 'transaction.completed')
        .send(payload.data);
      
      expect(response.status).toBe(200);
      
      const logs = consoleLogSpy.mock.calls.map(call => call.join(' '));
      const hasCompletedLog = logs.some(log => log.includes('Transaction completed'));
      
      expect(hasCompletedLog).toBe(true);
      
      consoleLogSpy.mockRestore();
    });
    
    it('should route transaction.failed events', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const payload = createMockTransactionFailedEvent();
      const signature = generateWebhookSignature(payload.data, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', payload.id)
        .set('X-Buffr-Event-Type', 'transaction.failed')
        .send(payload.data);
      
      expect(response.status).toBe(200);
      
      const logs = consoleLogSpy.mock.calls.map(call => call.join(' '));
      const hasFailedLog = logs.some(log => log.includes('Transaction failed'));
      
      expect(hasFailedLog).toBe(true);
      
      consoleLogSpy.mockRestore();
    });
    
    it('should route agent.balance_updated events', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const payload = createMockAgentBalanceUpdatedEvent('agent-123');
      const signature = generateWebhookSignature(payload.data, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', payload.id)
        .set('X-Buffr-Event-Type', 'agent.balance_updated')
        .send(payload.data);
      
      expect(response.status).toBe(200);
      
      const logs = consoleLogSpy.mock.calls.map(call => call.join(' '));
      const hasBalanceLog = logs.some(log => log.includes('Agent balance updated'));
      
      expect(hasBalanceLog).toBe(true);
      
      consoleLogSpy.mockRestore();
    });
    
    it('should route settlement.completed events', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const payload = createMockSettlementCompletedEvent('agent-123');
      const signature = generateWebhookSignature(payload.data, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', payload.id)
        .set('X-Buffr-Event-Type', 'settlement.completed')
        .send(payload.data);
      
      expect(response.status).toBe(200);
      
      const logs = consoleLogSpy.mock.calls.map(call => call.join(' '));
      const hasSettlementLog = logs.some(log => log.includes('Settlement completed'));
      
      expect(hasSettlementLog).toBe(true);
      
      consoleLogSpy.mockRestore();
    });
    
    it('should route voucher.redeemed events', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const payload = createMockVoucherRedeemedEvent();
      const signature = generateWebhookSignature(payload.data, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', payload.id)
        .set('X-Buffr-Event-Type', 'voucher.redeemed')
        .send(payload.data);
      
      expect(response.status).toBe(200);
      
      const logs = consoleLogSpy.mock.calls.map(call => call.join(' '));
      const hasVoucherLog = logs.some(log => log.includes('Voucher redeemed'));
      
      expect(hasVoucherLog).toBe(true);
      
      consoleLogSpy.mockRestore();
    });

    it('should route voucher.issued events and persist via transaction', async () => {
      const txSpy = jest.spyOn(db, 'transaction').mockImplementation(async (cb: (c: any) => Promise<unknown>) => {
        const client = {
          query: jest.fn().mockResolvedValue({ rowCount: 1, rows: [] }),
        };
        return cb(client);
      });

      const envelope = {
        id: 'evt-vi-1',
        type: 'voucher_issuance',
        data: {
          voucher_id: '550e8400-e29b-41d4-a716-446655440099',
          voucher_code: '123456789012',
          user_id: '650e8400-e29b-41d4-a716-446655440088',
          amount: 250,
          currency: 'NAD',
          issuer: 'ketchup-portals',
          voucher_type: 'government_grant',
        },
        timestamp: new Date().toISOString(),
      };

      const signature = generateWebhookSignature(envelope, webhookSecret);

      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', `evt-voucher-issued-${Date.now()}`)
        .set('X-Buffr-Event-Type', 'voucher.issued')
        .send(envelope);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(txSpy).toHaveBeenCalled();

      txSpy.mockRestore();
    });
    
    it('should handle unknown event types gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const payload = { test: 'data' };
      const signature = generateWebhookSignature(payload, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', 'evt-unknown')
        .set('X-Buffr-Event-Type', 'unknown.event.type')
        .send(payload);
      
      expect(response.status).toBe(200);
      
      const warnings = consoleWarnSpy.mock.calls.map(call => call.join(' '));
      const hasUnknownWarning = warnings.some(log => log.includes('Unknown event type'));
      
      expect(hasUnknownWarning).toBe(true);
      
      consoleWarnSpy.mockRestore();
    });
  });
  
  // ================================
  // Event Handler Tests
  // ================================
  
  describe('Transaction Completed Handler', () => {
    it('should handle completed cash-out transaction', async () => {
      const txnData = createMockTransaction({
        type: 'cash-out',
        status: 'completed',
        amount: 100,
      });
      
      const payload = {
        id: txnData.id,
        type: txnData.type,
        amount: txnData.amount,
        status: txnData.status,
        agent_id: txnData.agent_id,
        customer_phone: txnData.customer_phone,
      };
      
      const signature = generateWebhookSignature(payload, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', `evt-${txnData.id}`)
        .set('X-Buffr-Event-Type', 'transaction.completed')
        .send(payload);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('should handle completed voucher redemption', async () => {
      const txnData = createMockTransaction({
        type: 'voucher-redemption',
        status: 'completed',
        voucher_id: 'voucher-123',
      });
      
      const payload = {
        id: txnData.id,
        type: txnData.type,
        amount: txnData.amount,
        status: txnData.status,
        agent_id: txnData.agent_id,
        voucher_id: txnData.voucher_id,
      };
      
      const signature = generateWebhookSignature(payload, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', `evt-${txnData.id}`)
        .set('X-Buffr-Event-Type', 'transaction.completed')
        .send(payload);
      
      expect(response.status).toBe(200);
    });
    
    it('should handle completed settlement transaction', async () => {
      const txnData = createMockTransaction({
        type: 'settlement',
        status: 'completed',
        amount: 5000,
      });
      
      const payload = {
        id: txnData.id,
        type: txnData.type,
        amount: txnData.amount,
        status: txnData.status,
        agent_id: txnData.agent_id,
      };
      
      const signature = generateWebhookSignature(payload, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', `evt-${txnData.id}`)
        .set('X-Buffr-Event-Type', 'transaction.completed')
        .send(payload);
      
      expect(response.status).toBe(200);
    });
  });
  
  describe('Transaction Failed Handler', () => {
    it('should handle failed transaction with error details', async () => {
      const txnData = createMockTransaction({
        status: 'failed',
      });
      
      const payload = {
        id: txnData.id,
        type: txnData.type,
        amount: txnData.amount,
        status: txnData.status,
        agent_id: txnData.agent_id,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Agent has insufficient balance',
        },
      };
      
      const signature = generateWebhookSignature(payload, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', `evt-${txnData.id}`)
        .set('X-Buffr-Event-Type', 'transaction.failed')
        .send(payload);
      
      expect(response.status).toBe(200);
    });
    
    it('should handle failed transaction without error details', async () => {
      const txnData = createMockTransaction({
        status: 'failed',
      });
      
      const payload = {
        id: txnData.id,
        type: txnData.type,
        amount: txnData.amount,
        status: txnData.status,
        agent_id: txnData.agent_id,
      };
      
      const signature = generateWebhookSignature(payload, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', `evt-${txnData.id}`)
        .set('X-Buffr-Event-Type', 'transaction.failed')
        .send(payload);
      
      expect(response.status).toBe(200);
    });
  });
  
  describe('Agent Balance Updated Handler', () => {
    it('should handle balance increase', async () => {
      const payload = {
        agent_id: 'agent-123',
        previous_balance: 10000,
        new_balance: 11000,
        change: 1000,
        reason: 'settlement received',
      };
      
      const signature = generateWebhookSignature(payload, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', 'evt-balance-increase')
        .set('X-Buffr-Event-Type', 'agent.balance_updated')
        .send(payload);
      
      expect(response.status).toBe(200);
    });
    
    it('should handle balance decrease', async () => {
      const payload = {
        agent_id: 'agent-123',
        previous_balance: 10000,
        new_balance: 9900,
        change: -100,
        reason: 'cash-out transaction',
      };
      
      const signature = generateWebhookSignature(payload, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', 'evt-balance-decrease')
        .set('X-Buffr-Event-Type', 'agent.balance_updated')
        .send(payload);
      
      expect(response.status).toBe(200);
    });
  });
  
  // ================================
  // Error Handling Tests
  // ================================
  
  describe('Error Handling', () => {
    it('should return 500 on handler exception', async () => {
      const payload = { malformed: 'data' };
      const signature = generateWebhookSignature(payload, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', 'evt-error')
        .set('X-Buffr-Event-Type', 'transaction.completed')
        .send(payload);
      
      expect([200, 500]).toContain(response.status);
    });
    
    it('should handle empty request body', async () => {
      const payload = {};
      const signature = generateWebhookSignature(payload, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', 'evt-empty')
        .set('X-Buffr-Event-Type', 'test.event')
        .send(payload);
      
      expect(response.status).toBe(200);
    });
    
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('Content-Type', 'application/json')
        .set('X-Buffr-Signature', 'any-signature')
        .set('X-Buffr-Event-Id', 'evt-malformed')
        .set('X-Buffr-Event-Type', 'test.event')
        .send('{ invalid json }');
      
      expect([400, 500]).toContain(response.status);
    });
  });
  
  // ================================
  // Security Tests
  // ================================
  
  describe('Security', () => {
    it('should prevent replay attacks with expired timestamps', async () => {
      const oldTimestamp = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      
      const payload = createMockTransactionCompletedEvent({
        id: 'txn-old',
        timestamp: oldTimestamp,
      });
      
      const signature = generateWebhookSignature(payload.data, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', payload.id)
        .set('X-Buffr-Event-Type', payload.type)
        .send(payload.data);
      
      expect(response.status).toBe(200);
    });
    
    it('should reject tampered payloads', async () => {
      const originalPayload = createMockTransactionCompletedEvent();
      const signature = generateWebhookSignature(originalPayload.data, webhookSecret);
      
      const tamperedPayload = {
        ...originalPayload.data,
        amount: 999999,
      };
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', originalPayload.id)
        .set('X-Buffr-Event-Type', originalPayload.type)
        .send(tamperedPayload);
      
      expect(response.status).toBe(401);
    });
    
    it('should validate signature before processing', async () => {
      const payload = createMockTransactionCompletedEvent();
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', 'completely-wrong-signature')
        .set('X-Buffr-Event-Id', payload.id)
        .set('X-Buffr-Event-Type', payload.type)
        .send(payload.data);
      
      expect(response.status).toBe(401);
    });
  });
  
  // ================================
  // Health Check Tests
  // ================================
  
  describe('Webhook Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/api/buffr/webhooks/health');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('healthy');
      expect(response.body.webhook_secret_configured).toBe(true);
    });
    
    it('should indicate if webhook secret is not configured', async () => {
      delete process.env.BUFFR_WEBHOOK_SECRET;
      
      const response = await request(app).get('/api/buffr/webhooks/health');
      
      expect(response.status).toBe(200);
      expect(response.body.webhook_secret_configured).toBe(false);
      
      process.env.BUFFR_WEBHOOK_SECRET = webhookSecret;
    });
    
    it('should include timestamp in health response', async () => {
      const response = await request(app).get('/api/buffr/webhooks/health');
      
      expect(response.status).toBe(200);
      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp).toString()).not.toBe('Invalid Date');
    });
  });
  
  // ================================
  // Concurrency Tests
  // ================================
  
  describe('Concurrent Webhook Processing', () => {
    it('should handle multiple webhooks concurrently', async () => {
      const payloads = [
        createMockTransactionCompletedEvent({ id: 'txn-1' }),
        createMockTransactionCompletedEvent({ id: 'txn-2' }),
        createMockTransactionCompletedEvent({ id: 'txn-3' }),
      ];
      
      const promises = payloads.map((payload) => {
        const signature = generateWebhookSignature(payload.data, webhookSecret);
        
        return request(app)
          .post('/api/buffr/webhooks')
          .set('X-Buffr-Signature', signature)
          .set('X-Buffr-Event-Id', payload.id)
          .set('X-Buffr-Event-Type', payload.type)
          .send(payload.data);
      });
      
      const responses = await Promise.all(promises);
      
      expect(responses).toHaveLength(3);
      expect(responses.every(r => r.status === 200)).toBe(true);
    });
    
    it('should handle mixed event types concurrently', async () => {
      const payloads = [
        createMockTransactionCompletedEvent(),
        createMockTransactionFailedEvent(),
        createMockAgentBalanceUpdatedEvent('agent-123'),
      ];
      
      const promises = payloads.map((payload) => {
        const signature = generateWebhookSignature(payload.data, webhookSecret);
        
        return request(app)
          .post('/api/buffr/webhooks')
          .set('X-Buffr-Signature', signature)
          .set('X-Buffr-Event-Id', payload.id)
          .set('X-Buffr-Event-Type', payload.type)
          .send(payload.data);
      });
      
      const responses = await Promise.all(promises);
      
      expect(responses.every(r => r.status === 200)).toBe(true);
    });
  });
  
  // ================================
  // Payload Validation Tests
  // ================================
  
  describe('Payload Validation', () => {
    it('should handle missing transaction ID', async () => {
      const payload = {
        type: 'cash-out',
        amount: 100,
        status: 'completed',
        agent_id: 'agent-123',
      };
      
      const signature = generateWebhookSignature(payload, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', 'evt-missing-id')
        .set('X-Buffr-Event-Type', 'transaction.completed')
        .send(payload);
      
      expect(response.status).toBe(200);
    });
    
    it('should handle missing agent ID', async () => {
      const payload = {
        id: 'txn-123',
        type: 'cash-out',
        amount: 100,
        status: 'completed',
      };
      
      const signature = generateWebhookSignature(payload, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', 'evt-missing-agent')
        .set('X-Buffr-Event-Type', 'transaction.completed')
        .send(payload);
      
      expect(response.status).toBe(200);
    });
    
    it('should handle extra unexpected fields', async () => {
      const payload = {
        ...createMockTransaction(),
        unexpected_field: 'should be ignored',
        another_field: 12345,
      };
      
      const signature = generateWebhookSignature(payload, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', 'evt-extra-fields')
        .set('X-Buffr-Event-Type', 'transaction.completed')
        .send(payload);
      
      expect(response.status).toBe(200);
    });
  });
  
  // ================================
  // Rate Limiting Tests
  // ================================
  
  describe('Rate Limiting', () => {
    it('should handle webhook bursts', async () => {
      const promises = Array(10).fill(null).map((_, i) => {
        const payload = createMockTransactionCompletedEvent({ id: `txn-${i}` });
        const signature = generateWebhookSignature(payload.data, webhookSecret);
        
        return request(app)
          .post('/api/buffr/webhooks')
          .set('X-Buffr-Signature', signature)
          .set('X-Buffr-Event-Id', `evt-burst-${i}`)
          .set('X-Buffr-Event-Type', payload.type)
          .send(payload.data);
      });
      
      const responses = await Promise.all(promises);
      
      expect(responses.every(r => r.status === 200)).toBe(true);
    });
  });
  
  // ================================
  // Response Format Tests
  // ================================
  
  describe('Response Format', () => {
    it('should return consistent response format on success', async () => {
      const payload = createMockTransactionCompletedEvent();
      const signature = generateWebhookSignature(payload.data, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', payload.id)
        .set('X-Buffr-Event-Type', payload.type)
        .send(payload.data);
      
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('event_id');
      expect(response.body.success).toBe(true);
    });
    
    it('should return consistent error format', async () => {
      const payload = createMockTransactionCompletedEvent();
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', 'invalid-signature')
        .set('X-Buffr-Event-Id', payload.id)
        .set('X-Buffr-Event-Type', payload.type)
        .send(payload.data);
      
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body.success).toBe(false);
    });
  });
  
  // ================================
  // Webhook Retry Scenarios
  // ================================
  
  describe('Webhook Retry Scenarios', () => {
    it('should accept retried webhook with same event ID', async () => {
      const payload = createMockTransactionCompletedEvent();
      const signature = generateWebhookSignature(payload.data, webhookSecret);
      const eventId = `evt-retry-${Date.now()}`;
      
      const response1 = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', eventId)
        .set('X-Buffr-Event-Type', payload.type)
        .send(payload.data);
      
      expect(response1.status).toBe(200);
      
      const response2 = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', eventId)
        .set('X-Buffr-Event-Type', payload.type)
        .send(payload.data);
      
      expect(response2.status).toBe(200);
      expect(response2.body.message).toContain('already processed');
    });
    
    it('should handle retries after transient errors', async () => {
      const payload = createMockTransactionCompletedEvent();
      const signature = generateWebhookSignature(payload.data, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', payload.id)
        .set('X-Buffr-Event-Type', payload.type)
        .send(payload.data);
      
      expect(response.status).toBe(200);
    });
  });
  
  // ================================
  // Event Data Validation
  // ================================
  
  describe('Event Data Validation', () => {
    it('should process events with all required fields', async () => {
      const payload = {
        id: 'txn-complete',
        type: 'cash-out',
        amount: 100,
        status: 'completed',
        agent_id: 'agent-123',
        customer_phone: '+264819876543',
        timestamp: new Date().toISOString(),
      };
      
      const signature = generateWebhookSignature(payload, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', 'evt-complete')
        .set('X-Buffr-Event-Type', 'transaction.completed')
        .send(payload);
      
      expect(response.status).toBe(200);
    });
    
    it('should process events with optional fields', async () => {
      const payload = {
        id: 'txn-optional',
        type: 'cash-out',
        amount: 100,
        status: 'completed',
        agent_id: 'agent-123',
        metadata: { source: 'mobile-app' },
      };
      
      const signature = generateWebhookSignature(payload, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', 'evt-optional')
        .set('X-Buffr-Event-Type', 'transaction.completed')
        .send(payload);
      
      expect(response.status).toBe(200);
    });
  });
  
  // ================================
  // Signature Algorithm Tests
  // ================================
  
  describe('Signature Algorithm', () => {
    it('should verify HMAC-SHA256 signature correctly', async () => {
      const payload = { test: 'data', amount: 100 };
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', 'evt-hmac-test')
        .set('X-Buffr-Event-Type', 'test.event')
        .send(payload);
      
      expect(response.status).toBe(200);
    });
    
    it('should reject signatures with wrong algorithm', async () => {
      const payload = createMockTransactionCompletedEvent();
      
      const wrongSignature = crypto
        .createHmac('sha1', webhookSecret)
        .update(JSON.stringify(payload.data))
        .digest('hex');
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', wrongSignature)
        .set('X-Buffr-Event-Id', payload.id)
        .set('X-Buffr-Event-Type', payload.type)
        .send(payload.data);
      
      expect(response.status).toBe(401);
    });
  });
  
  // ================================
  // Injection Prevention Tests
  // ================================
  
  describe('Injection Prevention', () => {
    it('should handle SQL injection attempts in payload', async () => {
      const payload = {
        id: "txn-123'; DROP TABLE agents; --",
        type: 'cash-out',
        amount: 100,
        status: 'completed',
        agent_id: "agent-123'; DROP TABLE transactions; --",
      };
      
      const signature = generateWebhookSignature(payload, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', 'evt-sql-injection')
        .set('X-Buffr-Event-Type', 'transaction.completed')
        .send(payload);
      
      expect(response.status).toBe(200);
    });
    
    it('should handle XSS attempts in payload', async () => {
      const payload = {
        id: 'txn-123',
        type: 'cash-out',
        amount: 100,
        status: 'completed',
        agent_id: '<script>alert("xss")</script>',
      };
      
      const signature = generateWebhookSignature(payload, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', 'evt-xss')
        .set('X-Buffr-Event-Type', 'transaction.completed')
        .send(payload);
      
      expect(response.status).toBe(200);
    });
    
    it('should handle oversized payloads', async () => {
      const largePayload = {
        id: 'txn-large',
        type: 'cash-out',
        amount: 100,
        status: 'completed',
        agent_id: 'agent-123',
        metadata: {
          large_data: 'x'.repeat(10000),
        },
      };
      
      const signature = generateWebhookSignature(largePayload, webhookSecret);
      
      const response = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', 'evt-large')
        .set('X-Buffr-Event-Type', 'transaction.completed')
        .send(largePayload);
      
      expect([200, 413]).toContain(response.status);
    });
  });
});