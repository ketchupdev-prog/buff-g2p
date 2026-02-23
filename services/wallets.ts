/**
 * Wallets service – Buffr G2P.
 * Fetches and manages user wallets. Uses API when EXPO_PUBLIC_API_BASE_URL is set;
 * falls back to AsyncStorage-persisted local wallets.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const STORAGE_KEY_WALLETS = 'buffr_wallets';

export interface Wallet {
  id: string;
  name: string;
  type: 'main' | 'savings' | 'grant';
  balance: number;
  currency: 'NAD';
  /** Optional card design frame ID (2–32) from assets/images/card-designs; used to represent this wallet with user context. */
  cardDesignFrameId?: number;
  /** When set, this wallet is a savings goal; progress = balance towards 100% of targetAmount. */
  targetAmount?: number;
  /** User-chosen emoji from keyboard (device input); shown on wallet card when set. */
  icon?: string;
  createdAt?: string;
}

async function getAuthHeader(): Promise<{ Authorization: string } | Record<string, never>> {
  try {
    const token = await AsyncStorage.getItem('buffr_access_token');
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
      console.error('getWallets API error:', e);
    }
  }
  // Fallback: read from AsyncStorage
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_WALLETS);
    if (stored) return JSON.parse(stored) as Wallet[];
  } catch (e) {
    console.error('getWallets storage error:', e);
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
        return ('wallet' in data ? data.wallet : data) ?? null;
      }
    } catch (e) {
      console.error('getWallet API error:', e);
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
  icon?: string
): Promise<{ success: boolean; wallet?: Wallet; error?: string }> {
  if (API_BASE_URL) {
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/wallets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ name, type, cardDesignFrameId, targetAmount, icon }),
      });
      const data = (await res.json()) as { wallet?: Wallet; error?: string };
      if (res.ok) return { success: true, wallet: data.wallet };
      return { success: false, error: data.error ?? 'Failed to create wallet' };
    } catch (e) {
      console.error('createWallet API error:', e);
      return { success: false, error: 'Network error' };
    }
  }
  // Fallback: store locally
  try {
    const wallets = await getWallets();
    const newWallet: Wallet = {
      id: `wallet_${Date.now()}`,
      name,
      type,
      balance: 0,
      currency: 'NAD',
      ...(cardDesignFrameId != null && { cardDesignFrameId }),
      ...(targetAmount != null && targetAmount > 0 && { targetAmount }),
      ...(icon != null && icon.trim() !== '' && { icon: icon.trim() }),
      createdAt: new Date().toISOString(),
    };
    wallets.push(newWallet);
    await AsyncStorage.setItem(STORAGE_KEY_WALLETS, JSON.stringify(wallets));
    return { success: true, wallet: newWallet };
  } catch (e) {
    console.error('createWallet storage error:', e);
    return { success: false, error: 'Failed to save wallet' };
  }
}

export async function addMoneyToWallet(
  walletId: string,
  amount: number,
  method: 'bank_transfer' | 'debit_card' | 'voucher'
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
    console.error('addMoneyToWallet error:', e);
    return { success: false, error: 'Network error' };
  }
}
