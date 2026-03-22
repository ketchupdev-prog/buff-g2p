/**
 * BuffrConnect Test Mocks
 * 
 * Purpose: Reusable mock data and helper functions for BuffrConnect tests
 * Location: backend/src/services/buffr/__tests__/mocks.ts
 * 
 * Contents:
 * - Mock API responses (agents, transactions, vouchers)
 * - Helper functions for generating test data
 * - Mock axios client factory
 * - Webhook signature generators
 */

import crypto from 'crypto';
import type {
  BuffrAgent,
  BuffrTransaction,
  BuffrVoucher,
  BuffrApiResponse,
} from '../client';

// ================================
// Mock Data Generators
// ================================

export function createMockAgent(overrides?: Partial<BuffrAgent>): BuffrAgent {
  return {
    id: 'agent-test-123',
    name: 'Test Agent',
    phone: '+264811234567',
    email: 'agent@test.com',
    location: {
      latitude: -22.5609,
      longitude: 17.0658,
      address: 'Windhoek, Namibia',
    },
    status: 'active',
    balance: 10000,
    commission_rate: 0.02,
    created_at: '2026-03-18T00:00:00Z',
    ...overrides,
  };
}

export function createMockTransaction(
  overrides?: Partial<BuffrTransaction>
): BuffrTransaction {
  return {
    id: 'txn-test-123',
    type: 'cash-out',
    amount: 100,
    currency: 'NAD',
    status: 'completed',
    agent_id: 'agent-test-123',
    customer_phone: '+264819876543',
    timestamp: '2026-03-18T10:00:00Z',
    metadata: {},
    ...overrides,
  };
}

export function createMockVoucher(overrides?: Partial<BuffrVoucher>): BuffrVoucher {
  return {
    id: 'voucher-test-123',
    code: 'TEST-VOUCHER-ABC123',
    amount: 500,
    currency: 'NAD',
    status: 'active',
    recipient_phone: '+264819876543',
    expiry_date: '2026-12-31T23:59:59Z',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockApiResponse<T>(
  data: T,
  overrides?: Partial<BuffrApiResponse<T>>
): BuffrApiResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      request_id: 'req-test-123',
      timestamp: '2026-03-18T10:00:00Z',
    },
    ...overrides,
  };
}

export function createMockErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>
): BuffrApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    metadata: {
      request_id: 'req-error-123',
      timestamp: '2026-03-18T10:00:00Z',
    },
  };
}

// ================================
// Mock Axios Client Factory
// ================================

export function createMockAxiosClient() {
  const mockRequest = jest.fn();
  
  return {
    request: mockRequest,
    interceptors: {
      request: {
        use: jest.fn(),
      },
      response: {
        use: jest.fn(),
      },
    },
    defaults: {
      baseURL: 'https://api.buffr.test',
      timeout: 5000,
    },
  };
}

// ================================
// Webhook Signature Helpers
// ================================

export function generateWebhookSignature(
  payload: unknown,
  secret: string
): string {
  const payloadString = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');
}

export function createMockWebhookEvent(
  eventType: string,
  data: unknown,
  overrides?: { id?: string; timestamp?: string }
) {
  return {
    id: overrides?.id || `evt-test-${Date.now()}`,
    type: eventType,
    data,
    timestamp: overrides?.timestamp || new Date().toISOString(),
  };
}

export function createMockWebhookHeaders(
  eventType: string,
  eventId: string,
  signature: string
) {
  return {
    'x-buffr-signature': signature,
    'x-buffr-event-id': eventId,
    'x-buffr-event-type': eventType,
    'content-type': 'application/json',
  };
}

// ================================
// Mock Transaction Events
// ================================

export function createMockTransactionCompletedEvent(
  overrides?: Partial<BuffrTransaction>
) {
  return createMockWebhookEvent(
    'transaction.completed',
    createMockTransaction({ status: 'completed', ...overrides })
  );
}

export function createMockTransactionFailedEvent(
  overrides?: Partial<BuffrTransaction>
) {
  return createMockWebhookEvent(
    'transaction.failed',
    createMockTransaction({ status: 'failed', ...overrides })
  );
}

export function createMockAgentBalanceUpdatedEvent(agentId: string) {
  return createMockWebhookEvent('agent.balance_updated', {
    agent_id: agentId,
    previous_balance: 10000,
    new_balance: 9900,
    change: -100,
    reason: 'cash-out transaction',
  });
}

export function createMockSettlementCompletedEvent(agentId: string) {
  return createMockWebhookEvent('settlement.completed', {
    id: 'settlement-test-123',
    agent_id: agentId,
    amount: 5000,
    status: 'completed',
    settlement_date: '2026-03-18',
  });
}

export function createMockVoucherRedeemedEvent() {
  return createMockWebhookEvent('voucher.redeemed', {
    id: 'txn-voucher-123',
    type: 'voucher-redemption',
    amount: 500,
    status: 'completed',
    agent_id: 'agent-test-123',
    voucher_id: 'voucher-test-123',
    customer_phone: '+264819876543',
    timestamp: '2026-03-18T10:00:00Z',
  });
}

// ================================
// Test Data Collections
// ================================

export const VALID_TEST_PHONES = [
  '+264811234567',
  '+264812345678',
  '+264813456789',
  '+264859876543',
  '+264850000000',
];

export const INVALID_TEST_PHONES = [
  'invalid-phone',
  '1234567890',
  '+1234567890',
  '+264123',
  '0811234567',
  '',
];

export const VALID_TEST_AMOUNTS = [
  10,    // Minimum
  50,    // Small
  100,   // Medium
  1000,  // Large
  10000, // Maximum
];

