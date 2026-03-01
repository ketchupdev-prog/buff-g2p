/**
 * Wallets service – Buffr G2P.
 * Fetches and manages user wallets. Uses API when EXPO_PUBLIC_API_BASE_URL is set;
 * falls back to AsyncStorage-persisted local wallets.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRIMARY_WALLET_CARD_FRAME_ID } from '@/constants/CardDesign';
import { getSecureItem } from '@/services/secureStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const STORAGE_KEY_WALLETS = 'buffr_wallets';

export interface Wallet {
  id: string;
  name: string;
  type: 'main' | 'savings' | 'grant';
  balance: number;
  currency: 'NAD';
  /** True for the primary Buffr Account created at onboarding. */
  isPrimary?: boolean;
  /** Card design frame ID (2–32) from assets/images/card-designs. */
  cardDesignFrameId?: number;
  /** Savings goal target; progress = balance / targetAmount. */
  targetAmount?: number;
  /** User-chosen emoji shown on wallet card. */
  icon?: string;
  /** Linked bank/card references (display only; actual linking managed by backend). */
  linkedCards?: Array<{ id: string; label: string; last4: string; brand: string }>;
  createdAt?: string;
}

async function getAuthHeader(): Promise<{ Authorization: string } | Record<string, never>> {
  try {
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function getWallets(): Promise<Wallet[]> {
  if (API_BASE_URL) {
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/wallets`, {
        headers: { 'Content-Type': 'application/json', ...authHeader },
      });
      if (res.ok) {
        const data = (await res.json()) as { wallets?: Wallet[]; data?: Wallet[] };
        return data.wallets ?? data.data ?? [];
      }
    } catch (e) {
      if (__DEV__) { console.error('getWallets API error:', e); } // SEC-S10
    }
  }
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_WALLETS);
    if (stored) return JSON.parse(stored) as Wallet[];
  } catch (e) {
    if (__DEV__) { console.error('getWallets storage error:', e); } // SEC-S10
  }
  return [];
}

export async function getWallet(id: string): Promise<Wallet | null> {
  if (API_BASE_URL) {
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/wallets/${id}`, {
        headers: { 'Content-Type': 'application/json', ...authHeader },
      });
      if (res.ok) {
        const data = (await res.json()) as { wallet?: Wallet } | Wallet;
        if (data && typeof data === 'object' && 'wallet' in data) return (data as { wallet?: Wallet }).wallet ?? null;
        return (data as Wallet) ?? null;
      }
    } catch (e) {
      if (__DEV__) { console.error('getWallet API error:', e); } // SEC-S10
    }
  }
  const wallets = await getWallets();
  return wallets.find((w) => w.id === id) ?? null;
}

export async function createWallet(
  name: string,
  type: Wallet['type'],
  cardDesignFrameId?: number,
  targetAmount?: number,
  icon?: string,
  isPrimary?: boolean,
): Promise<{ success: boolean; wallet?: Wallet; error?: string }> {
  if (API_BASE_URL) {
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/wallets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ name, type, cardDesignFrameId, targetAmount, icon, isPrimary }),
      });
      const data = (await res.json()) as { wallet?: Wallet; error?: string };
      if (res.ok) return { success: true, wallet: data.wallet };
      return { success: false, error: data.error ?? 'Failed to create wallet' };
    } catch (e) {
      if (__DEV__) { console.error('createWallet API error:', e); } // SEC-S10
      return { success: false, error: 'Network error' };
    }
  }
  try {
    const wallets = await getWallets();
    const newWallet: Wallet = {
      id: `wallet_${Date.now()}`,
      name,
      type,
      balance: 0,
      currency: 'NAD',
      ...(isPrimary && { isPrimary: true }),
      ...(cardDesignFrameId != null && { cardDesignFrameId }),
      ...(targetAmount != null && targetAmount > 0 && { targetAmount }),
      ...(icon != null && icon.trim() !== '' && { icon: icon.trim() }),
      createdAt: new Date().toISOString(),
    };
    wallets.push(newWallet);
    await AsyncStorage.setItem(STORAGE_KEY_WALLETS, JSON.stringify(wallets));
    return { success: true, wallet: newWallet };
  } catch (e) {
    if (__DEV__) { console.error('createWallet storage error:', e); } // SEC-S10
    return { success: false, error: 'Failed to save wallet' };
  }
}

