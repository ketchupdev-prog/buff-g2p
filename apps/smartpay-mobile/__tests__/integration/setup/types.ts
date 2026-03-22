/**
 * Type Definitions for Integration Tests
 * Location: fintech/smartpay-mobile/__tests__/integration/setup/types.ts
 */

export interface TestUser {
  id: string;
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  smartpayId: string;
}

export interface TestWallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  name: string;
}

export interface TestVoucher {
  id: string;
  voucherCode: string;
  amount: number;
  currency: string;
  status: string;
}

export interface TestTransaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  fee: number;
  currency: string;
}

export interface TestGroup {
  id: string;
  name: string;
  createdBy: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface WebhookPayload {
  id: string;
  type: string;
  data: any;
  timestamp: string;
}

export interface WebhookHeaders {
  'X-Buffr-Signature': string;
  'X-Buffr-Event-Id': string;
  'X-Buffr-Event-Type': string;
}
