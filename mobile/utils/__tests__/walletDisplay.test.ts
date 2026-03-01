/**
 * Unit tests for walletDisplay – Buffr G2P.
 */
import { getWalletIcon, getWalletProgress, type WalletProgress } from '../walletDisplay';
import type { Wallet } from '@/services/wallets';

describe('walletDisplay', () => {
  const baseWallet: Wallet = {
    id: 'w1',
    name: 'Main',
    type: 'main',
    balance: 100,
    currency: 'NAD',
    icon: undefined,
    targetAmount: undefined,
  };

  describe('getWalletIcon', () => {
    it('returns user icon when set', () => {
      expect(getWalletIcon({ ...baseWallet, icon: '🦁' })).toBe('🦁');
      expect(getWalletIcon({ ...baseWallet, icon: ' custom ' })).toBe('custom');
    });

    it('returns fallback by type when icon empty', () => {
      expect(getWalletIcon({ ...baseWallet, type: 'main' })).toBe('📊');
      expect(getWalletIcon({ ...baseWallet, type: 'savings' })).toBe('💰');
      expect(getWalletIcon({ ...baseWallet, type: 'grant' })).toBe('🎁');
    });

    it('returns default when type unknown', () => {
      expect(getWalletIcon({ ...baseWallet, type: 'other' as Wallet['type'] })).toBe('💳');
    });
  });

  describe('getWalletProgress', () => {
    it('returns null when no targetAmount', () => {
      expect(getWalletProgress(baseWallet)).toBeNull();
      expect(getWalletProgress({ ...baseWallet, targetAmount: 0 })).toBeNull();
    });

    it('returns progress when targetAmount set', () => {
      const w: Wallet = { ...baseWallet, balance: 50, targetAmount: 100 };
      const p = getWalletProgress(w) as WalletProgress;
      expect(p.percent).toBe(50);
      expect(p.label).toBe('3/5');
    });

    it('caps percent at 100', () => {
      const w: Wallet = { ...baseWallet, balance: 200, targetAmount: 100 };
      const p = getWalletProgress(w) as WalletProgress;
      expect(p.percent).toBe(100);
    });
  });
});