/**
 * Called once at onboarding completion.
 * Creates the Buffr Account (primary wallet) if it doesn't already exist.
 * Uses PRIMARY_WALLET_CARD_FRAME_ID (frame 10, deep blue) by default.
 */
export async function ensurePrimaryWallet(
  frameId: number = PRIMARY_WALLET_CARD_FRAME_ID,
): Promise<void> {
  try {
    const wallets = await getWallets();
    const hasPrimary = wallets.some((w) => w.isPrimary || w.type === 'main');
    if (hasPrimary) return;
    await createWallet('Buffr Account', 'main', frameId, undefined, undefined, true);
  } catch (e) {
    if (__DEV__) { console.error('ensurePrimaryWallet error:', e); } // SEC-S10
  }
}

/**
 * Update wallet (name, icon, targetAmount, cardDesignFrameId).
 * API: PATCH /api/v1/mobile/wallets/:id; local: merge and persist.
 */
export async function updateWallet(
  id: string,
  updates: Partial<Pick<Wallet, 'name' | 'icon' | 'targetAmount' | 'cardDesignFrameId'>>,
): Promise<{ success: boolean; wallet?: Wallet; error?: string }> {
  if (API_BASE_URL) {
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/wallets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(updates),
      });
      const data = (await res.json()) as { wallet?: Wallet; error?: string };
      if (res.ok) return { success: true, wallet: data.wallet };
      return { success: false, error: data.error ?? 'Failed to update wallet' };
    } catch (e) {
      if (__DEV__) { console.error('updateWallet API error:', e); } // SEC-S10
      return { success: false, error: 'Network error' };
    }
  }
  try {
    const wallets = await getWallets();
    const idx = wallets.findIndex((w) => w.id === id);
    if (idx < 0) return { success: false, error: 'Wallet not found' };
    const next = { ...wallets[idx], ...updates };
    wallets[idx] = next;
    await AsyncStorage.setItem(STORAGE_KEY_WALLETS, JSON.stringify(wallets));
    return { success: true, wallet: next };
  } catch (e) {
    if (__DEV__) { console.error('updateWallet storage error:', e); } // SEC-S10
    return { success: false, error: 'Failed to save' };
  }
}

/**
 * Delete wallet (non-primary only). API: DELETE /api/v1/mobile/wallets/:id; local: remove and persist.
 */
export async function deleteWallet(id: string): Promise<{ success: boolean; error?: string }> {
  if (API_BASE_URL) {
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/wallets/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeader },
      });
      if (res.ok) return { success: true };
      const data = (await res.json()) as { error?: string };
      return { success: false, error: data.error ?? 'Failed to delete wallet' };
    } catch (e) {
      if (__DEV__) { console.error('deleteWallet API error:', e); } // SEC-S10
      return { success: false, error: 'Network error' };
    }
  }
  try {
    const wallets = await getWallets();
    const w = wallets.find((x) => x.id === id);
    if (!w) return { success: false, error: 'Wallet not found' };
    if (w.isPrimary || w.type === 'main') return { success: false, error: 'Cannot delete primary wallet' };
    const next = wallets.filter((x) => x.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY_WALLETS, JSON.stringify(next));
    return { success: true };
  } catch (e) {
    if (__DEV__) { console.error('deleteWallet storage error:', e); } // SEC-S10
    return { success: false, error: 'Failed to delete wallet' };
  }
}

export async function addMoneyToWallet(
  walletId: string,
  amount: number,
  method: 'bank_transfer' | 'debit_card' | 'voucher',
): Promise<{ success: boolean; error?: string }> {
  if (!API_BASE_URL) return { success: false, error: 'Backend not configured' };
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/api/v1/mobile/wallets/${walletId}/add-money`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ amount, method }),
    });
    const data = (await res.json()) as { error?: string };
    if (res.ok) return { success: true };
    return { success: false, error: data.error ?? 'Failed to add money' };
  } catch (e) {
    if (__DEV__) { console.error('addMoneyToWallet error:', e); } // SEC-S10
    return { success: false, error: 'Network error' };
  }
}
