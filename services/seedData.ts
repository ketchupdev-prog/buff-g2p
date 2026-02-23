/**
 * Seed / demo data for Buffr G2P.
 * Used when EXPO_PUBLIC_API_BASE_URL is not set and AsyncStorage is empty.
 * Gives the app a realistic demo state on first launch without a backend.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Wallet } from './wallets';
import type { Transaction } from './transactions';
import type { Voucher } from './vouchers';

const SEED_DONE_KEY = 'buffr_seed_done_v1';

// ── Demo wallets ──────────────────────────────────────────────────────────────
const SEED_WALLETS: Wallet[] = [
  {
    id: 'w_main_001',
    name: 'Buffr Account',
    type: 'main',
    isPrimary: true,
    balance: 1_250.00,
    currency: 'NAD',
    cardDesignFrameId: 10,   // deep blue – primary account
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'w_grant_001',
    name: 'Grant Wallet',
    type: 'grant',
    balance: 3_800.00,
    currency: 'NAD',
    cardDesignFrameId: 15,   // gold – government grant
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'w_sav_001',
    name: 'Savings',
    type: 'savings',
    balance: 450.00,
    currency: 'NAD',
    cardDesignFrameId: 2,    // purple – personal savings
    targetAmount: 2_000,
    createdAt: '2026-02-01T08:00:00Z',
  },
];

// ── Demo transactions ─────────────────────────────────────────────────────────
const now = new Date();
function daysAgo(d: number): string {
  const dt = new Date(now);
  dt.setDate(dt.getDate() - d);
  return dt.toISOString();
}

const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_001',
    type: 'voucher_redeem',
    amount: 3_800.00,
    currency: 'NAD',
    description: 'Old Age Pension – Feb 2026',
    status: 'success',
    createdAt: daysAgo(0),
    walletId: 'w_grant_001',
    reference: 'GRN-2026-0215-001',
  },
  {
    id: 'tx_002',
    type: 'send',
    amount: 200.00,
    currency: 'NAD',
    description: 'School fees',
    status: 'success',
    createdAt: daysAgo(1),
    counterparty: 'Maria Nakashona',
    walletId: 'w_main_001',
  },
  {
    id: 'tx_003',
    type: 'bill_pay',
    amount: 450.00,
    currency: 'NAD',
    description: 'NamPower Electricity – Feb',
    status: 'success',
    createdAt: daysAgo(2),
    counterparty: 'NamPower',
    walletId: 'w_main_001',
  },
  {
    id: 'tx_004',
    type: 'airtime',
    amount: 50.00,
    currency: 'NAD',
    description: 'MTC Airtime Top-Up',
    status: 'success',
    createdAt: daysAgo(3),
    counterparty: 'MTC Namibia',
    walletId: 'w_main_001',
  },
  {
    id: 'tx_005',
    type: 'receive',
    amount: 500.00,
    currency: 'NAD',
    description: 'Money received',
    status: 'success',
    createdAt: daysAgo(5),
    counterparty: 'Petrus Hamutenya',
    walletId: 'w_main_001',
  },
  {
    id: 'tx_006',
    type: 'cash_out',
    amount: 300.00,
    currency: 'NAD',
    description: 'Cash out at NamPost',
    status: 'success',
    createdAt: daysAgo(7),
    counterparty: 'NamPost Katutura',
    walletId: 'w_main_001',
    fee: 15.00,
  },
  {
    id: 'tx_007',
    type: 'add_money',
    amount: 1_000.00,
    currency: 'NAD',
    description: 'Bank transfer in',
    status: 'success',
    createdAt: daysAgo(10),
    counterparty: 'FNB Namibia',
    walletId: 'w_main_001',
  },
  {
    id: 'tx_008',
    type: 'voucher_redeem',
    amount: 3_500.00,
    currency: 'NAD',
    description: 'Old Age Pension – Jan 2026',
    status: 'success',
    createdAt: daysAgo(45),
    walletId: 'w_grant_001',
    reference: 'GRN-2026-0115-001',
  },
];

// ── Demo vouchers ─────────────────────────────────────────────────────────────
const SEED_VOUCHERS: Voucher[] = [
  {
    id: 'v_001',
    amount: 3_800.00,
    currency: 'NAD',
    status: 'available',
    programme: 'Old Age Pension',
    issuedAt: daysAgo(5),
    expiresAt: new Date(now.getFullYear(), now.getMonth() + 2, 1).toISOString(),
    reference: 'GRN-2026-0215-001',
  },
  {
    id: 'v_002',
    amount: 1_200.00,
    currency: 'NAD',
    status: 'available',
    programme: 'Child Grant',
    issuedAt: daysAgo(3),
    expiresAt: new Date(now.getFullYear(), now.getMonth() + 2, 15).toISOString(),
    reference: 'GRN-2026-0212-002',
  },
  {
    id: 'v_003',
    amount: 3_500.00,
    currency: 'NAD',
    status: 'redeemed',
    programme: 'Old Age Pension',
    issuedAt: daysAgo(50),
    expiresAt: daysAgo(20),
    redeemedAt: daysAgo(45),
    redeemedMethod: 'wallet',
    reference: 'GRN-2026-0115-001',
  },
  {
    id: 'v_004',
    amount: 900.00,
    currency: 'NAD',
    status: 'expired',
    programme: 'Disability Grant',
    issuedAt: daysAgo(120),
    expiresAt: daysAgo(60),
    reference: 'GRN-2025-1015-003',
  },
];

// ── Demo contacts ─────────────────────────────────────────────────────────────
export interface DemoContact {
  id: string;
  name: string;
  phone: string;
  avatarUrl?: string;
}

export const SEED_CONTACTS: DemoContact[] = [
  { id: 'c1', name: 'Maria Nakashona', phone: '+264811234567' },
  { id: 'c2', name: 'Petrus Hamutenya', phone: '+264817654321' },
  { id: 'c3', name: 'Anna Nghilifa', phone: '+264819876543' },
  { id: 'c4', name: 'Johannes Kaulinge', phone: '+264812345678' },
  { id: 'c5', name: 'Selma Nghifikepunye', phone: '+264813456789' },
  { id: 'c6', name: 'Thomas Shipanga', phone: '+264814567890' },
  { id: 'c7', name: 'Hilma Nghipangelwa', phone: '+264815678901' },
  { id: 'c8', name: 'Erastus Uutoni', phone: '+264816789012' },
];

// ── Seed function ─────────────────────────────────────────────────────────────
export async function seedDemoDataIfNeeded(): Promise<void> {
  try {
    // Only seed once per install
    const done = await AsyncStorage.getItem(SEED_DONE_KEY);
    if (done) return;

    await Promise.all([
      AsyncStorage.setItem('buffr_wallets', JSON.stringify(SEED_WALLETS)),
      AsyncStorage.setItem('buffr_transactions', JSON.stringify(SEED_TRANSACTIONS)),
      AsyncStorage.setItem('buffr_vouchers', JSON.stringify(SEED_VOUCHERS)),
      AsyncStorage.setItem('buffr_contacts', JSON.stringify(SEED_CONTACTS)),
    ]);
    await AsyncStorage.setItem(SEED_DONE_KEY, '1');
  } catch (e) {
    console.warn('seedDemoData error:', e);
  }
}

export { SEED_WALLETS, SEED_TRANSACTIONS, SEED_VOUCHERS };
