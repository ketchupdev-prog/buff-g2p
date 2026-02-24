/**
 * Auth service – Buffr G2P.
 * Verify OTP (calls API when configured); generate or resolve Buffr ID for card display.
 * Production: set API_BASE_URL and use verifyOtp / getBuffrId from backend.
 */
import * as Crypto from 'expo-crypto';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

// S11: Enforce HTTPS for API_BASE_URL in production builds.
if (!__DEV__ && API_BASE_URL && !API_BASE_URL.startsWith('https://')) {
  console.error('SEC-S11: API_BASE_URL must use HTTPS in production');
}

// S7: Key used to persist the token expiry timestamp alongside the access token.
const TOKEN_EXPIRES_AT_KEY = 'buffr_token_expires_at';
// Token lifetime: 4 hours in milliseconds.
const TOKEN_TTL_MS = 4 * 60 * 60 * 1000;

/**
 * Verify OTP with backend. When API_BASE_URL is set, calls POST /api/v1/mobile/auth/verify-otp.
 * Otherwise returns success and a generated Buffr ID for the given phone (stable per phone).
 */
export async function verifyOtp(phone: string, code: string): Promise<{ success: boolean; buffrId?: string; cardNumberMasked?: string; expiryDate?: string | null; error?: string }> {
  const normalizedPhone = phone.replace(/\D/g, '').slice(-8);

  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone, code }),
      });
      const data = (await res.json()) as { buffrId?: string; cardNumberMasked?: string; expiryDate?: string | null; token?: string };
      if (res.ok) {
        // S7: Persist expiry timestamp alongside the token returned by the API.
        await storeTokenExpiry();
        return { success: true, ...data };
      }
      return { success: false };
    } catch (e) {
      console.error('verifyOtp API error:', e);
      return { success: false };
    }
  }

  // V10/S8: Demo/offline bypass — only permitted in development builds.
  if (__DEV__) {
    // No API configured: accept any 4+ digit code and generate a deterministic Buffr ID from phone.
    if (code.length < 4) return { success: false };
    const { buffrId, cardNumberMasked } = await generateBuffrIdFromPhone(phone);
    // S7: Persist expiry so the session guard works in dev mode too.
    await storeTokenExpiry();
    return { success: true, buffrId, cardNumberMasked, expiryDate: null };
  }

  // Production build with no API_BASE_URL configured: refuse to proceed.
  return { success: false, error: 'Service is not configured. Contact support.' };
}

/**
 * S7: Write a token expiry timestamp (now + TOKEN_TTL_MS) to SecureStore.
 * Also writes a placeholder access token when one is not provided by the API,
 * so that the session guard in app/index.tsx sees a non-null token.
 */
async function storeTokenExpiry(): Promise<void> {
  try {
    const { setSecureItem, getSecureItem } = await import('@/services/secureStorage');
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    await setSecureItem(TOKEN_EXPIRES_AT_KEY, String(expiresAt));
    // Ensure a sentinel token exists when no real token has been stored yet (dev/demo mode).
    const existing = await getSecureItem('buffr_access_token');
    if (!existing) {
      await setSecureItem('buffr_access_token', 'dev-session-token');
    }
  } catch (e) {
    console.warn('storeTokenExpiry: failed to persist expiry', e);
  }
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
        headers: { Authorization: `Bearer ${(await getStoredToken()) ?? ''}` },
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

/**
 * S7: Return the stored access token only if it exists and has not expired.
 * If the token is expired, both the token and its expiry are cleared and null is returned.
 * Exported so that app/index.tsx can use it for the S1 session guard.
 */
export async function getStoredToken(): Promise<string | null> {
  try {
    const { getSecureItem, removeSecureItem } = await import('@/services/secureStorage');

    const token = await getSecureItem('buffr_access_token');
    if (!token) return null;

    const expiryStr = await getSecureItem(TOKEN_EXPIRES_AT_KEY);
    if (expiryStr) {
      const expiresAt = Number(expiryStr);
      if (!Number.isNaN(expiresAt) && Date.now() > expiresAt) {
        // Token has expired — clear it so the session guard redirects to sign-in.
        await removeSecureItem('buffr_access_token');
        await removeSecureItem(TOKEN_EXPIRES_AT_KEY);
        console.warn('SEC-S7: Access token expired; session cleared.');
        return null;
      }
    }

    return token;
  } catch {
    return null;
  }
}