export const INVALID_TEST_AMOUNTS = [
  -100,   // Negative
  0,      // Zero
  5,      // Below minimum
  10001,  // Above maximum
  15000,  // Way above maximum
  NaN,    // Not a number
  Infinity, // Infinity
];

export const MOCK_AGENT_LOCATIONS = [
  {
    latitude: -22.5609,
    longitude: 17.0658,
    address: 'Windhoek, Namibia',
  },
  {
    latitude: -22.5737,
    longitude: 17.0857,
    address: 'Katutura, Windhoek',
  },
  {
    latitude: -22.6792,
    longitude: 14.5272,
    address: 'Walvis Bay, Namibia',
  },
];

// ================================
// Error Response Templates
// ================================

export const MOCK_ERRORS = {
  INSUFFICIENT_BALANCE: createMockErrorResponse(
    'INSUFFICIENT_BALANCE',
    'Agent has insufficient balance for this transaction',
    { available_balance: 50, requested_amount: 100 }
  ),
  
  AGENT_NOT_FOUND: createMockErrorResponse(
    'AGENT_NOT_FOUND',
    'Agent does not exist or has been deactivated'
  ),
  
  VOUCHER_EXPIRED: createMockErrorResponse(
    'VOUCHER_EXPIRED',
    'Voucher has expired and cannot be redeemed'
  ),
  
  VOUCHER_ALREADY_REDEEMED: createMockErrorResponse(
    'VOUCHER_ALREADY_REDEEMED',
    'This voucher has already been redeemed'
  ),
  
  INVALID_PHONE: createMockErrorResponse(
    'INVALID_PHONE',
    'Phone number format is invalid. Expected: +264XXXXXXXXX'
  ),
  
  NETWORK_ERROR: createMockErrorResponse(
    'NETWORK_ERROR',
    'Network connection failed. Please try again.'
  ),
  
  SERVICE_UNAVAILABLE: createMockErrorResponse(
    'SERVICE_UNAVAILABLE',
    'Buffr API is temporarily unavailable'
  ),
  
  RATE_LIMIT_EXCEEDED: createMockErrorResponse(
    'RATE_LIMIT_EXCEEDED',
    'Too many requests. Please wait before retrying.',
    { retry_after: 60 }
  ),
  
  INVALID_SIGNATURE: createMockErrorResponse(
    'INVALID_SIGNATURE',
    'Webhook signature verification failed'
  ),
  
  TRANSACTION_LIMIT_EXCEEDED: createMockErrorResponse(
    'TRANSACTION_LIMIT_EXCEEDED',
    'Transaction amount exceeds daily limit',
    { daily_limit: 50000, current_total: 48000 }
  ),
};

// ================================
// Mock Axios Error Factory
// ================================

export function createMockAxiosError(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
) {
  return {
    response: {
      status,
      data: {
        success: false,
        error: {
          code,
          message,
          details,
        },
      },
    },
    message: `Request failed with status code ${status}`,
    isAxiosError: true,
  };
}

export function createMockNetworkError(message = 'Network Error') {
  return {
    message,
    isAxiosError: true,
  };
}

// ================================
// Mock Response Sequences
// ================================

/**
 * Create a sequence of mock responses for testing retry logic
 */
export function createRetrySequence<T>(
  failures: number,
  successResponse: BuffrApiResponse<T>
) {
  const sequence: Array<() => Promise<any>> = [];
  
  for (let i = 0; i < failures; i++) {
    sequence.push(() => Promise.reject(createMockNetworkError()));
  }
  
  sequence.push(() => Promise.resolve({ data: successResponse }));
  
  return sequence;
}

// ================================
// Test Utilities
// ================================

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateTestId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

export function createExpiredDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString();
}

export function createFutureDate(daysAhead = 30): string {
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);
  return future.toISOString();
}

// ================================
// Mock Database Helpers
// ================================

export const mockDatabaseResponses = {
  agentExists: {
    rows: [{ id: 'agent-123', name: 'Test Agent' }],
    rowCount: 1,
  },
  agentNotFound: {
    rows: [],
    rowCount: 0,
  },
  transactionInserted: {
    rows: [{ id: 'txn-123' }],
    rowCount: 1,
  },
};

// ================================
// Test Constants
// ================================

export const TEST_CONFIG = {
  API_KEY: 'test-api-key-abc123',
  API_URL: 'https://api.buffr.test',
  WEBHOOK_SECRET: 'test-webhook-secret-xyz789',
  TIMEOUT: 5000,
  MAX_RETRIES: 2,
};

export const LIMITS = {
  MIN_AMOUNT: 10,
  MAX_AMOUNT: 10000,
  MIN_PHONE_LENGTH: 10,
  MAX_PHONE_LENGTH: 12,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
};

// ================================
// Export All Mocks
// ================================

export default {
  createMockAgent,
  createMockTransaction,
  createMockVoucher,
  createMockApiResponse,
  createMockErrorResponse,
  createMockAxiosError,
  createMockNetworkError,
  createRetrySequence,
  generateWebhookSignature,
  createMockWebhookEvent,
  createMockWebhookHeaders,
  createMockTransactionCompletedEvent,
  createMockTransactionFailedEvent,
  createMockAgentBalanceUpdatedEvent,
  createMockSettlementCompletedEvent,
  createMockVoucherRedeemedEvent,
  delay,
  generateTestId,
  createExpiredDate,
  createFutureDate,
  VALID_TEST_PHONES,
  INVALID_TEST_PHONES,
  VALID_TEST_AMOUNTS,
  INVALID_TEST_AMOUNTS,
  MOCK_AGENT_LOCATIONS,
  MOCK_ERRORS,
  mockDatabaseResponses,
  TEST_CONFIG,
  LIMITS,
};
