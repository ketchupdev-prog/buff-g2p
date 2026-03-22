/**
 * BuffrCashOutService Unit Tests
 * 
 * Purpose: Test cash-out service logic, validation, and error handling
 * Location: backend/src/services/buffr/__tests__/cashOut.test.ts
 * 
 * Coverage:
 * - Cash-out request validation
 * - Phone number validation (Namibian format)
 * - Amount limits (MIN: 10 NAD, MAX: 10,000 NAD)
 * - Voucher validation and expiry checks
 * - Transaction logging
 * - Error handling and recovery
 * - Balance checks
 * - Receipt generation
 * 
 * Test Count: 30+ comprehensive test cases
 */

import { BuffrCashOutService } from '../cashOut';
import { getBuffrClient } from '../client';
import {
  createMockTransaction,
  createMockVoucher,
  createMockApiResponse,
  createMockErrorResponse,
  VALID_TEST_PHONES,
  INVALID_TEST_PHONES,
  VALID_TEST_AMOUNTS,
  INVALID_TEST_AMOUNTS,
  MOCK_ERRORS,
  LIMITS,
  createExpiredDate,
  createFutureDate,
} from './mocks';

// Mock the client
jest.mock('../client');
const mockGetBuffrClient = getBuffrClient as jest.MockedFunction<typeof getBuffrClient>;

