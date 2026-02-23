/**
 * Transactions service – Buffr G2P.
 * Fetches transaction history and details from API.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export type TransactionType =
  | 'voucher_redeem'
  | 'send'
  | 'receive'
  | 'cash_out'
  | 'bill_pay'
  | 'airtime'
  | 'loan_disbursement'
  | 'loan_repayment'
  | 'add_money';

export type TransactionStatus = 'success' | 'pending' | 'failed';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: 'NAD';
  description: string;
  status: TransactionStatus;
  createdAt: string; // ISO date
  counterparty?: string; // Name or phone of sender/receiver
  walletId?: string;
  reference?: string;
  fee?: number;
}

async function getAuthHeader(): Promise<{ Authorization: string } | Record<string, never>> {
  try {
    const token = await AsyncStorage.getItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function getTransactions(params?: {
  walletId?: string;
  type?: TransactionType;
  limit?: number;
  offset?: number;
}): Promise<Transaction[]> {
  if (API_BASE_URL) {
    try {
      const authHeader = await getAuthHeader();
      const query = new URLSearchParams();
      if (params?.walletId) query.set('walletId', params.walletId);
      if (params?.type) query.set('type', params.type);
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.offset) query.set('offset', String(params.offset));
      const qs = query.toString();
      const url = `${API_BASE_URL}/api/v1/mobile/transactions${qs ? `?${qs}` : ''}`;
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...authHeader },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          transactions?: Transaction[];
          data?: Transaction[];
        };
        return data.transactions ?? data.data ?? [];
      }
    } catch (e) {
      console.error('getTransactions API error:', e);
    }
  }
  // Fallback: read from AsyncStorage (populated by seedData on first launch)
  try {
    const stored = await AsyncStorage.getItem('buffr_transactions');
    if (stored) {
      let txs = JSON.parse(stored) as Transaction[];
      if (params?.walletId) txs = txs.filter((t) => t.walletId === params.walletId);
      if (params?.type) txs = txs.filter((t) => t.type === params.type);
      if (params?.offset) txs = txs.slice(params.offset);
      if (params?.limit) txs = txs.slice(0, params.limit);
      return txs;
    }
  } catch (e) {
    console.error('getTransactions storage error:', e);
  }
  return [];
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  if (API_BASE_URL) {
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/transactions/${id}`, {
        headers: { 'Content-Type': 'application/json', ...authHeader },
      });
      if (res.ok) {
        const data = (await res.json()) as { transaction?: Transaction } | Transaction;
        return ('transaction' in data ? data.transaction : data) ?? null;
      }
    } catch (e) {
      console.error('getTransaction API error:', e);
    }
  }
  // Fallback: find in AsyncStorage
  try {
    const stored = await AsyncStorage.getItem('buffr_transactions');
    if (stored) {
      const txs = JSON.parse(stored) as Transaction[];
      return txs.find((t) => t.id === id) ?? null;
    }
  } catch { /* ignore */ }
  return null;
}

/** Format transaction type for display */
export function formatTransactionType(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    voucher_redeem: 'Voucher Redeemed',
    send: 'Money Sent',
    receive: 'Money Received',
    cash_out: 'Cash Out',
    bill_pay: 'Bill Payment',
    airtime: 'Airtime',
    loan_disbursement: 'Loan Received',
    loan_repayment: 'Loan Repayment',
    add_money: 'Money Added',
  };
  return labels[type] ?? type;
}

/** Icon name for transaction type (Ionicons) */
export function transactionIcon(type: TransactionType): string {
  const icons: Record<TransactionType, string> = {
    voucher_redeem: 'ticket',
    send: 'arrow-up-circle',
    receive: 'arrow-down-circle',
    cash_out: 'cash',
    bill_pay: 'receipt',
    airtime: 'phone-portrait',
    loan_disbursement: 'trending-up',
    loan_repayment: 'trending-down',
    add_money: 'add-circle',
  };
  return icons[type] ?? 'swap-horizontal';
}

/** Format amount with sign for display */
export function formatTransactionAmount(tx: Transaction): string {
  const sign = tx.type === 'send' || tx.type === 'cash_out' || tx.type === 'bill_pay' || tx.type === 'airtime' || tx.type === 'loan_repayment' ? '-' : '+';
  return `${sign}N$ ${tx.amount.toFixed(2)}`;
}
