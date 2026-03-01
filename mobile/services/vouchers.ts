/**
 * Vouchers service – Buffr G2P.
 * Manages G2P vouchers: list, detail, and 3 redemption methods.
 * API when EXPO_PUBLIC_API_BASE_URL is set; empty-state fallback otherwise.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSecureItem } from '@/services/secureStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export type VoucherStatus = 'available' | 'redeemed' | 'expired' | 'pending';
export type RedemptionMethod = 'wallet' | 'nampost' | 'smartpay';

export interface Voucher {
  id: string;
  amount: number;
  currency: 'NAD';
  status: VoucherStatus;
  programme: string; // e.g. "Old Age Pension", "Disability Grant"
  issuedAt: string; // ISO date
  expiresAt: string; // ISO date
  redeemedAt?: string;
  redeemedMethod?: RedemptionMethod;
  reference?: string; // Government reference
}

export interface NamPostBranch {
  id: string;
  name: string;
  address: string;
  distanceKm?: number;
}

export interface SmartPayUnit {
  id: string;
  name: string;
  location: string;
  distanceKm?: number;
}

async function getAuthHeader(): Promise<{ Authorization: string } | Record<string, never>> {
  try {
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function getVouchers(): Promise<Voucher[]> {
  if (API_BASE_URL) {
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/vouchers`, {
        headers: { 'Content-Type': 'application/json', ...authHeader },
      });
      if (res.ok) {
        const data = (await res.json()) as { vouchers?: Voucher[]; data?: Voucher[] };
        return data.vouchers ?? data.data ?? [];
      }
    } catch (e) {
      console.error('getVouchers API error:', e);
    }
  }
  // Fallback: read from AsyncStorage (populated by seedData on first launch)
  try {
    const stored = await AsyncStorage.getItem('buffr_vouchers');
    if (stored) return JSON.parse(stored) as Voucher[];
  } catch (e) {
    console.error('getVouchers storage error:', e);
  }
  return [];
}

export async function getVoucher(id: string): Promise<Voucher | null> {
  if (API_BASE_URL) {
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/vouchers/${id}`, {
        headers: { 'Content-Type': 'application/json', ...authHeader },
      });
      if (res.ok) {
        const data = (await res.json()) as { voucher?: Voucher } | Voucher;
        if (data && typeof data === 'object' && 'voucher' in data) return (data as { voucher?: Voucher }).voucher ?? null;
        return (data as Voucher) ?? null;
      }
    } catch (e) {
      console.error('getVoucher API error:', e);
    }
  }
  // Fallback: find in AsyncStorage
  try {
    const stored = await AsyncStorage.getItem('buffr_vouchers');
    if (stored) {
      const vouchers = JSON.parse(stored) as Voucher[];
      return vouchers.find((v) => v.id === id) ?? null;
    }
  } catch { /* ignore */ }
  return null;
}

/** Redeem voucher to Buffr wallet (method 1) */
export async function redeemToWallet(
  voucherId: string,
  pin?: string
): Promise<{ success: boolean; walletBalance?: number; error?: string }> {
  if (!API_BASE_URL) return { success: false, error: 'Backend not configured' };
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/api/v1/mobile/vouchers/${voucherId}/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ method: 'wallet', pin }),
    });
    const data = (await res.json()) as { walletBalance?: number; error?: string };
    if (res.ok) return { success: true, walletBalance: data.walletBalance };
    return { success: false, error: data.error ?? 'Redemption failed' };
  } catch (e) {
    console.error('redeemToWallet error:', e);
    return { success: false, error: 'Network error' };
  }
}

/** Get NamPost branches for voucher redemption (method 2) */
export async function getNamPostBranches(voucherId: string): Promise<NamPostBranch[]> {
  if (API_BASE_URL) {
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(
        `${API_BASE_URL}/api/v1/mobile/vouchers/${voucherId}/nampost-branches`,
        { headers: { 'Content-Type': 'application/json', ...authHeader } }
      );
      if (res.ok) {
        const data = (await res.json()) as { branches?: NamPostBranch[] };
        return data.branches ?? [];
      }
    } catch (e) {
      console.error('getNamPostBranches error:', e);
    }
  }
  return [];
}

/** Get SmartPay mobile units for voucher redemption (method 3) */
export async function getSmartPayUnits(voucherId: string): Promise<SmartPayUnit[]> {
  if (API_BASE_URL) {
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(
        `${API_BASE_URL}/api/v1/mobile/vouchers/${voucherId}/smartpay-units`,
        { headers: { 'Content-Type': 'application/json', ...authHeader } }
      );
      if (res.ok) {
        const data = (await res.json()) as { units?: SmartPayUnit[] };
        return data.units ?? [];
      }
    } catch (e) {
      console.error('getSmartPayUnits error:', e);
    }
  }
  return [];
}

/** Redeem voucher at NamPost/SmartPay branch (method 2/3). PRD §18.5. */
export async function redeemAtBranch(
  voucherId: string,
  pin: string,
  options?: { branchName?: string; qrPayload?: string }
): Promise<{ success: boolean; error?: string }> {
  if (!API_BASE_URL) return { success: false, error: 'Backend not configured' };
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/api/v1/mobile/vouchers/${voucherId}/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({
        method: 'nampost',
        pin,
        ...(options?.branchName && { branchName: options.branchName }),
        ...(options?.qrPayload && { qrPayload: options.qrPayload }),
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (res.ok) return { success: true };
    return { success: false, error: data.error ?? 'Redemption failed' };
  } catch (e) {
    console.error('redeemAtBranch error:', e);
    return { success: false, error: 'Network error' };
  }
}

/** Generate dynamic NAMQR for NamPost or SmartPay redemption (payee-presented) */
export async function generateRedemptionQR(
  voucherId: string,
  branchOrUnitId: string,
  method: 'nampost' | 'smartpay'
): Promise<{ qrPayload?: string; error?: string }> {
  if (!API_BASE_URL) return { error: 'Backend not configured' };
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/api/v1/mobile/qr/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ voucherId, branchOrUnitId, method }),
    });
    const data = (await res.json()) as { qrPayload?: string; error?: string };
    if (res.ok) return { qrPayload: data.qrPayload };
    return { error: data.error ?? 'QR generation failed' };
  } catch (e) {
    console.error('generateRedemptionQR error:', e);
    return { error: 'Network error' };
  }
}