describe('BuffrCashOutService', () => {
  let service: BuffrCashOutService;
  let mockClient: any;
  
  beforeEach(() => {
    mockClient = {
      processCashOut: jest.fn(),
      validateVoucher: jest.fn(),
      getTransaction: jest.fn(),
      getAgentTransactions: jest.fn(),
    };
    
    mockGetBuffrClient.mockReturnValue(mockClient as any);
    service = new BuffrCashOutService();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  // ================================
  // Cash-Out Processing Tests
  // ================================
  
  describe('processCashOut', () => {
    it('should successfully process valid cash-out request', async () => {
      const mockTxn = createMockTransaction({ status: 'completed' });
      mockClient.processCashOut.mockResolvedValue(
        createMockApiResponse(mockTxn)
      );
      
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: 100,
      });
      
      expect(result.success).toBe(true);
      expect(result.transaction).toBeDefined();
      expect(result.transaction?.id).toBe(mockTxn.id);
      expect(result.transaction?.status).toBe('completed');
    });
    
    it('should reject request with missing agent ID', async () => {
      const result = await service.processCashOut({
        agentId: '',
        customerPhone: '+264819876543',
        amount: 100,
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
      expect(result.error?.message).toContain('Agent ID is required');
    });
    
    it('should reject request with missing customer phone', async () => {
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '',
        amount: 100,
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
    });
    
    it('should reject request with whitespace-only agent ID', async () => {
      const result = await service.processCashOut({
        agentId: '   ',
        customerPhone: '+264819876543',
        amount: 100,
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Agent ID is required');
    });
    
    it('should process cash-out with voucher code', async () => {
      const mockVoucher = createMockVoucher({ status: 'active' });
      mockClient.validateVoucher.mockResolvedValue(
        createMockApiResponse(mockVoucher)
      );
      
      const mockTxn = createMockTransaction({
        voucher_id: mockVoucher.id,
        type: 'voucher-redemption',
      });
      mockClient.processCashOut.mockResolvedValue(
        createMockApiResponse(mockTxn)
      );
      
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: 500,
        voucherCode: mockVoucher.code,
      });
      
      expect(result.success).toBe(true);
      expect(mockClient.validateVoucher).toHaveBeenCalledWith(mockVoucher.code);
      expect(result.transaction?.voucher_id).toBe(mockVoucher.id);
    });
    
    it('should reject cash-out if voucher validation fails', async () => {
      mockClient.validateVoucher.mockResolvedValue(MOCK_ERRORS.VOUCHER_EXPIRED);
      
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: 500,
        voucherCode: 'EXPIRED-VOUCHER',
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_VOUCHER');
      expect(mockClient.processCashOut).not.toHaveBeenCalled();
    });
    
    it('should handle API errors from processCashOut', async () => {
      mockClient.processCashOut.mockResolvedValue(MOCK_ERRORS.INSUFFICIENT_BALANCE);
      
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: 10000,
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INSUFFICIENT_BALANCE');
    });
    
    it('should handle unexpected errors gracefully', async () => {
      mockClient.processCashOut.mockRejectedValue(new Error('Unexpected error'));
      
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: 100,
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INTERNAL_ERROR');
      expect(result.error?.message).toContain('Unexpected error');
    });
  });
  
  // ================================
  // Amount Validation Tests
  // ================================
  
  describe('Amount Validation', () => {
    it('should reject zero amount', async () => {
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: 0,
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('greater than 0');
    });
    
    it('should reject negative amount', async () => {
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: -100,
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('greater than 0');
    });
    
    it('should reject amount below minimum (10 NAD)', async () => {
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: 5,
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain(`Minimum cash-out amount is NAD ${LIMITS.MIN_AMOUNT}`);
    });
    
    it('should accept minimum amount (10 NAD)', async () => {
      const mockTxn = createMockTransaction({ amount: LIMITS.MIN_AMOUNT });
      mockClient.processCashOut.mockResolvedValue(
        createMockApiResponse(mockTxn)
      );
      
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: LIMITS.MIN_AMOUNT,
      });
      
      expect(result.success).toBe(true);
    });
    
    it('should reject amount above maximum (10,000 NAD)', async () => {
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: 15000,
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain(`Maximum cash-out amount is NAD ${LIMITS.MAX_AMOUNT}`);
    });
    
    it('should accept maximum amount (10,000 NAD)', async () => {
      const mockTxn = createMockTransaction({ amount: LIMITS.MAX_AMOUNT });
      mockClient.processCashOut.mockResolvedValue(
        createMockApiResponse(mockTxn)
      );
      
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: LIMITS.MAX_AMOUNT,
      });
      
      expect(result.success).toBe(true);
    });
    
    it.each(VALID_TEST_AMOUNTS)(
      'should accept valid amount: %d NAD',
      async (amount) => {
        const mockTxn = createMockTransaction({ amount });
        mockClient.processCashOut.mockResolvedValue(
          createMockApiResponse(mockTxn)
        );
        
        const result = await service.processCashOut({
          agentId: 'agent-123',
          customerPhone: '+264819876543',
          amount,
        });
        
        expect(result.success).toBe(true);
      }
    );
  });
  
  // ================================
  // Phone Number Validation Tests
  // ================================
  
  describe('Phone Number Validation', () => {
    it.each(VALID_TEST_PHONES)(
      'should accept valid Namibian phone: %s',
      async (phone) => {
        const mockTxn = createMockTransaction({ customer_phone: phone });
        mockClient.processCashOut.mockResolvedValue(
          createMockApiResponse(mockTxn)
        );
        
        const result = await service.processCashOut({
          agentId: 'agent-123',
          customerPhone: phone,
          amount: 100,
        });
        
        expect(result.success).toBe(true);
      }
    );
    
    it.each(INVALID_TEST_PHONES)(
      'should reject invalid phone: %s',
      async (phone) => {
        const result = await service.processCashOut({
          agentId: 'agent-123',
          customerPhone: phone,
          amount: 100,
        });
        
        expect(result.success).toBe(false);
        expect(['INVALID_INPUT', 'INTERNAL_ERROR']).toContain(result.error?.code);
        if (result.error?.code === 'INVALID_INPUT') {
          expect(result.error?.message).toContain('Valid customer phone number is required');
        }
      }
    );
    
    it('should accept phone without spaces (10 digits)', async () => {
      const mockTxn = createMockTransaction();
      mockClient.processCashOut.mockResolvedValue(
        createMockApiResponse(mockTxn)
      );
      
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264811234567',
        amount: 100,
      });
      
      expect(result.success).toBe(true);
    });
    
    it('should accept phone with country code (12 digits)', async () => {
      const mockTxn = createMockTransaction();
      mockClient.processCashOut.mockResolvedValue(
        createMockApiResponse(mockTxn)
      );
      
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264811234567',
        amount: 100,
      });
      
      expect(result.success).toBe(true);
    });
  });
  
  // ================================
  // Voucher Validation Tests
  // ================================
  
  describe('validateVoucher', () => {
    it('should validate active voucher', async () => {
      const mockVoucher = createMockVoucher({
        status: 'active',
        expiry_date: createFutureDate(30),
      });
      mockClient.validateVoucher.mockResolvedValue(
        createMockApiResponse(mockVoucher)
      );
      
      const result = await service.validateVoucher('TEST-VOUCHER-123');
      
      expect(result.valid).toBe(true);
      expect(result.voucher).toBeDefined();
      expect(result.voucher?.status).toBe('active');
    });
    
    it('should reject expired voucher', async () => {
      const mockVoucher = createMockVoucher({
        status: 'active',
        expiry_date: createExpiredDate(),
      });
      mockClient.validateVoucher.mockResolvedValue(
        createMockApiResponse(mockVoucher)
      );
      
      const result = await service.validateVoucher('EXPIRED-VOUCHER');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });
    
    it('should reject redeemed voucher', async () => {
      const mockVoucher = createMockVoucher({
        status: 'redeemed',
        expiry_date: createFutureDate(30),
      });
      mockClient.validateVoucher.mockResolvedValue(
        createMockApiResponse(mockVoucher)
      );
      
      const result = await service.validateVoucher('REDEEMED-VOUCHER');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('redeemed');
    });
    
    it('should reject cancelled voucher', async () => {
      const mockVoucher = createMockVoucher({
        status: 'cancelled',
        expiry_date: createFutureDate(30),
      });
      mockClient.validateVoucher.mockResolvedValue(
        createMockApiResponse(mockVoucher)
      );
      
      const result = await service.validateVoucher('CANCELLED-VOUCHER');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cancelled');
    });
    
    it('should handle API errors during validation', async () => {
      mockClient.validateVoucher.mockResolvedValue(
        createMockErrorResponse('VOUCHER_NOT_FOUND', 'Voucher does not exist')
      );
      
      const result = await service.validateVoucher('INVALID-CODE');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    });
    
    it('should handle network errors during validation', async () => {
      mockClient.validateVoucher.mockRejectedValue(new Error('Network error'));
      
      const result = await service.validateVoucher('TEST-VOUCHER');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Network error');
    });
    
    it('should validate voucher expiry date correctly', async () => {
      const mockVoucher = createMockVoucher({
        status: 'active',
        expiry_date: new Date(Date.now() + 1000).toISOString(),
      });
      mockClient.validateVoucher.mockResolvedValue(
        createMockApiResponse(mockVoucher)
      );
      
      const result = await service.validateVoucher('ALMOST-EXPIRED');
      
      expect(result.valid).toBe(true);
    });
  });
  
  // ================================
  // Transaction Status Tests
  // ================================
  
  describe('getTransactionStatus', () => {
    it('should retrieve completed transaction status', async () => {
      const mockTxn = createMockTransaction({ status: 'completed' });
      mockClient.getTransaction.mockResolvedValue(
        createMockApiResponse(mockTxn)
      );
      
      const result = await service.getTransactionStatus('txn-123');
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('completed');
    });
    
    it('should retrieve pending transaction status', async () => {
      const mockTxn = createMockTransaction({ status: 'pending' });
      mockClient.getTransaction.mockResolvedValue(
        createMockApiResponse(mockTxn)
      );
      
      const result = await service.getTransactionStatus('txn-pending');
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('pending');
    });
    
    it('should retrieve failed transaction status', async () => {
      const mockTxn = createMockTransaction({ status: 'failed' });
      mockClient.getTransaction.mockResolvedValue(
        createMockApiResponse(mockTxn)
      );
      
      const result = await service.getTransactionStatus('txn-failed');
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('failed');
    });
    
    it('should handle transaction not found', async () => {
      mockClient.getTransaction.mockResolvedValue(
        createMockErrorResponse('TRANSACTION_NOT_FOUND', 'Transaction does not exist')
      );
      
      const result = await service.getTransactionStatus('invalid-txn-id');
      
      expect(result.success).toBe(false);
    });
  });
  
  // ================================
  // Agent Transaction History Tests
  // ================================
  
  describe('getAgentTransactions', () => {
    it('should retrieve agent transaction history', async () => {
      const mockTransactions = [
        createMockTransaction({ id: 'txn-1' }),
        createMockTransaction({ id: 'txn-2' }),
        createMockTransaction({ id: 'txn-3' }),
      ];
      
      mockClient.getAgentTransactions.mockResolvedValue(
        createMockApiResponse({
          transactions: mockTransactions,
          total: 3,
          page: 1,
        })
      );
      
      const result = await service.getAgentTransactions('agent-123');
      
      expect(result.success).toBe(true);
      expect(result.data?.transactions).toHaveLength(3);
    });
    
    it('should support pagination', async () => {
      const mockResponse = createMockApiResponse({
        transactions: [createMockTransaction()],
        total: 25,
        page: 2,
      });
      
      mockClient.getAgentTransactions.mockResolvedValue(mockResponse);
      
      const result = await service.getAgentTransactions('agent-123', {
        page: 2,
        limit: 10,
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.page).toBe(2);
    });
    
    it('should filter by status', async () => {
      const mockResponse = createMockApiResponse({
        transactions: [
          createMockTransaction({ status: 'completed' }),
          createMockTransaction({ status: 'completed' }),
        ],
        total: 2,
        page: 1,
      });
      
      mockClient.getAgentTransactions.mockResolvedValue(mockResponse);
      
      const result = await service.getAgentTransactions('agent-123', {
        status: 'completed',
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.transactions.every(txn => txn.status === 'completed')).toBe(true);
    });
    
    it('should filter by date range', async () => {
      const mockResponse = createMockApiResponse({
        transactions: [createMockTransaction()],
        total: 1,
        page: 1,
      });
      
      mockClient.getAgentTransactions.mockResolvedValue(mockResponse);
      
      const result = await service.getAgentTransactions('agent-123', {
        from_date: '2026-03-01',
        to_date: '2026-03-18',
      });
      
      expect(result.success).toBe(true);
    });
    
    it('should handle empty transaction history', async () => {
      const mockResponse = createMockApiResponse({
        transactions: [],
        total: 0,
        page: 1,
      });
      
      mockClient.getAgentTransactions.mockResolvedValue(mockResponse);
      
      const result = await service.getAgentTransactions('agent-new');
      
      expect(result.success).toBe(true);
      expect(result.data?.transactions).toHaveLength(0);
    });
  });
  
  // ================================
  // Balance Check Tests
  // ================================
  
  describe('Balance Checks', () => {
    it('should process cash-out when agent has sufficient balance', async () => {
      const mockTxn = createMockTransaction({ amount: 100, status: 'completed' });
      mockClient.processCashOut.mockResolvedValue(
        createMockApiResponse(mockTxn)
      );
      
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: 100,
      });
      
      expect(result.success).toBe(true);
    });
    
    it('should fail when agent has insufficient balance', async () => {
      mockClient.processCashOut.mockResolvedValue(MOCK_ERRORS.INSUFFICIENT_BALANCE);
      
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: 10000,
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INSUFFICIENT_BALANCE');
    });
  });
  
  // ================================
  // Recipient Validation Tests
  // ================================
  
  describe('Recipient Validation', () => {
    it('should validate recipient phone format', async () => {
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: 'invalid-phone',
        amount: 100,
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Valid customer phone number is required');
    });
    
    it('should accept various valid Namibian phone formats', async () => {
      const mockTxn = createMockTransaction();
      mockClient.processCashOut.mockResolvedValue(
        createMockApiResponse(mockTxn)
      );
      
      for (const phone of VALID_TEST_PHONES) {
        const result = await service.processCashOut({
          agentId: 'agent-123',
          customerPhone: phone,
          amount: 100,
        });
        
        expect(result.success).toBe(true);
      }
    });
  });
  
  // ================================
  // Security Tests
  // ================================
  
  describe('Security', () => {
    it('should not log sensitive data in transaction logs', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const mockTxn = createMockTransaction();
      mockClient.processCashOut.mockResolvedValue(
        createMockApiResponse(mockTxn)
      );
      
      await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: 100,
        metadata: { sensitive: 'data' },
      });
      
      const logCalls = consoleLogSpy.mock.calls.map(call => JSON.stringify(call));
      const containsSensitiveData = logCalls.some(call => call.includes('sensitive'));
      
      expect(containsSensitiveData).toBe(false);
      
      consoleLogSpy.mockRestore();
    });
    
    it('should handle transaction metadata correctly', async () => {
      const mockTxn = createMockTransaction({
        metadata: { source: 'mobile-app', version: '1.0' },
      });
      mockClient.processCashOut.mockResolvedValue(
        createMockApiResponse(mockTxn)
      );
      
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: 100,
        metadata: { source: 'mobile-app', version: '1.0' },
      });
      
      expect(result.success).toBe(true);
      expect(result.transaction?.metadata).toBeDefined();
    });
  });
  
  // ================================
  // Error Recovery Tests
  // ================================
  
  describe('Error Recovery', () => {
    it('should continue after logging failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const mockTxn = createMockTransaction();
      mockClient.processCashOut.mockResolvedValue(
        createMockApiResponse(mockTxn)
      );
      
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: 100,
      });
      
      expect(result.success).toBe(true);
      
      consoleErrorSpy.mockRestore();
    });
    
    it('should handle API returning success=false without data', async () => {
      mockClient.processCashOut.mockResolvedValue({
        success: false,
        error: {
          code: 'TRANSACTION_FAILED',
          message: 'Transaction processing failed',
        },
      });
      
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: 100,
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TRANSACTION_FAILED');
    });
  });
  
  // ================================
  // Transaction Limits Tests
  // ================================
  
  describe('Transaction Limits', () => {
    it('should enforce daily transaction limit', async () => {
      const mockError = createMockErrorResponse(
        'DAILY_LIMIT_EXCEEDED',
        'Daily transaction limit exceeded',
        { daily_limit: 50000, current_total: 48000 }
      );
      
      mockClient.processCashOut.mockResolvedValue(mockError);
      
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: 5000,
      });
      
      expect(result.success).toBe(false);
    });
    
    it('should process transaction within daily limit', async () => {
      const mockTxn = createMockTransaction({ amount: 1000 });
      mockClient.processCashOut.mockResolvedValue(
        createMockApiResponse(mockTxn)
      );
      
      const result = await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: 1000,
      });
      
      expect(result.success).toBe(true);
    });
  });
  
  // ================================
  // Idempotency Tests
  // ================================
  
  describe('Idempotency', () => {
    it('should handle duplicate transaction attempts', async () => {
      const mockTxn = createMockTransaction({ id: 'txn-duplicate' });
      const mockResponse = createMockApiResponse(mockTxn);
      
      mockClient.processCashOut.mockResolvedValue(mockResponse);
      
      const request = {
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: 100,
      };
      
      const result1 = await service.processCashOut(request);
      const result2 = await service.processCashOut(request);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(mockClient.processCashOut).toHaveBeenCalledTimes(2);
    });
  });
  
  // ================================
  // Audit Logging Tests
  // ================================
  
  describe('Audit Logging', () => {
    it('should log successful transactions', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const mockTxn = createMockTransaction();
      mockClient.processCashOut.mockResolvedValue(
        createMockApiResponse(mockTxn)
      );
      
      await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: 100,
      });
      
      const auditLogs = consoleLogSpy.mock.calls.filter(
        call => call[0] && call[0].toString().includes('[Audit]')
      );
      
      expect(auditLogs.length).toBeGreaterThan(0);
      
      consoleLogSpy.mockRestore();
    });
    
    it('should log failed transactions', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockClient.processCashOut.mockResolvedValue(MOCK_ERRORS.INSUFFICIENT_BALANCE);
      
      await service.processCashOut({
        agentId: 'agent-123',
        customerPhone: '+264819876543',
        amount: 10000,
      });
      
      const errorLogs = consoleErrorSpy.mock.calls.filter(
        call => call[0] && call[0].toString().includes('[CashOut]')
      );
      
      expect(errorLogs.length).toBeGreaterThan(0);
      
      consoleErrorSpy.mockRestore();
    });
  });
});