/**
 * Auth service – Buffr G2P.
 * Verify OTP (calls API when configured); generate or resolve Buffr ID for card display.
 * Production: set API_BASE_URL and use verifyOtp / getBuffrId from backend.
 */
import * as Crypto from 'expo-crypto';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

/**
 * Verify OTP with backend. When API_BASE_URL is set, calls POST /api/v1/mobile/auth/verify-otp.
 * Otherwise returns success and a generated Buffr ID for the given phone (stable per phone).
 */
export async function verifyOtp(phone: string, code: string): Promise<{ success: boolean; buffrId?: string; cardNumberMasked?: string; expiryDate?: string | null }> {
  const normalizedPhone = phone.replace(/\D/g, '').slice(-8);

  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone, code }),
      });
      const data = (await res.json()) as { buffrId?: string; cardNumberMasked?: string; expiryDate?: string | null };
      if (res.ok) return { success: true, ...data };
      return { success: false };
    } catch (e) {
      console.error('verifyOtp API error:', e);
      return { success: false };
    }
  }

  // No API: accept any 5-digit code and generate deterministic Buffr ID from phone
  if (code.length < 4) return { success: false };
  const { buffrId, cardNumberMasked } = await generateBuffrIdFromPhone(phone);
  return { success: true, buffrId, cardNumberMasked, expiryDate: null };
}

/**
 * Generate a stable Buffr ID and masked card number from phone (for display when backend is not used).
 * Production backend should return these; this is used only when API is not configured.
 */
export async function generateBuffrIdFromPhone(phone: string): Promise<{ buffrId: string; cardNumberMasked: string }> {
  const digits = phone.replace(/\D/g, '');
  const seed = digits.slice(-8) || '00000000';
  let suffix: string;
  try {
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, seed + 'buffr-g2p');
    suffix = hash.slice(0, 8).replace(/\D/g, '0').padStart(8, '0').slice(-8);
  } catch {
    const fallback = Math.abs(Array.from(seed).reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0)).toString(16).slice(-8).padStart(8, '0');
    suffix = fallback;
  }
  const buffrId = `BFR${seed}${suffix}`.slice(0, 16);
  const last4 = (seed + suffix).slice(-4);
  const cardNumberMasked = `XXXX XXXX XXXX ${last4}`;
  return { buffrId, cardNumberMasked };
}

/**
 * Resolve Buffr ID and card display. Call after verify-otp or on complete screen if not yet set.
 * When API exists, call GET /api/v1/mobile/user/card and return; else use generateBuffrIdFromPhone.
 */
export async function getOrCreateBuffrId(phone: string): Promise<{ buffrId: string; cardNumberMasked: string; expiryDate: string | null }> {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/user/card`, {
        headers: { Authorization: `Bearer ${await getStoredToken()}` },
      });
      if (res.ok) {
        const d = (await res.json()) as { buffrId: string; cardNumberMasked: string; expiryDate?: string | null };
        return { buffrId: d.buffrId, cardNumberMasked: d.cardNumberMasked, expiryDate: d.expiryDate ?? null };
      }
    } catch (e) {
      console.error('getOrCreateBuffrId API error:', e);
    }
  }
  const { buffrId, cardNumberMasked } = await generateBuffrIdFromPhone(phone);
  return { buffrId, cardNumberMasked, expiryDate: null };
}

async function getStoredToken(): Promise<string> {
  try {
    const { getSecureItem } = await import('@/services/secureStorage');
    return (await getSecureItem('buffr_access_token')) ?? '';
  } catch {
    return '';
  }
}
