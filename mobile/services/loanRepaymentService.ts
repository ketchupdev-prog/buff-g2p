/**
 * Loan Repayment Service
 * 
 * Handles voucher-backed loan repayment edge cases:
 * - Automatic deduction from voucher-to-wallet redemptions
 * - Cash redemption handling (manual or via till)
 * - Partial early repayments
 * - Overpayment scenarios
 * 
 * Location: mobile/services/loanRepaymentService.ts
 */

import { getSecureItem } from './secureStorage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export interface Loan {
  id: string;
  amount: number;
  disbursedAmount: number;
  interestRate: number;
  totalOwed: number;
  amountPaid: number;
  amountRemaining: number;
  status: 'active' | 'repaid' | 'defaulted' | 'partial';
  voucherBacked: boolean;
  disbursedAt: string;
  dueDate: string;
  repaidAt?: string;
}

export interface RepaymentSchedule {
  loanId: string;
  nextVoucherAmount: number;
  nextVoucherDate: string;
  autoRepaymentEnabled: boolean;
  deductionAmount: number;
  remainingAfterDeduction: number;
}

export interface RepaymentTransaction {
  id: string;
  loanId: string;
  amount: number;
  method: 'voucher_redemption' | 'wallet' | 'cash_till' | 'manual';
  isPartial: boolean;
  remainingBalance: number;
  overpayment?: number;
  createdAt: string;
}

/**
 * Get active loan details.
 * 
 * @param loanId - Loan ID
 * @returns Loan details
 */
export async function getLoanDetails(loanId: string): Promise<Loan> {
  try {
    const authToken = await getSecureItem('buffr_access_token');
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/v1/mobile/loans/${loanId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch loan: ${response.status}`);
    }

    const data = await response.json();
    return data.loan;
  } catch (error) {
    console.error('Failed to get loan details:', error);
    throw error;
  }
}

/**
 * Get repayment schedule for voucher-backed loan.
 * Shows how next voucher will be applied.
 * 
 * @param loanId - Loan ID
 * @returns Repayment schedule
 */
export async function getRepaymentSchedule(loanId: string): Promise<RepaymentSchedule> {
  try {
    const authToken = await getSecureItem('buffr_access_token');
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/v1/mobile/loans/${loanId}/schedule`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch schedule: ${response.status}`);
    }

    const data = await response.json();
    return data.schedule;
  } catch (error) {
    console.error('Failed to get repayment schedule:', error);
    throw error;
  }
}

/**
 * Redeem voucher with automatic loan repayment deduction.
 * 
 * @param voucherId - Voucher ID
 * @param walletId - Destination wallet ID
 * @param redeemMethod - 'wallet' or 'cash'
 * @returns Redemption and repayment details
 */
export async function redeemVoucherWithLoanRepayment(
  voucherId: string,
  walletId: string,
  redeemMethod: 'wallet' | 'cash'
): Promise<{
  voucherAmount: number;
  loanRepayment: number;
  netAmount: number;
  loanFullyRepaid: boolean;
  overpayment?: number;
}> {
  try {
    const authToken = await getSecureItem('buffr_access_token');
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/v1/mobile/vouchers/${voucherId}/redeem-with-loan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        walletId,
        method: redeemMethod
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Redemption failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to redeem voucher with loan repayment:', error);
    throw error;
  }
}

/**
 * Make partial early repayment from wallet.
 * 
 * @param loanId - Loan ID
 * @param amount - Amount to repay
 * @param walletId - Source wallet ID
 * @returns Repayment transaction
 */
export async function makePartialRepayment(
  loanId: string,
  amount: number,
  walletId: string
): Promise<RepaymentTransaction> {
  try {
    const authToken = await getSecureItem('buffr_access_token');
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/v1/mobile/loans/${loanId}/repay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        amount,
        walletId,
        method: 'wallet'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Repayment failed: ${response.status}`);
    }

    const data = await response.json();
    return data.repayment;
  } catch (error) {
    console.error('Failed to make partial repayment:', error);
    throw error;
  }
}

/**
 * Register cash redemption for loan repayment.
 * Used when user redeems voucher for cash at till/agent.
 * 
 * @param loanId - Loan ID
 * @param voucherId - Voucher ID that was redeemed for cash
 * @param cashAmount - Cash amount received
 * @param tillCode - Till/agent code
 * @returns Repayment record
 */
export async function registerCashRedemptionRepayment(
  loanId: string,
  voucherId: string,
  cashAmount: number,
  tillCode: string
): Promise<RepaymentTransaction> {
  try {
    const authToken = await getSecureItem('buffr_access_token');
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/v1/mobile/loans/${loanId}/register-cash-repayment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        voucherId,
        cashAmount,
        tillCode,
        method: 'cash_till'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Cash repayment registration failed: ${response.status}`);
    }

    const data = await response.json();
    return data.repayment;
  } catch (error) {
    console.error('Failed to register cash redemption repayment:', error);
    throw error;
  }
}

/**
 * Handle overpayment scenario.
 * When repayment exceeds loan balance, excess is credited to wallet.
 * 
 * @param loanId - Loan ID
 * @param overpaymentAmount - Overpayment amount
 * @returns Credit transaction details
 */
export async function handleOverpayment(
  loanId: string,
  overpaymentAmount: number
): Promise<{
  creditedToWallet: string;
  amount: number;
  transactionId: string;
}> {
  try {
    const authToken = await getSecureItem('buffr_access_token');
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/v1/mobile/loans/${loanId}/handle-overpayment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        overpaymentAmount
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Overpayment handling failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to handle overpayment:', error);
    throw error;
  }
}

/**
 * Calculate repayment breakdown for voucher redemption.
 * Shows user how much goes to loan vs wallet before confirming.
 * 
 * @param voucherId - Voucher ID
 * @returns Breakdown of redemption amounts
 */
export async function calculateRepaymentBreakdown(voucherId: string): Promise<{
  voucherAmount: number;
  activeLoanId?: string;
  loanBalance?: number;
  deductionAmount: number;
  netToWallet: number;
  willFullyRepay: boolean;
}> {
  try {
    const authToken = await getSecureItem('buffr_access_token');
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/v1/mobile/vouchers/${voucherId}/calculate-repayment`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to calculate breakdown: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to calculate repayment breakdown:', error);
    throw error;
  }
}

/**
 * Enable/disable automatic loan repayment from vouchers.
 * 
 * @param loanId - Loan ID
 * @param enabled - Enable or disable auto-repayment
 */
export async function setAutoRepayment(loanId: string, enabled: boolean): Promise<void> {
  try {
    const authToken = await getSecureItem('buffr_access_token');
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/v1/mobile/loans/${loanId}/auto-repayment`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        enabled
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update auto-repayment: ${response.status}`);
    }

    console.log(`Auto-repayment ${enabled ? 'enabled' : 'disabled'} for loan ${loanId}`);
  } catch (error) {
    console.error('Failed to set auto-repayment:', error);
    throw error;
  }
}

/**
 * Get repayment history for a loan.
 * 
 * @param loanId - Loan ID
 * @returns Array of repayment transactions
 */
export async function getRepaymentHistory(loanId: string): Promise<RepaymentTransaction[]> {
  try {
    const authToken = await getSecureItem('buffr_access_token');
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/v1/mobile/loans/${loanId}/repayments`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch repayment history: ${response.status}`);
    }

    const data = await response.json();
    return data.repayments;
  } catch (error) {
    console.error('Failed to get repayment history:', error);
    throw error;
  }
}
