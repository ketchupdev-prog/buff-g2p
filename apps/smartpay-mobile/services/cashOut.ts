/**
 * Cash-Out Service - SmartPay Mobile
 * Handles all cash-out operations to various channels
 * Location: mobile/services/cashOut.ts
 */

import { api } from './api';
import {
  CashOutBankRequest,
  CashOutTillRequest,
  CashOutAgentRequest,
  CashOutMerchantRequest,
  CashOutATMRequest,
  CashOutResponse as ApiCashOutResponse,
} from '../types/api';

export type CashOutMethod = 'till' | 'agent' | 'merchant' | 'atm' | 'bank';

export interface CashOutResponse {
  success: boolean;
  transactionId: string;
  reference?: string;
  collectionCode?: string;
  offlineCode?: string;
  authCode?: string;
  qrCode?: string;
  namqrCode?: string;
  processingTime?: string;
  instructions?: string;
  expiresAt?: string;
  error?: string;
}

type CashOutData = NonNullable<ApiCashOutResponse['data']>;

/**
 * Cash out to bank account
 * POST /api/v1/cash-out/bank
 */
export async function cashOutToBank(params: {
  walletId: string;
  amount: number;
  bankAccount: string;
  bankCode: string;
}): Promise<CashOutResponse> {
  try {
    const request: CashOutBankRequest = {
      walletId: params.walletId,
      amount: params.amount,
      bankAccount: params.bankAccount,
      bankCode: params.bankCode,
    };

    const result = await api.post<CashOutData>(
      '/api/v1/cash-out/bank',
      request,
      { retry: false }
    );
    return {
      success: true,
      transactionId: result.transactionId,
      reference: result.transactionId,
      processingTime: result.estimatedCompletion || '1-2 business days',
    };
  } catch (error) {
    console.error('cashOutToBank error:', error);

    return {
      success: false,
      transactionId: '',
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Cash out at till
 * POST /api/v1/cash-out/till
 */
export async function cashOutAtTill(params: {
  walletId: string;
  amount: number;
  tillNumber?: string;
}): Promise<CashOutResponse> {
  try {
    const request: CashOutTillRequest = {
      walletId: params.walletId,
      amount: params.amount,
      tillNumber: params.tillNumber,
    };

    const result = await api.post<CashOutData>(
      '/api/v1/cash-out/till',
      request,
      { retry: false }
    );
    return {
      success: true,
      transactionId: result.transactionId,
      offlineCode: result.offlineCode,
      expiresAt: result.expiresAt,
      instructions: result.instructions,
    };
  } catch (error) {
    console.error('cashOutAtTill error:', error);
    return {
      success: false,
      transactionId: '',
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Cash out at agent with QR code
 * POST /api/v1/cash-out/agent
 */
export async function cashOutAtAgent(params: {
  walletId: string;
  amount: number;
  agentCode?: string;
}): Promise<CashOutResponse> {
  try {
    const request: CashOutAgentRequest = {
      walletId: params.walletId,
      amount: params.amount,
      agentCode: params.agentCode,
    };

    const result = await api.post<CashOutData>(
      '/api/v1/cash-out/agent',
      request,
      { retry: false }
    );
    return {
      success: true,
      transactionId: result.transactionId,
      qrCode: result.qrCode,
      expiresAt: result.expiresAt,
      instructions: result.instructions,
    };
  } catch (error) {
    console.error('cashOutAtAgent error:', error);
    return {
      success: false,
      transactionId: '',
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Cash out at merchant POS
 * POST /api/v1/cash-out/merchant
 */
export async function cashOutAtMerchant(params: {
  walletId: string;
  amount: number;
  merchantId: string;
}): Promise<CashOutResponse> {
  try {
    const request: CashOutMerchantRequest = {
      walletId: params.walletId,
      amount: params.amount,
      merchantId: params.merchantId,
    };

    const result = await api.post<CashOutData>(
      '/api/v1/cash-out/merchant',
      request,
      { retry: false }
    );
    return {
      success: true,
      transactionId: result.transactionId,
      authCode: result.authCode,
      expiresAt: result.expiresAt,
      instructions: result.instructions,
    };
  } catch (error) {
    console.error('cashOutAtMerchant error:', error);
    return {
      success: false,
      transactionId: '',
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Cash out at ATM with NAMQR
 * POST /api/v1/cash-out/atm
 */
export async function cashOutAtATM(params: {
  walletId: string;
  amount: number;
  atmId?: string;
}): Promise<CashOutResponse> {
  try {
    const request: CashOutATMRequest = {
      walletId: params.walletId,
      amount: params.amount,
      atmId: params.atmId,
    };

    const result = await api.post<CashOutData>(
      '/api/v1/cash-out/atm',
      request,
      { retry: false }
    );
    return {
      success: true,
      transactionId: result.transactionId,
      namqrCode: result.namqrCode,
      expiresAt: result.expiresAt,
      instructions: result.instructions,
    };
  } catch (error) {
    console.error('cashOutAtATM error:', error);

    return {
      success: false,
      transactionId: '',
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Legacy method for backward compatibility
 */
export async function cashOutAtLocation(params: {
  walletId: string;
  amount: number;
  method: 'till' | 'agent' | 'merchant';
  recipientId?: string;
  agentCode?: string;
  merchantId?: string;
  tillNumber?: string;
  pin?: string;
}): Promise<CashOutResponse> {
  if (params.method === 'till') {
    return cashOutAtTill({
      walletId: params.walletId,
      amount: params.amount,
      tillNumber: params.tillNumber,
    });
  } else if (params.method === 'agent') {
    return cashOutAtAgent({
      walletId: params.walletId,
      amount: params.amount,
      agentCode: params.agentCode,
    });
  } else if (params.method === 'merchant') {
    return cashOutAtMerchant({
      walletId: params.walletId,
      amount: params.amount,
      merchantId: params.merchantId || params.recipientId || '',
    });
  }

  return {
    success: false,
    transactionId: '',
    error: 'Invalid cash-out method',
  };
}

/**
 * Get cash-out fee for a method
 */
export function getCashOutFee(method: CashOutMethod, amount: number): number {
  switch (method) {
    case 'agent':
      return 5;
    case 'atm':
      return 10;
    case 'till':
    case 'merchant':
    case 'bank':
    default:
      return 0;
  }
}

/**
 * Get processing time for a method
 */
export function getProcessingTime(method: CashOutMethod): string {
  switch (method) {
    case 'bank':
      return '1-2 business days';
    case 'till':
    case 'agent':
    case 'merchant':
    case 'atm':
    default:
      return 'Instant';
  }
}
