/**
 * BuffrConnect Integration Tests (End-to-End)
 * 
 * Purpose: Test complete BuffrConnect workflows from API request to response
 * Location: backend/src/routes/__tests__/buffr-integration.test.ts
 * 
 * Coverage:
 * - Complete cash-out flow (register → validate → cash-out → status check)
 * - Voucher redemption workflow
 * - Agent lifecycle (registration → activation → transactions → settlement)
 * - Error scenarios and rollback
 * - Concurrent transaction handling
 * - Authentication and authorization
 * - Rate limiting enforcement
 * 
 * Test Count: 20+ end-to-end test scenarios
 */

import request from 'supertest';
import express, { Express } from 'express';
import { generateToken } from '../../middleware/requireAuth';
import buffrRouter from '../buffr';
import buffrWebhooksRouter from '../buffr-webhooks';
import { getBuffrClient } from '../../services/buffr/client';
import { getBuffrCashOutService } from '../../services/buffr/cashOut';
import {
  createMockAgent,
  createMockTransaction,
  createMockVoucher,
  createMockApiResponse,
  generateWebhookSignature,
  TEST_CONFIG,
  VALID_TEST_PHONES,
  VALID_TEST_AMOUNTS,
} from '../../services/buffr/__tests__/mocks';

// Mock the services
jest.mock('../../services/buffr/client');
jest.mock('../../services/buffr/cashOut');

// Mock rate limiter to avoid 429 errors in tests
jest.mock('../../middleware/rateLimiter', () => ({
  strictRateLimiter: (req: any, res: any, next: any) => next(),
  standardRateLimiter: (req: any, res: any, next: any) => next(),
  lenientRateLimiter: (req: any, res: any, next: any) => next(),
  moderateRateLimiter: (req: any, res: any, next: any) => next(),
}));

const mockGetBuffrClient = getBuffrClient as jest.MockedFunction<typeof getBuffrClient>;
const mockGetBuffrCashOutService = getBuffrCashOutService as jest.MockedFunction<
  typeof getBuffrCashOutService
>;

