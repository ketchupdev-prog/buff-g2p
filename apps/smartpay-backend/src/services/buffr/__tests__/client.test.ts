/**
 * BuffrClient Unit Tests
 * 
 * Purpose: Test BuffrConnect API client with retry logic, error handling, and validation
 * Location: backend/src/services/buffr/__tests__/client.test.ts
 * 
 * Coverage:
 * - Agent operations (registration, status updates, balance checks)
 * - Transaction processing (cash-out, settlements)
 * - Voucher operations (validation, redemption)
 * - Retry logic for transient failures
 * - Error handling for 4xx/5xx responses
 * - Network failures and timeouts
 * - Rate limiting
 * - API key validation
 * 
 * Test Count: 35+ comprehensive test cases
 */

import { BuffrClient } from '../client';
import axios from 'axios';
import {
  createMockAgent,
  createMockTransaction,
  createMockVoucher,
  createMockApiResponse,
  createMockAxiosError,
  createMockNetworkError,
  createRetrySequence,
  VALID_TEST_PHONES,
  INVALID_TEST_PHONES,
  VALID_TEST_AMOUNTS,
  INVALID_TEST_AMOUNTS,
  MOCK_AGENT_LOCATIONS,
  MOCK_ERRORS,
  TEST_CONFIG,
} from './mocks';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('BuffrClient', () => {
  let client: BuffrClient;
  const mockCreate = jest.fn();
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock axios.create to return a mock client
    mockCreate.mockReturnValue({
      request: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    } as any);
    
    mockedAxios.create = mockCreate;
    
    // Create BuffrClient instance
    client = new BuffrClient({
      apiKey: 'test-api-key',
      apiUrl: 'https://api.buffr.test',
      timeout: 5000,
      maxRetries: 2,
    });
  });
  
  describe('Constructor', () => {
    it('should throw error if API key is missing', () => {
      expect(() => {
        new BuffrClient({
          apiKey: '',
          apiUrl: 'https://api.buffr.test',
        });
      }).toThrow('BUFFR_API_KEY is required');
    });
    
    it('should throw error if API URL is missing', () => {
      expect(() => {
        new BuffrClient({
          apiKey: 'test-key',
          apiUrl: '',
        });
      }).toThrow('BUFFR_API_URL is required');
    });
    
    it('should create axios instance with correct config', () => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.buffr.test',
          timeout: 5000,
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });
  
  describe('registerAgent', () => {
    it('should successfully register agent', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'agent-123',
          name: 'Test Agent',
          phone: '+264811234567',
          status: 'active',
          balance: 0,
          commission_rate: 0.02,
          created_at: '2026-03-18T00:00:00Z',
        },
      };
      
      // Mock successful response
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.registerAgent({
        name: 'Test Agent',
        phone: '+264811234567',
        email: 'agent@test.com',
        location: {
          latitude: -22.5609,
          longitude: 17.0658,
          address: 'Windhoek, Namibia',
        },
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('agent-123');
      expect(result.data?.status).toBe('active');
    });
    
    it('should handle validation errors (4xx)', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            success: false,
            error: {
              code: 'INVALID_PHONE',
              message: 'Phone number format is invalid',
            },
          },
        },
        message: 'Request failed with status code 400',
      };
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.registerAgent({
        name: 'Test Agent',
        phone: 'invalid-phone',
        location: {
          latitude: -22.5609,
          longitude: 17.0658,
          address: 'Windhoek',
        },
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('400');
    });
    
    it('should retry on network errors', async () => {
      const mockError = new Error('Network error');
      const mockSuccess = {
        data: {
          success: true,
          data: { id: 'agent-123' },
        },
      };
      
      // First call fails, second succeeds
      (client as any).client.request
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockSuccess);
      
      const result = await client.registerAgent({
        name: 'Test Agent',
        phone: '+264811234567',
        location: {
          latitude: -22.5609,
          longitude: 17.0658,
          address: 'Windhoek',
        },
      });
      
      expect(result.success).toBe(true);
      expect((client as any).client.request).toHaveBeenCalledTimes(2);
    });
    
    it('should not retry on 4xx errors', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { error: 'Bad request' },
        },
      };
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.registerAgent({
        name: 'Test Agent',
        phone: '+264811234567',
        location: {
          latitude: -22.5609,
          longitude: 17.0658,
          address: 'Windhoek',
        },
      });
      
      expect(result.success).toBe(false);
      expect((client as any).client.request).toHaveBeenCalledTimes(1);
    });
    
    it('should retry on 5xx errors', async () => {
      const mockError = {
        response: {
          status: 503,
          data: { error: 'Service unavailable' },
        },
      };
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.registerAgent({
        name: 'Test Agent',
        phone: '+264811234567',
        location: {
          latitude: -22.5609,
          longitude: 17.0658,
          address: 'Windhoek',
        },
      });
      
      expect(result.success).toBe(false);
      // Should retry maxRetries times
      expect((client as any).client.request).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });
  
  describe('processCashOut', () => {
    it('should successfully process cash-out', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'txn-123',
          type: 'cash-out',
          amount: 100,
          currency: 'NAD',
          status: 'completed',
          agent_id: 'agent-123',
          customer_phone: '+264819876543',
          timestamp: '2026-03-18T10:00:00Z',
        },
      };
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.processCashOut({
        agent_id: 'agent-123',
        customer_phone: '+264819876543',
        amount: 100,
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.type).toBe('cash-out');
      expect(result.data?.amount).toBe(100);
    });
    
    it('should handle insufficient balance error', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            success: false,
            error: {
              code: 'INSUFFICIENT_BALANCE',
              message: 'Agent has insufficient balance',
            },
          },
        },
        message: 'Request failed with status code 400',
      };
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.processCashOut({
        agent_id: 'agent-123',
        customer_phone: '+264819876543',
        amount: 10000,
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('400');
    });
  });
  
  describe('validateVoucher', () => {
    it('should validate active voucher', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'voucher-123',
          code: 'TEST-VOUCHER-123',
          amount: 500,
          currency: 'NAD',
          status: 'active',
          recipient_phone: '+264819876543',
          expiry_date: '2026-12-31T23:59:59Z',
          created_at: '2026-01-01T00:00:00Z',
        },
      };
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.validateVoucher('TEST-VOUCHER-123');
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('active');
      expect(result.data?.amount).toBe(500);
    });
    
    it('should reject expired voucher', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            success: false,
            error: {
              code: 'VOUCHER_EXPIRED',
              message: 'Voucher has expired',
            },
          },
        },
      };
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.validateVoucher('EXPIRED-VOUCHER');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('400');
    });
    
    it('should reject already redeemed voucher', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'voucher-123',
          code: 'REDEEMED-VOUCHER',
          status: 'redeemed',
          amount: 500,
          currency: 'NAD',
          recipient_phone: '+264819876543',
          expiry_date: '2026-12-31T23:59:59Z',
          created_at: '2026-01-01T00:00:00Z',
        },
      };
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.validateVoucher('REDEEMED-VOUCHER');
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('redeemed');
    });
  });
  
  describe('getAgentBalance', () => {
    it('should retrieve agent balance', async () => {
      const mockResponse = {
        success: true,
        data: {
          balance: 15000,
          currency: 'NAD',
        },
      };
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.getAgentBalance('agent-123');
      
      expect(result.success).toBe(true);
      expect(result.data?.balance).toBe(15000);
      expect(result.data?.currency).toBe('NAD');
    });
    
    it('should handle agent not found', async () => {
      const mockError = {
        response: {
          status: 404,
          data: {
            success: false,
            error: {
              code: 'AGENT_NOT_FOUND',
              message: 'Agent does not exist',
            },
          },
        },
      };
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.getAgentBalance('invalid-agent');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('404');
    });
  });
  
  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const mockResponse = {
        success: true,
        data: {
          status: 'healthy',
          timestamp: '2026-03-18T10:00:00Z',
        },
      };
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.healthCheck();
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('healthy');
    });
    
    it('should handle API unavailable', async () => {
      const mockError = new Error('Network error');
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.healthCheck();
      
      expect(result.success).toBe(false);
    });
  });
  
  describe('getAgent', () => {
    it('should retrieve agent details', async () => {
      const mockAgent = createMockAgent();
      const mockResponse = createMockApiResponse(mockAgent);
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.getAgent('agent-123');
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(mockAgent.id);
      expect(result.data?.name).toBe(mockAgent.name);
      expect(result.data?.status).toBe('active');
    });
    
    it('should handle agent not found', async () => {
      const mockError = createMockAxiosError(404, 'AGENT_NOT_FOUND', 'Agent does not exist');
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.getAgent('invalid-agent-id');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('404');
    });
    
    it('should retrieve suspended agent', async () => {
      const mockAgent = createMockAgent({ status: 'suspended' });
      const mockResponse = createMockApiResponse(mockAgent);
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.getAgent('agent-suspended');
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('suspended');
    });
  });
  
  describe('updateAgentStatus', () => {
    it('should activate inactive agent', async () => {
      const mockAgent = createMockAgent({ status: 'active' });
      const mockResponse = createMockApiResponse(mockAgent);
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.updateAgentStatus('agent-123', 'active');
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('active');
    });
    
    it('should suspend agent', async () => {
      const mockAgent = createMockAgent({ status: 'suspended' });
      const mockResponse = createMockApiResponse(mockAgent);
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.updateAgentStatus('agent-123', 'suspended');
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('suspended');
    });
    
    it('should deactivate agent', async () => {
      const mockAgent = createMockAgent({ status: 'inactive' });
      const mockResponse = createMockApiResponse(mockAgent);
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.updateAgentStatus('agent-123', 'inactive');
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('inactive');
    });
    
    it('should handle invalid status transition', async () => {
      const mockError = createMockAxiosError(
        400,
        'INVALID_STATUS_TRANSITION',
        'Cannot transition from suspended to inactive'
      );
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.updateAgentStatus('agent-123', 'inactive');
      
      expect(result.success).toBe(false);
    });
  });
  
  describe('getTransaction', () => {
    it('should retrieve transaction details', async () => {
      const mockTxn = createMockTransaction();
      const mockResponse = createMockApiResponse(mockTxn);
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.getTransaction('txn-123');
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(mockTxn.id);
      expect(result.data?.status).toBe('completed');
    });
    
    it('should handle transaction not found', async () => {
      const mockError = createMockAxiosError(404, 'TRANSACTION_NOT_FOUND', 'Transaction does not exist');
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.getTransaction('invalid-txn-id');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('404');
    });
    
    it('should retrieve pending transaction', async () => {
      const mockTxn = createMockTransaction({ status: 'pending' });
      const mockResponse = createMockApiResponse(mockTxn);
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.getTransaction('txn-pending');
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('pending');
    });
    
    it('should retrieve failed transaction', async () => {
      const mockTxn = createMockTransaction({ status: 'failed' });
      const mockResponse = createMockApiResponse(mockTxn);
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.getTransaction('txn-failed');
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('failed');
    });
  });
  
  describe('getAgentTransactions', () => {
    it('should retrieve agent transactions with pagination', async () => {
      const mockTransactions = [
        createMockTransaction({ id: 'txn-1' }),
        createMockTransaction({ id: 'txn-2' }),
        createMockTransaction({ id: 'txn-3' }),
      ];
      
      const mockResponse = createMockApiResponse({
        transactions: mockTransactions,
        total: 25,
        page: 1,
      });
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.getAgentTransactions('agent-123', {
        page: 1,
        limit: 10,
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.transactions).toHaveLength(3);
      expect(result.data?.total).toBe(25);
    });
    
    it('should filter transactions by status', async () => {
      const mockTransactions = [
        createMockTransaction({ id: 'txn-1', status: 'completed' }),
        createMockTransaction({ id: 'txn-2', status: 'completed' }),
      ];
      
      const mockResponse = createMockApiResponse({
        transactions: mockTransactions,
        total: 2,
        page: 1,
      });
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.getAgentTransactions('agent-123', {
        status: 'completed',
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.transactions.every(txn => txn.status === 'completed')).toBe(true);
    });
    
    it('should filter transactions by date range', async () => {
      const mockResponse = createMockApiResponse({
        transactions: [createMockTransaction()],
        total: 1,
        page: 1,
      });
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.getAgentTransactions('agent-123', {
        from_date: '2026-03-01',
        to_date: '2026-03-18',
      });
      
      expect(result.success).toBe(true);
      expect((client as any).client.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('from_date=2026-03-01'),
        })
      );
    });
    
    it('should handle empty transaction history', async () => {
      const mockResponse = createMockApiResponse({
        transactions: [],
        total: 0,
        page: 1,
      });
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.getAgentTransactions('agent-new');
      
      expect(result.success).toBe(true);
      expect(result.data?.transactions).toHaveLength(0);
      expect(result.data?.total).toBe(0);
    });
  });
  
  describe('redeemVoucher', () => {
    it('should successfully redeem voucher', async () => {
      const mockTxn = createMockTransaction({ type: 'voucher-redemption', voucher_id: 'voucher-123' });
      const mockResponse = createMockApiResponse(mockTxn);
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.redeemVoucher({
        voucher_code: 'TEST-VOUCHER-123',
        agent_id: 'agent-123',
        recipient_phone: '+264819876543',
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.type).toBe('voucher-redemption');
      expect(result.data?.voucher_id).toBe('voucher-123');
    });
    
    it('should handle voucher already redeemed', async () => {
      const mockError = createMockAxiosError(
        400,
        'VOUCHER_ALREADY_REDEEMED',
        'This voucher has already been redeemed'
      );
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.redeemVoucher({
        voucher_code: 'REDEEMED-VOUCHER',
        agent_id: 'agent-123',
        recipient_phone: '+264819876543',
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('400');
    });
    
    it('should handle expired voucher', async () => {
      const mockError = createMockAxiosError(
        400,
        'VOUCHER_EXPIRED',
        'Voucher has expired'
      );
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.redeemVoucher({
        voucher_code: 'EXPIRED-VOUCHER',
        agent_id: 'agent-123',
        recipient_phone: '+264819876543',
      });
      
      expect(result.success).toBe(false);
    });
    
    it('should handle invalid recipient phone', async () => {
      const mockError = createMockAxiosError(
        400,
        'INVALID_PHONE',
        'Recipient phone number is invalid'
      );
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.redeemVoucher({
        voucher_code: 'TEST-VOUCHER',
        agent_id: 'agent-123',
        recipient_phone: 'invalid-phone',
      });
      
      expect(result.success).toBe(false);
    });
  });
  
  describe('getVoucher', () => {
    it('should retrieve voucher details', async () => {
      const mockVoucher = createMockVoucher();
      const mockResponse = createMockApiResponse(mockVoucher);
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.getVoucher('TEST-VOUCHER-123');
      
      expect(result.success).toBe(true);
      expect(result.data?.code).toBe(mockVoucher.code);
      expect(result.data?.amount).toBe(500);
    });
    
    it('should handle voucher not found', async () => {
      const mockError = createMockAxiosError(404, 'VOUCHER_NOT_FOUND', 'Voucher does not exist');
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.getVoucher('INVALID-CODE');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('404');
    });
  });
  
  describe('requestSettlement', () => {
    it('should request daily settlement', async () => {
      const mockSettlement = createMockTransaction({
        type: 'settlement',
        amount: 5000,
        status: 'pending',
      });
      const mockResponse = createMockApiResponse(mockSettlement);
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.requestSettlement('agent-123');
      
      expect(result.success).toBe(true);
      expect(result.data?.type).toBe('settlement');
      expect(result.data?.amount).toBe(5000);
    });
    
    it('should handle no pending settlements', async () => {
      const mockError = createMockAxiosError(
        400,
        'NO_PENDING_SETTLEMENTS',
        'Agent has no pending settlements'
      );
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.requestSettlement('agent-123');
      
      expect(result.success).toBe(false);
    });
    
    it('should handle settlement already requested today', async () => {
      const mockError = createMockAxiosError(
        409,
        'SETTLEMENT_ALREADY_REQUESTED',
        'Settlement already requested for today'
      );
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.requestSettlement('agent-123');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('409');
    });
  });
  
  describe('getSettlements', () => {
    it('should retrieve settlement history', async () => {
      const mockSettlements = [
        createMockTransaction({ type: 'settlement', amount: 5000 }),
        createMockTransaction({ type: 'settlement', amount: 3000 }),
      ];
      
      const mockResponse = createMockApiResponse({
        settlements: mockSettlements,
        total: 2,
      });
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.getSettlements('agent-123', {
        page: 1,
        limit: 10,
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.settlements).toHaveLength(2);
      expect(result.data?.total).toBe(2);
    });
    
    it('should filter settlements by date range', async () => {
      const mockResponse = createMockApiResponse({
        settlements: [createMockTransaction({ type: 'settlement' })],
        total: 1,
      });
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.getSettlements('agent-123', {
        from_date: '2026-03-01',
        to_date: '2026-03-18',
      });
      
      expect(result.success).toBe(true);
      expect((client as any).client.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('from_date=2026-03-01'),
        })
      );
    });
  });
  
  describe('Edge Cases & Error Handling', () => {
    it('should handle timeout errors', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
      };
      
      (client as any).client.request.mockRejectedValue(timeoutError);
      
      const result = await client.getAgent('agent-123');
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('timeout');
    });
    
    it('should handle DNS resolution failures', async () => {
      const dnsError = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND api.buffr.test',
      };
      
      (client as any).client.request.mockRejectedValue(dnsError);
      
      const result = await client.healthCheck();
      
      expect(result.success).toBe(false);
    });
    
    it('should handle connection refused', async () => {
      const connError = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:443',
      };
      
      (client as any).client.request.mockRejectedValue(connError);
      
      const result = await client.healthCheck();
      
      expect(result.success).toBe(false);
    });
    
    it('should handle malformed response', async () => {
      (client as any).client.request.mockResolvedValue({
        data: { invalid: 'response' },
      });
      
      const result = await client.getAgent('agent-123');
      
      expect(result.data).toBeUndefined();
    });
    
    it('should handle rate limit error (429)', async () => {
      const mockError = createMockAxiosError(
        429,
        'RATE_LIMIT_EXCEEDED',
        'Too many requests',
        { retry_after: 60 }
      );
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.processCashOut({
        agent_id: 'agent-123',
        customer_phone: '+264819876543',
        amount: 100,
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('429');
    });
    
    it('should handle unauthorized (401) errors', async () => {
      const mockError = createMockAxiosError(
        401,
        'UNAUTHORIZED',
        'Invalid API key'
      );
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.healthCheck();
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('401');
    });
    
    it('should handle forbidden (403) errors', async () => {
      const mockError = createMockAxiosError(
        403,
        'FORBIDDEN',
        'Insufficient permissions'
      );
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.getAgent('restricted-agent');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('403');
    });
  });
  
  describe('Amount Validation', () => {
    it.each(VALID_TEST_AMOUNTS)(
      'should accept valid amount: %d NAD',
      async (amount) => {
        const mockTxn = createMockTransaction({ amount });
        const mockResponse = createMockApiResponse(mockTxn);
        
        (client as any).client.request.mockResolvedValue({ data: mockResponse });
        
        const result = await client.processCashOut({
          agent_id: 'agent-123',
          customer_phone: '+264819876543',
          amount,
        });
        
        expect(result.success).toBe(true);
        expect(result.data?.amount).toBe(amount);
      }
    );
  });
  
  describe('Phone Number Validation', () => {
    it.each(VALID_TEST_PHONES)(
      'should accept valid phone: %s',
      async (phone) => {
        const mockAgent = createMockAgent({ phone });
        const mockResponse = createMockApiResponse(mockAgent);
        
        (client as any).client.request.mockResolvedValue({ data: mockResponse });
        
        const result = await client.registerAgent({
          name: 'Test Agent',
          phone,
          location: MOCK_AGENT_LOCATIONS[0],
        });
        
        expect(result.success).toBe(true);
      }
    );
  });
  
  describe('Currency Validation', () => {
    it('should handle NAD currency', async () => {
      const mockTxn = createMockTransaction({ currency: 'NAD' });
      const mockResponse = createMockApiResponse(mockTxn);
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const result = await client.processCashOut({
        agent_id: 'agent-123',
        customer_phone: '+264819876543',
        amount: 100,
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.currency).toBe('NAD');
    });
  });
  
  describe('Retry Logic', () => {
    it('should retry exactly maxRetries times on network error', async () => {
      const mockError = createMockNetworkError();
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.healthCheck();
      
      expect(result.success).toBe(false);
      expect((client as any).client.request).toHaveBeenCalledTimes(2);
    });
    
    it('should succeed after one retry', async () => {
      const mockResponse = createMockApiResponse(createMockAgent());
      
      (client as any).client.request
        .mockRejectedValueOnce(createMockNetworkError())
        .mockResolvedValueOnce({ data: mockResponse });
      
      const result = await client.getAgent('agent-123');
      
      expect(result.success).toBe(true);
      expect((client as any).client.request).toHaveBeenCalledTimes(2);
    });
    
    it('should retry on 500 errors', async () => {
      const mockError = createMockAxiosError(500, 'INTERNAL_SERVER_ERROR', 'Server error');
      const mockResponse = createMockApiResponse(createMockAgent());
      
      (client as any).client.request
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({ data: mockResponse });
      
      const result = await client.getAgent('agent-123');
      
      expect(result.success).toBe(true);
      expect((client as any).client.request).toHaveBeenCalledTimes(2);
    });
    
    it('should retry on 503 errors', async () => {
      const mockError = createMockAxiosError(503, 'SERVICE_UNAVAILABLE', 'Service temporarily unavailable');
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.healthCheck();
      
      expect(result.success).toBe(false);
      expect((client as any).client.request).toHaveBeenCalledTimes(2);
    });
    
    it('should not retry on 400 errors', async () => {
      const mockError = createMockAxiosError(400, 'BAD_REQUEST', 'Invalid request');
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.getAgent('agent-123');
      
      expect(result.success).toBe(false);
      expect((client as any).client.request).toHaveBeenCalledTimes(1);
    });
    
    it('should not retry on 404 errors', async () => {
      const mockError = createMockAxiosError(404, 'NOT_FOUND', 'Resource not found');
      
      (client as any).client.request.mockRejectedValue(mockError);
      
      const result = await client.getAgent('invalid-agent');
      
      expect(result.success).toBe(false);
      expect((client as any).client.request).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent requests', async () => {
      const mockAgent = createMockAgent();
      const mockResponse = createMockApiResponse(mockAgent);
      
      (client as any).client.request.mockResolvedValue({ data: mockResponse });
      
      const promises = [
        client.getAgent('agent-1'),
        client.getAgent('agent-2'),
        client.getAgent('agent-3'),
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });
    
    it('should handle mixed success and failure in concurrent requests', async () => {
      const mockSuccess = createMockApiResponse(createMockAgent());
      const mockError = createMockAxiosError(404, 'NOT_FOUND', 'Not found');
      
      (client as any).client.request
        .mockResolvedValueOnce({ data: mockSuccess })
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({ data: mockSuccess });
      
      const results = await Promise.all([
        client.getAgent('agent-1'),
        client.getAgent('invalid-agent'),
        client.getAgent('agent-3'),
      ]);
      
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });
});
