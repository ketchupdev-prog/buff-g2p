/**
 * Wallet display utilities – Buffr G2P.
 * Shared logic for wallet icon and progress (e.g. goal wallets) used by
 * WalletCard, home carousel, and wallet list/detail screens.
 * Location: utils/walletDisplay.ts
 */
import type { Wallet } from '@/services/wallets';

const WALLET_EMOJI_BY_TYPE: Record<string, string> = {
  main: '📊',
  savings: '💰',
  grant: '🎁',
};

/** Icon/emoji for a wallet: user-chosen from keyboard (wallet.icon) when set; otherwise fallback by type. */
export function getWalletIcon(wallet: Wallet): string {
  if (wallet.icon != null && String(wallet.icon).trim() !== '') return String(wallet.icon).trim();
  return WALLET_EMOJI_BY_TYPE[wallet.type] ?? '💳';
}

/** Progress towards 100% when user creates a savings goal (targetAmount set). Funds going in = balance; progress = balance / targetAmount. */
export interface WalletProgress {
  /** 0–100, capped at 100. */
  percent: number;
  /** Step label e.g. "4/5" (5 steps towards 100%). */
  label: string;
}

const PROGRESS_STEPS = 5;

export function getWalletProgress(wallet: Wallet): WalletProgress | null {
  const target = wallet.targetAmount;
  if (target == null || target <= 0) return null;
  const percent = Math.min(100, (wallet.balance / target) * 100);
  const step = Math.min(PROGRESS_STEPS, Math.ceil((percent / 100) * PROGRESS_STEPS));
  const label = `${step}/${PROGRESS_STEPS}`;
  return { percent, label };
}
