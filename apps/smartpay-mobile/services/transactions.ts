/**
 * Transactions Service - SmartPay Mobile
 * Handles transaction history and details
 * Location: mobile/services/transactions.ts
 */

import { api } from './api';
import {
  Transaction,
  TransactionsResponse,
  TransactionType,
  TransactionSummary,
  TransactionSummaryResponse,
} from '../types/api';

export { Transaction, TransactionType, type TransactionSummary };

/**
 * Get transactions for authenticated user
 * GET /api/v1/transactions
 */
export async function getTransactions(options?: {
  limit?: number;
  offset?: number;
  walletId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Transaction[]> {
  try {
    const params: Record<string, unknown> = {};
    
    if (options?.limit) params.limit = options.limit;
    if (options?.offset) params.offset = options.offset;
    if (options?.walletId) params.walletId = options.walletId;
    if (options?.startDate) params.startDate = options.startDate;
    if (options?.endDate) params.endDate = options.endDate;

    const response = await api.get<TransactionsResponse>(
      '/api/v1/transactions',
      { params, retry: true }
    );

    // Backend returns { transactions: [...] }
    return response.transactions || [];
  } catch (error) {
    console.error('getTransactions error:', error);
    // No mock fallback: backend unavailability should result in empty/error UI.
    throw error;
  }
}

/**
 * Aggregated transaction stats for the authenticated user.
 * GET /api/v1/transactions/summary
 *
 * Backend uses a fixed rolling window (currently 30 days); query params are ignored if sent.
 */
export async function getTransactionSummary(): Promise<TransactionSummary> {
  const response = await api.get<TransactionSummaryResponse>('/api/v1/transactions/summary', {
    retry: true,
  });
  if (!response?.summary) {
    throw new Error('Invalid transaction summary response');
  }
  return response.summary;
}

/**
 * Get single transaction by ID
 * GET /api/v1/transactions/:id
 */
export async function getTransactionById(id: string): Promise<Transaction | null> {
  try {
    const response = await api.get<{ transaction: Transaction }>(
      `/api/v1/transactions/${id}`
    );

    return response.transaction;
  } catch (error) {
    console.error('getTransactionById error:', error);
    // No mock fallback: treat as missing/unavailable.
    return null;
  }
}

/**
 * Format transaction type for display.
 */
export function formatTransactionType(type: TransactionType): string {
  const typeMap: Partial<Record<TransactionType, string>> = {
    send: 'Sent',
    receive: 'Received',
    cashout: 'Cash Out',
    cashin: 'Cash In',
    bill_payment: 'Bill Payment',
    airtime: 'Airtime',
    voucher: 'Voucher',
    voucher_redeem: 'Voucher Redeemed',
    loan_payment: 'Loan Payment',
    add_money: 'Money Added',
    loan_disbursement: 'Loan Received',
    p2p_transfer: 'Transfer',
    cashout_bank: 'Cash Out - Bank',
    cashout_till: 'Cash Out - Till',
    cashout_agent: 'Cash Out - Agent',
    cashout_merchant: 'Cash Out - Merchant',
    cashout_atm: 'Cash Out - ATM',
    voucher_redemption: 'Voucher Redeemed',
    loan_repayment: 'Loan Payment',
    split_payment: 'Split Payment',
    group_contribution: 'Group Contribution',
    group_withdrawal: 'Group Withdrawal',
  };
  return typeMap[type] || type;
}

/**
 * Format transaction amount with sign prefix.
 */
export function formatTransactionAmount(transaction: Transaction): string {
  const isPositive = ['receive', 'voucher_redeem', 'add_money', 'loan_disbursement'].includes(transaction.type);
  const sign = isPositive ? '+' : '';
  return `${sign}N$${transaction.amount.toFixed(2)}`;
}

/**
 * Get icon name for transaction type.
 */
export function transactionIcon(type: TransactionType): string {
  const iconMap: Partial<Record<TransactionType, string>> = {
    send: 'arrow-up-outline',
    receive: 'arrow-down-outline',
    cashout: 'cash-outline',
    cashin: 'wallet-outline',
    bill_payment: 'document-text-outline',
    airtime: 'phone-portrait-outline',
    voucher: 'gift-outline',
    voucher_redeem: 'gift-outline',
    loan_payment: 'card-outline',
    add_money: 'add-circle-outline',
    loan_disbursement: 'business-outline',
    p2p_transfer: 'arrow-forward-outline',
    cashout_bank: 'business-outline',
    cashout_till: 'storefront-outline',
    cashout_agent: 'person-outline',
    cashout_merchant: 'card-outline',
    cashout_atm: 'cash-outline',
    voucher_redemption: 'gift-outline',
    loan_repayment: 'card-outline',
    split_payment: 'people-outline',
    group_contribution: 'people-outline',
    group_withdrawal: 'arrow-down-outline',
  };
  return iconMap[type] || 'swap-horizontal-outline';
}
