/**
 * Wallet Display Utilities
 * 
 * Helper functions for displaying wallet information
 */

import type { Wallet } from '@/services/wallets';

export interface WalletProgress {
  current: number;
  goal: number;
  percent: number;
  remaining: number;
}

/**
 * Get wallet icon name based on wallet type or custom icon
 */
export function getWalletIcon(wallet: Wallet): string {
  if (wallet.icon) return wallet.icon;
  
  switch (wallet.type) {
    case 'savings':
      return 'wallet-outline';
    case 'main':
      return 'card-outline';
    case 'bills':
      return 'receipt-outline';
    case 'emergency':
      return 'shield-checkmark-outline';
    case 'travel':
      return 'airplane-outline';
    case 'shopping':
      return 'cart-outline';
    case 'custom':
    default:
      return 'card-outline';
  }
}

/**
 * Get wallet progress (for savings/emergency wallets with goals)
 */
export function getWalletProgress(wallet: Wallet): WalletProgress | null {
  if (!wallet.goalAmount) return null;
  if (wallet.type !== 'savings' && wallet.type !== 'emergency' && wallet.type !== 'custom') return null;
  
  const current = wallet.balance;
  const goal = wallet.goalAmount;
  const percent = Math.min((current / goal) * 100, 100);
  const remaining = Math.max(goal - current, 0);
  
  return {
    current,
    goal,
    percent,
    remaining,
  };
}

/**
 * Format wallet balance with currency
 */
export function formatWalletBalance(
  balance: number,
  currency: string = 'NAD',
  includeSymbol: boolean = true
): string {
  const symbol = includeSymbol ? 'N$' : '';
  const formatted = balance.toLocaleString('en-NA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`.trim();
}

/**
 * Get wallet type label
 */
export function getWalletTypeLabel(type?: Wallet['type']): string {
  switch (type) {
    case 'main':
      return 'Main';
    case 'savings':
      return 'Savings';
    case 'bills':
      return 'Bills';
    case 'emergency':
      return 'Emergency';
    case 'travel':
      return 'Travel';
    case 'shopping':
      return 'Shopping';
    case 'custom':
      return 'Custom';
    default:
      return 'Standard';
  }
}

/**
 * Validate wallet name
 */
export function validateWalletName(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Wallet name is required' };
  }
  
  if (name.length < 2) {
    return { valid: false, error: 'Wallet name must be at least 2 characters' };
  }
  
  if (name.length > 30) {
    return { valid: false, error: 'Wallet name must be less than 30 characters' };
  }
  
  return { valid: true };
}

/**
 * Calculate total balance across all wallets
 */
export function calculateTotalBalance(wallets: Wallet[]): number {
  return wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
}

/**
 * Get primary wallet (first wallet or marked as primary)
 */
export function getPrimaryWallet(wallets: Wallet[]): Wallet | null {
  const primary = wallets.find((w) => w.isPrimary);
  if (primary) return primary;
  
  return wallets.length > 0 ? wallets[0] : null;
}

/**
 * Sort wallets by priority (primary first, then by balance)
 */
export function sortWallets(wallets: Wallet[]): Wallet[] {
  return [...wallets].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return b.balance - a.balance;
  });
}
