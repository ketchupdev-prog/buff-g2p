/**
 * Seed / demo data for Buffr G2P.
 * Single source of truth: seed-data/demo.json. This module uses seed-data/adapt.ts
 * to resolve dates and write to AsyncStorage when EXPO_PUBLIC_API_BASE_URL is not set.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SEED_WALLETS,
  SEED_TRANSACTIONS,
  SEED_VOUCHERS,
  SEED_CONTACTS,
  SEED_LOAN_OFFER,
  SEED_ACTIVE_LOANS,
  SEED_GROUPS,
} from '@/seed-data/adapt';

const SEED_DONE_KEY = 'buffr_seed_done_v1';

// Re-export types and constants for consumers (loans, contacts, etc.)
export type DemoLoanOffer = {
  id: string;
  maxAmount: number;
  interestRate: number;
  previousVoucherAmount: number;
  repaymentInfo: string;
};
export type DemoActiveLoan = {
  id: string;
  amount: number;
  interestAmount: number;
  totalRepayable: number;
  disbursedAt: string;
  status: 'active' | 'repaid' | 'overdue';
  repaymentDue: string;
};
export type DemoContact = { id: string; name: string; phone: string; avatarUrl?: string };

export { SEED_WALLETS, SEED_TRANSACTIONS, SEED_VOUCHERS, SEED_CONTACTS, SEED_LOAN_OFFER, SEED_ACTIVE_LOANS };

export async function seedDemoDataIfNeeded(): Promise<void> {
  try {
    const done = await AsyncStorage.getItem(SEED_DONE_KEY);
    if (done) return;

    await Promise.all([
      AsyncStorage.setItem('buffr_wallets', JSON.stringify(SEED_WALLETS)),
      AsyncStorage.setItem('buffr_transactions', JSON.stringify(SEED_TRANSACTIONS)),
      AsyncStorage.setItem('buffr_vouchers', JSON.stringify(SEED_VOUCHERS)),
      AsyncStorage.setItem('buffr_contacts', JSON.stringify(SEED_CONTACTS)),
      AsyncStorage.setItem('buffr_loan_offer', JSON.stringify(SEED_LOAN_OFFER)),
      AsyncStorage.setItem('buffr_active_loans', JSON.stringify(SEED_ACTIVE_LOANS)),
      AsyncStorage.setItem('buffr_groups', JSON.stringify(SEED_GROUPS)),
    ]);
    await AsyncStorage.setItem(SEED_DONE_KEY, '1');
  } catch (e) {
    console.warn('seedDemoData error:', e);
  }
}