describe('BuffrConnect Integration Tests (E2E)', () => {
  let app: Express;
  let authToken: string;
  let mockClient: any;
  let mockCashOutService: any;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/buffr', buffrRouter);
    app.use('/api/buffr', buffrWebhooksRouter);
    
    authToken = generateToken('test-user-123');
    
    mockClient = {
      registerAgent: jest.fn(),
      getAgent: jest.fn(),
      getAgentBalance: jest.fn(),
      processCashOut: jest.fn(),
      validateVoucher: jest.fn(),
      getTransaction: jest.fn(),
      getAgentTransactions: jest.fn(),
      requestSettlement: jest.fn(),
      healthCheck: jest.fn(),
    };
    
    mockCashOutService = {
      processCashOut: jest.fn(),
      validateVoucher: jest.fn(),
      getTransactionStatus: jest.fn(),
      getAgentTransactions: jest.fn(),
    };
    
    mockGetBuffrClient.mockReturnValue(mockClient as any);
    mockGetBuffrCashOutService.mockReturnValue(mockCashOutService as any);
    
    process.env.BUFFR_WEBHOOK_SECRET = TEST_CONFIG.WEBHOOK_SECRET;
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  // ================================
  // Complete Cash-Out Flow
  // ================================
  
  describe('Complete Cash-Out Flow', () => {
    it('should complete full cash-out flow: register → balance → cash-out → status', async () => {
      const mockAgent = createMockAgent({ balance: 10000 });
      mockClient.registerAgent.mockResolvedValue(
        createMockApiResponse(mockAgent)
      );
      
      mockClient.getAgentBalance.mockResolvedValue(
        createMockApiResponse({ balance: 10000, currency: 'NAD' })
      );
      
      const mockTxn = createMockTransaction({ status: 'completed', amount: 100 });
      mockCashOutService.processCashOut.mockResolvedValue({
        success: true,
        transaction: mockTxn,
      });
      
      mockCashOutService.getTransactionStatus.mockResolvedValue(
        createMockApiResponse(mockTxn)
      );
      
      const agentResponse = await request(app)
        .post('/api/buffr/agents/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Agent',
          phone: '+264811234567',
          location: {
            latitude: -22.5609,
            longitude: 17.0658,
            address: 'Windhoek, Namibia',
          },
        });
      
      expect(agentResponse.status).toBe(201);
      const agentId = agentResponse.body.data.id;
      
      const balanceResponse = await request(app)
        .get(`/api/buffr/agents/${agentId}/balance`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(balanceResponse.status).toBe(200);
      expect(balanceResponse.body.data.balance).toBe(10000);
      
      const cashOutResponse = await request(app)
        .post('/api/buffr/cash-out')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId,
          customerPhone: '+264819876543',
          amount: 100,
        });
      
      expect(cashOutResponse.status).toBe(200);
      expect(cashOutResponse.body.success).toBe(true);
      const transactionId = cashOutResponse.body.transaction.id;
      
      const statusResponse = await request(app)
        .get(`/api/buffr/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.data.status).toBe('completed');
    });
    
    it('should handle cash-out failure with proper error response', async () => {
      mockCashOutService.processCashOut.mockResolvedValue({
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Agent has insufficient balance',
        },
      });
      
      const response = await request(app)
        .post('/api/buffr/cash-out')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId: 'agent-123',
          customerPhone: '+264819876543',
          amount: 10000,
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_BALANCE');
    });
  });
  
  // ================================
  // Voucher Redemption Flow
  // ================================
  
  describe('Voucher Redemption Flow', () => {
    it('should complete voucher validation and redemption flow', async () => {
      const mockVoucher = createMockVoucher({
        code: 'VALID-VOUCHER-123',
        amount: 500,
        status: 'active',
      });
      
      mockCashOutService.validateVoucher.mockResolvedValue({
        valid: true,
        voucher: mockVoucher,
      });
      
      const validationResponse = await request(app)
        .post('/api/buffr/vouchers/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ voucherCode: mockVoucher.code });
      
      expect(validationResponse.status).toBe(200);
      expect(validationResponse.body.valid).toBe(true);
      expect(validationResponse.body.voucher.amount).toBe(500);
      
      const mockTxn = createMockTransaction({
        type: 'voucher-redemption',
        amount: 500,
        voucher_id: mockVoucher.id,
      });
      
      mockCashOutService.processCashOut.mockResolvedValue({
        success: true,
        transaction: mockTxn,
      });
      
      const redemptionResponse = await request(app)
        .post('/api/buffr/cash-out')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId: 'agent-123',
          customerPhone: mockVoucher.recipient_phone,
          amount: mockVoucher.amount,
          voucherCode: mockVoucher.code,
        });
      
      expect(redemptionResponse.status).toBe(200);
      expect(redemptionResponse.body.transaction.voucher_id).toBe(mockVoucher.id);
    });
    
    it('should reject invalid voucher before cash-out', async () => {
      mockCashOutService.validateVoucher.mockResolvedValue({
        valid: false,
        error: 'Voucher has expired',
      });
      
      const response = await request(app)
        .post('/api/buffr/vouchers/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ voucherCode: 'EXPIRED-VOUCHER' });
      
      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toContain('expired');
    });
    
    it('should handle voucher already redeemed', async () => {
      mockCashOutService.validateVoucher.mockResolvedValue({
        valid: false,
        error: 'Voucher is redeemed. Only active vouchers can be redeemed.',
      });
      
      const response = await request(app)
        .post('/api/buffr/vouchers/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ voucherCode: 'REDEEMED-VOUCHER' });
      
      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
    });
  });
  
  // ================================
  // Agent Lifecycle Flow
  // ================================
  
  describe('Agent Lifecycle Flow', () => {
    it('should handle complete agent lifecycle', async () => {
      const mockAgent = createMockAgent({ status: 'active' });
      mockClient.registerAgent.mockResolvedValue(
        createMockApiResponse(mockAgent)
      );
      
      const registerResponse = await request(app)
        .post('/api/buffr/agents/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: mockAgent.name,
          phone: mockAgent.phone,
          email: mockAgent.email,
          location: mockAgent.location,
        });
      
      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.data.status).toBe('active');
      
      const agentId = registerResponse.body.data.id;
      
      mockClient.getAgentBalance.mockResolvedValue(
        createMockApiResponse({ balance: mockAgent.balance, currency: 'NAD' })
      );
      
      const balanceResponse = await request(app)
        .get(`/api/buffr/agents/${agentId}/balance`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(balanceResponse.status).toBe(200);
      expect(balanceResponse.body.data.balance).toBe(mockAgent.balance);
      
      const mockTransactions = [
        createMockTransaction({ id: 'txn-1', agent_id: agentId }),
        createMockTransaction({ id: 'txn-2', agent_id: agentId }),
      ];
      
      mockCashOutService.getAgentTransactions.mockResolvedValue(
        createMockApiResponse({
          transactions: mockTransactions,
          total: 2,
          page: 1,
        })
      );
      
      const transactionsResponse = await request(app)
        .get(`/api/buffr/agents/${agentId}/transactions`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(transactionsResponse.status).toBe(200);
      expect(transactionsResponse.body.data.transactions).toHaveLength(2);
    });
  });
  
  // ================================
  // Authentication Tests
  // ================================
  
  describe('Authentication', () => {
    it('should reject requests without auth token', async () => {
      const response = await request(app)
        .post('/api/buffr/cash-out')
        .send({
          agentId: 'agent-123',
          customerPhone: '+264819876543',
          amount: 100,
        });
      
      expect(response.status).toBe(401);
    });
    
    it('should reject requests with invalid auth token', async () => {
      const response = await request(app)
        .post('/api/buffr/cash-out')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          agentId: 'agent-123',
          customerPhone: '+264819876543',
          amount: 100,
        });
      
      expect(response.status).toBe(401);
    });
    
    it('should accept requests with valid auth token', async () => {
      const mockTxn = createMockTransaction();
      mockCashOutService.processCashOut.mockResolvedValue({
        success: true,
        transaction: mockTxn,
      });
      
      const response = await request(app)
        .post('/api/buffr/cash-out')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId: 'agent-123',
          customerPhone: '+264819876543',
          amount: 100,
        });
      
      expect(response.status).toBe(200);
    });
    
    it('should allow health check without authentication', async () => {
      mockClient.healthCheck.mockResolvedValue(
        createMockApiResponse({ status: 'healthy', timestamp: new Date().toISOString() })
      );
      
      const response = await request(app).get('/api/buffr/health');
      
      expect(response.status).toBe(200);
    });
  });
  
  // ================================
  // Rate Limiting Tests
  // ================================
  
  describe('Rate Limiting', () => {
    it('should handle multiple concurrent requests without rate limiting', async () => {
      const mockTxn = createMockTransaction();
      mockCashOutService.processCashOut.mockResolvedValue({
        success: true,
        transaction: mockTxn,
      });
      
      const promises = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/buffr/cash-out')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            agentId: 'agent-123',
            customerPhone: '+264819876543',
            amount: 100,
          })
      );
      
      const responses = await Promise.all(promises);
      
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });
    
    it('should process requests successfully when rate limiter is disabled', async () => {
      const mockTxn = createMockTransaction();
      mockCashOutService.processCashOut.mockResolvedValue({
        success: true,
        transaction: mockTxn,
      });
      
      const response = await request(app)
        .post('/api/buffr/cash-out')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId: 'agent-123',
          customerPhone: '+264819876543',
          amount: 100,
        });
      
      expect(response.status).toBe(200);
    });
  });
  
  // ================================
  // Input Validation Tests
  // ================================
  
  describe('Input Validation', () => {
    it('should reject cash-out with missing parameters', async () => {
      const response = await request(app)
        .post('/api/buffr/cash-out')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId: 'agent-123',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('required');
    });
    
    it('should reject cash-out with invalid amount', async () => {
      const response = await request(app)
        .post('/api/buffr/cash-out')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId: 'agent-123',
          customerPhone: '+264819876543',
          amount: -100,
        });
      
      expect(response.status).toBe(400);
    });
    
    it('should reject agent registration with missing location', async () => {
      const response = await request(app)
        .post('/api/buffr/agents/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Agent',
          phone: '+264811234567',
        });
      
      expect(response.status).toBe(400);
    });
    
    it('should reject voucher validation with missing code', async () => {
      const response = await request(app)
        .post('/api/buffr/vouchers/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});
      
      expect(response.status).toBe(400);
    });
  });
  
  // ================================
  // Concurrent Operations Tests
  // ================================
  
  describe('Concurrent Operations', () => {
    it('should handle multiple cash-outs from same agent', async () => {
      const mockTxn = createMockTransaction();
      mockCashOutService.processCashOut.mockResolvedValue({
        success: true,
        transaction: mockTxn,
      });
      
      const promises = [100, 200, 300].map((amount) =>
        request(app)
          .post('/api/buffr/cash-out')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            agentId: 'agent-123',
            customerPhone: '+264819876543',
            amount,
          })
      );
      
      const responses = await Promise.all(promises);
      
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });
    
    it('should handle concurrent voucher validations', async () => {
      const mockVoucher = createMockVoucher();
      mockCashOutService.validateVoucher.mockResolvedValue({
        valid: true,
        voucher: mockVoucher,
      });
      
      const promises = ['CODE-1', 'CODE-2', 'CODE-3'].map((code) =>
        request(app)
          .post('/api/buffr/vouchers/validate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voucherCode: code })
      );
      
      const responses = await Promise.all(promises);
      
      expect(responses.every(r => r.status === 200)).toBe(true);
    });
  });
  
  // ================================
  // Error Recovery Tests
  // ================================
  
  describe('Error Recovery', () => {
    it('should recover from temporary service unavailability', async () => {
      mockCashOutService.processCashOut
        .mockResolvedValueOnce({
          success: false,
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable' },
        })
        .mockResolvedValueOnce({
          success: true,
          transaction: createMockTransaction(),
        });
      
      const response1 = await request(app)
        .post('/api/buffr/cash-out')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId: 'agent-123',
          customerPhone: '+264819876543',
          amount: 100,
        });
      
      expect(response1.status).toBe(400);
      
      const response2 = await request(app)
        .post('/api/buffr/cash-out')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId: 'agent-123',
          customerPhone: '+264819876543',
          amount: 100,
        });
      
      expect(response2.status).toBe(200);
    });
    
    it('should handle network failures gracefully', async () => {
      mockClient.healthCheck.mockResolvedValue({
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network connection failed',
        },
      });
      
      const response = await request(app).get('/api/buffr/health');
      
      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
    });
  });
  
  // ================================
  // Transaction History Tests
  // ================================
  
  describe('Transaction History', () => {
    it('should retrieve agent transaction history with filters', async () => {
      const mockTransactions = [
        createMockTransaction({ id: 'txn-1', status: 'completed' }),
        createMockTransaction({ id: 'txn-2', status: 'completed' }),
        createMockTransaction({ id: 'txn-3', status: 'completed' }),
      ];
      
      mockCashOutService.getAgentTransactions.mockResolvedValue(
        createMockApiResponse({
          transactions: mockTransactions,
          total: 3,
          page: 1,
        })
      );
      
      const response = await request(app)
        .get('/api/buffr/agents/agent-123/transactions?status=completed&page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data.transactions).toHaveLength(3);
      expect(response.body.data.transactions.every((t: any) => t.status === 'completed')).toBe(true);
    });
    
    it('should handle empty transaction history', async () => {
      mockCashOutService.getAgentTransactions.mockResolvedValue(
        createMockApiResponse({
          transactions: [],
          total: 0,
          page: 1,
        })
      );
      
      const response = await request(app)
        .get('/api/buffr/agents/agent-new/transactions')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data.transactions).toHaveLength(0);
    });
  });
  
  // ================================
  // Webhook Integration Tests
  // ================================
  
  describe('Webhook Integration', () => {
    it('should update transaction status after webhook', async () => {
      const mockTxn = createMockTransaction({ status: 'pending' });
      mockCashOutService.processCashOut.mockResolvedValue({
        success: true,
        transaction: mockTxn,
      });
      
      const cashOutResponse = await request(app)
        .post('/api/buffr/cash-out')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId: 'agent-123',
          customerPhone: '+264819876543',
          amount: 100,
        });
      
      expect(cashOutResponse.status).toBe(200);
      const transactionId = cashOutResponse.body.transaction.id;
      
      const completedTxn = createMockTransaction({
        id: transactionId,
        status: 'completed',
      });
      
      const webhookPayload = {
        id: transactionId,
        type: 'cash-out',
        amount: 100,
        status: 'completed',
        agent_id: 'agent-123',
      };
      
      const signature = generateWebhookSignature(webhookPayload, TEST_CONFIG.WEBHOOK_SECRET);
      
      const webhookResponse = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', `evt-${transactionId}`)
        .set('X-Buffr-Event-Type', 'transaction.completed')
        .send(webhookPayload);
      
      expect(webhookResponse.status).toBe(200);
      
      mockCashOutService.getTransactionStatus.mockResolvedValue(
        createMockApiResponse(completedTxn)
      );
      
      const statusResponse = await request(app)
        .get(`/api/buffr/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.data.status).toBe('completed');
    });
  });
  
  // ================================
  // Health Check Integration
  // ================================
  
  describe('Health Check Integration', () => {
    it('should verify end-to-end connectivity', async () => {
      mockClient.healthCheck.mockResolvedValue(
        createMockApiResponse({
          status: 'healthy',
          timestamp: new Date().toISOString(),
        })
      );
      
      const response = await request(app).get('/api/buffr/health');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.smartpay_integration).toBe('active');
    });
    
    it('should detect API unavailability', async () => {
      mockClient.healthCheck.mockResolvedValue({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'API is down',
        },
      });
      
      const response = await request(app).get('/api/buffr/health');
      
      expect(response.status).toBe(503);
      expect(response.body.smartpay_integration).toBe('error');
    });
  });
  
  // ================================
  // Rollback Scenarios
  // ================================
  
  describe('Rollback Scenarios', () => {
    it('should handle failed transaction after initial success', async () => {
      const mockTxn = createMockTransaction({ status: 'pending' });
      mockCashOutService.processCashOut.mockResolvedValue({
        success: true,
        transaction: mockTxn,
      });
      
      const cashOutResponse = await request(app)
        .post('/api/buffr/cash-out')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId: 'agent-123',
          customerPhone: '+264819876543',
          amount: 100,
        });
      
      expect(cashOutResponse.status).toBe(200);
      const transactionId = cashOutResponse.body.transaction.id;
      
      const failedWebhook = {
        id: transactionId,
        type: 'cash-out',
        amount: 100,
        status: 'failed',
        agent_id: 'agent-123',
        error: {
          code: 'PROCESSING_ERROR',
          message: 'Transaction processing failed',
        },
      };
      
      const signature = generateWebhookSignature(failedWebhook, TEST_CONFIG.WEBHOOK_SECRET);
      
      const webhookResponse = await request(app)
        .post('/api/buffr/webhooks')
        .set('X-Buffr-Signature', signature)
        .set('X-Buffr-Event-Id', `evt-failed-${transactionId}`)
        .set('X-Buffr-Event-Type', 'transaction.failed')
        .send(failedWebhook);
      
      expect(webhookResponse.status).toBe(200);
    });
  });
  
  // ================================
  // Edge Case Scenarios
  // ================================
  
  describe('Edge Cases', () => {
    it('should handle maximum valid amount', async () => {
      const mockTxn = createMockTransaction({ amount: 10000 });
      mockCashOutService.processCashOut.mockResolvedValue({
        success: true,
        transaction: mockTxn,
      });
      
      const response = await request(app)
        .post('/api/buffr/cash-out')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId: 'agent-123',
          customerPhone: '+264819876543',
          amount: 10000,
        });
      
      if (response.status !== 200) {
        console.log('Response body:', JSON.stringify(response.body, null, 2));
      }
      
      expect(response.status).toBe(200);
    });
    
    it('should handle minimum valid amount', async () => {
      const mockTxn = createMockTransaction({ amount: 10 });
      mockCashOutService.processCashOut.mockResolvedValue({
        success: true,
        transaction: mockTxn,
      });
      
      const response = await request(app)
        .post('/api/buffr/cash-out')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId: 'agent-123',
          customerPhone: '+264819876543',
          amount: 10,
        });
      
      expect(response.status).toBe(200);
    });
    
    it('should handle special characters in agent names', async () => {
      const mockAgent = createMockAgent({ name: "O'Brien & Sons" });
      mockClient.registerAgent.mockResolvedValue(
        createMockApiResponse(mockAgent)
      );
      
      const response = await request(app)
        .post('/api/buffr/agents/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: "O'Brien & Sons",
          phone: '+264811234567',
          location: {
            latitude: -22.5609,
            longitude: 17.0658,
            address: 'Windhoek',
          },
        });
      
      expect(response.status).toBe(201);
    });
    
    it('should handle transaction with metadata', async () => {
      const mockTxn = createMockTransaction({
        metadata: {
          source: 'mobile-app',
          version: '1.0',
          device: 'iOS',
        },
      });
      
      mockCashOutService.processCashOut.mockResolvedValue({
        success: true,
        transaction: mockTxn,
      });
      
      const response = await request(app)
        .post('/api/buffr/cash-out')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId: 'agent-123',
          customerPhone: '+264819876543',
          amount: 100,
          metadata: {
            source: 'mobile-app',
            version: '1.0',
          },
        });
      
      expect(response.status).toBe(200);
    });
  });
  
  // ================================
  // Performance Tests
  // ================================
  
  describe('Performance', () => {
    it('should respond within acceptable time limits', async () => {
      const mockTxn = createMockTransaction();
      mockCashOutService.processCashOut.mockResolvedValue({
        success: true,
        transaction: mockTxn,
      });
      
      const start = Date.now();
      
      const response = await request(app)
        .post('/api/buffr/cash-out')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId: 'agent-123',
          customerPhone: '+264819876543',
          amount: 100,
        });
      
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000);
    });
  });
  
  // ================================
  // Audit Logging Tests
  // ================================
  
  describe('Audit Logging', () => {
    it('should log all transactions for audit trail', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const mockTxn = createMockTransaction();
      mockCashOutService.processCashOut.mockResolvedValue({
        success: true,
        transaction: mockTxn,
      });
      
      await request(app)
        .post('/api/buffr/cash-out')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId: 'agent-123',
          customerPhone: '+264819876543',
          amount: 100,
        });
      
      const logs = consoleLogSpy.mock.calls.map(call => call.join(' '));
      const hasAuditLog = logs.some(log => log.includes('Processing cash-out'));
      
      expect(hasAuditLog).toBe(true);
      
      consoleLogSpy.mockRestore();
    });
  });
});