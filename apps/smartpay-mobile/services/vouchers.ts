/**
 * Vouchers Service - SmartPay Mobile
 * Handles voucher listing and redemption operations
 * Location: mobile/services/vouchers.ts
 */

import { api } from './api';
import { Voucher, VouchersResponse, RedeemVoucherResponse } from '../types/api';

export { Voucher };

type RedeemResult = {
  success: boolean;
  data?: RedeemVoucherResponse['data'];
  error?: string;
};

function parseRedeemResponse(response: RedeemVoucherResponse | RedeemVoucherResponse['data']): RedeemResult {
  if ('success' in (response as RedeemVoucherResponse)) {
    const wrapped = response as RedeemVoucherResponse;
    if (wrapped.success) {
      return { success: true, data: wrapped.data };
    }
    return { success: false, error: wrapped.error?.message || 'Redemption failed' };
  }

  return {
    success: true,
    data: response as RedeemVoucherResponse['data'],
  };
}

/**
 * Get user's vouchers
 * GET /api/v1/vouchers
 */
export async function getVouchers(): Promise<Voucher[]> {
  try {
    const response = await api.get<VouchersResponse>('/api/v1/vouchers', { retry: true });
    
    return response.data?.vouchers || [];
  } catch (error) {
    console.error('getVouchers error:', error);
    return [];
  }
}

/**
 * Get specific voucher details
 * GET /api/v1/vouchers/:id
 */
export async function getVoucherById(voucherId: string): Promise<Voucher | null> {
  try {
    const response = await api.get<{ data: Voucher }>(`/api/v1/vouchers/${voucherId}`);
    return response.data;
  } catch (error) {
    console.error('getVoucherById error:', error);
    return null;
  }
}

/**
 * Redeem voucher to wallet
 * POST /api/v1/vouchers/:id/redeem
 */
export async function redeemVoucherToWallet(voucherId: string): Promise<{
  success: boolean;
  data?: RedeemVoucherResponse['data'];
  error?: string;
}> {
  try {
    const response = await api.post<RedeemVoucherResponse | RedeemVoucherResponse['data']>(
      `/api/v1/vouchers/${voucherId}/redeem`,
      {},
      { retry: false }
    );
    return parseRedeemResponse(response);
  } catch (error) {
    console.error('redeemVoucherToWallet error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Redeem voucher to wallet using 12-digit voucher code
 * POST /api/v1/vouchers/redeem
 */
export async function redeemVoucherCodeToWallet(voucherCode: string): Promise<RedeemResult> {
  try {
    const response = await api.post<RedeemVoucherResponse | RedeemVoucherResponse['data']>(
      '/api/v1/vouchers/redeem',
      { voucherCode },
      { retry: false }
    );
    return parseRedeemResponse(response);
  } catch (error) {
    console.error('redeemVoucherCodeToWallet error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Redeem voucher at NamPost branch
 * POST /api/v1/vouchers/:id/redeem-nampost
 */
export async function redeemVoucherAtNamPost(
  voucherId: string,
  location?: string
): Promise<{
  success: boolean;
  data?: RedeemVoucherResponse['data'];
  error?: string;
}> {
  try {
    const response = await api.post<RedeemVoucherResponse | RedeemVoucherResponse['data']>(
      `/api/v1/vouchers/${voucherId}/redeem-nampost`,
      { location },
      { retry: false }
    );
    return parseRedeemResponse(response);
  } catch (error) {
    console.error('redeemVoucherAtNamPost error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Redeem voucher at SmartPay agent/location
 * POST /api/v1/vouchers/:id/redeem-smartpay
 */
export async function redeemVoucherAtSmartPay(
  voucherId: string,
  agentCode?: string
): Promise<{
  success: boolean;
  data?: RedeemVoucherResponse['data'];
  error?: string;
}> {
  try {
    const response = await api.post<RedeemVoucherResponse | RedeemVoucherResponse['data']>(
      `/api/v1/vouchers/${voucherId}/redeem-smartpay`,
      { agentCode },
      { retry: false }
    );
    return parseRedeemResponse(response);
  } catch (error) {
    console.error('redeemVoucherAtSmartPay error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
