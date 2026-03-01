/**
 * Cash-out service – Buffr G2P.
 * 5 cash-out methods: bank, till, agent, merchant, ATM.
 * QR validation via Token Vault for Till/Agent/Merchant/ATM.
 */
import { getSecureItem } from '@/services/secureStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export type CashOutMethod = 'bank' | 'till' | 'agent' | 'merchant' | 'atm' | 'general';

export interface CashOutMethodInfo {
  id: CashOutMethod;
  label: string;
  subtitle: string;
  fee: string;
  time: string;
  icon: string; // Ionicons name
  requiresQRScan: boolean;
}

export const CASH_OUT_METHODS: CashOutMethodInfo[] = [
  {
    id: 'bank',
    label: 'Bank Transfer',
    subtitle: 'Transfer to your bank account',
    fee: 'N$5',
    time: '1-2 business days',
    icon: 'business',
    requiresQRScan: false,
  },
  {
    id: 'till',
    label: 'Cash at Till',
    subtitle: 'Scan till QR to get cash',
    fee: 'Free',
    time: 'Instant',
    icon: 'storefront',
    requiresQRScan: true,
  },
  {
    id: 'agent',
    label: 'Cash at Agent',
    subtitle: 'Visit a Buffr agent',
    fee: 'N$5',
    time: 'Instant',
    icon: 'person',
    requiresQRScan: true,
  },
  {
    id: 'merchant',
    label: 'Cash at Merchant',
    subtitle: 'Scan merchant QR',
    fee: 'N$3',
    time: 'Instant',
    icon: 'bag-handle',
    requiresQRScan: true,
  },
  {
    id: 'atm',
    label: 'Cash at ATM',
    subtitle: 'Scan ATM QR after entering amount',
    fee: 'N$8',
    time: 'Instant',
    icon: 'card',
    requiresQRScan: true,
  },
  {
    id: 'general',
    label: 'Cash Out',
    subtitle: 'General QR cash-out',
    fee: 'Free',
    time: 'Instant',
    icon: 'qr-code-outline',
    requiresQRScan: true,
  },
];

async function getAuthHeader(): Promise<{ Authorization: string } | Record<string, never>> {
  try {
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

// SEC-S2: PIN hashed with SHA-256 before transmission. Backend must verify hash.
// Uses Hermes built-in Web Crypto API (available in React Native 0.71+, no extra package needed).
async function hashPin(pin: string): Promise<string> {
  try {
    const enc = new TextEncoder();
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', enc.encode('buffr-pin:' + pin));
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback: return pin as-is (backend should handle both during migration)
    return pin;
  }
}

/** Validate a scanned NAMQR payload via Token Vault */
export async function validateQR(qrPayload: string): Promise<{
  valid: boolean;
  payeeName?: string;
  amount?: number;
  currency?: string;
  tokenRef?: string;
  error?: string;
}> {
  if (!API_BASE_URL) {
    return { valid: false, error: 'Backend not configured for QR validation' };
  }
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/api/v1/mobile/qr/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ qrPayload }),
    });
    const data = (await res.json()) as {
      valid?: boolean;
      payeeName?: string;
      amount?: number;
      currency?: string;
      tokenRef?: string;
      error?: string;
    };
    if (res.ok) return { valid: data.valid ?? true, ...data };
    return { valid: false, error: data.error ?? 'QR validation failed' };
  } catch (e) {
    console.error('validateQR error:', e);
    return { valid: false, error: 'Network error' };
  }
}

/** Execute cash-out after QR validation and 2FA */
export async function executeCashOut(params: {
  walletId: string;
  method: CashOutMethod;
  amount: number;
  qrPayload?: string;
  tokenRef?: string;
  pin?: string;
  bankAccountId?: string;
}): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  if (!API_BASE_URL) return { success: false, error: 'Backend not configured' };
  try {
    const authHeader = await getAuthHeader();
    // V11: Idempotency key prevents duplicate cash-outs on network retry.
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    // SEC-S2: Hash PIN before transmission; keep raw pin for backward compat during migration.
    const { pin, ...rest } = params;
    const body: Record<string, unknown> = { ...rest };
    if (pin !== undefined) {
      body.pin = pin;
      body.pin_hash = await hashPin(pin);
    }
    const res = await fetch(`${API_BASE_URL}/api/v1/mobile/wallets/${params.walletId}/cash-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey, ...authHeader },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { transactionId?: string; error?: string };
    if (res.ok) return { success: true, transactionId: data.transactionId };
    return { success: false, error: data.error ?? 'Cash-out failed' };
  } catch (e) {
    console.error('executeCashOut error:', e);
    return { success: false, error: 'Network error' };
  }
}

// TODO: Connect to backend ATM code generation endpoint
/** Request a one-time ATM withdrawal code from the server (S3). */
export async function getATMCode(params: {
  walletId: string;
  amount: number;
}): Promise<{ success: boolean; code?: string; error?: string }> {
  if (!API_BASE_URL) {
    return { success: false, error: 'ATM cash-out is temporarily unavailable. Please try a different method.' };
  }
  try {
    const authHeader = await getAuthHeader();
    // V11: Idempotency key prevents duplicate ATM code issuance on network retry.
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const res = await fetch(`${API_BASE_URL}/api/cashout/atm-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey, ...authHeader },
      body: JSON.stringify({ walletId: params.walletId, amount: params.amount }),
    });
    const data = (await res.json()) as { code?: string; error?: string };
    if (res.ok && data.code) return { success: true, code: data.code };
    return { success: false, error: data.error ?? 'ATM cash-out is temporarily unavailable. Please try a different method.' };
  } catch (e) {
    console.error('getATMCode error:', e);
    return { success: false, error: 'ATM cash-out is temporarily unavailable. Please try a different method.' };
  }
}

/** Get linked bank accounts for bank transfer */
export async function getBankAccounts(): Promise<
  Array<{ id: string; bankName: string; accountNumber: string; accountName: string }>
> {
  if (!API_BASE_URL) return [];
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/api/v1/mobile/bank-accounts`, {
      headers: { 'Content-Type': 'application/json', ...authHeader },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        accounts?: Array<{
          id: string;
          bankName: string;
          accountNumber: string;
          accountName: string;
        }>;
      };
      return data.accounts ?? [];
    }
  } catch (e) {
    console.error('getBankAccounts error:', e);
  }
  return [];
}
